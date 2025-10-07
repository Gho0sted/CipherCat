// Модуль для управления этапами шифрования
class EncryptionStepManager {
  constructor(options = {}) {
    this.encryptionSteps = [];
    this.stepHistory = [];
    this.nextStepId = 1;
    
    // Конфигурация для оптимизации
    this.config = {
      maxHistoryEntries: options.maxHistoryEntries || 1000, // Лимит записей истории
      enableHistoryLimit: options.enableHistoryLimit !== false, // Включить лимит
      algorithmManager: options.algorithmManager || null, // Ссылка на AlgorithmManager
      maxSteps: options.maxSteps || 5, // Максимальное количество этапов
      enableAsyncGeneration: options.enableAsyncGeneration !== false, // Асинхронная генерация ключей
      stopOnFirstError: options.stopOnFirstError || false // Остановка на первой ошибке
    };
    
    // Кэш для быстрого поиска по ID
    this.stepCache = new Map();
  }

  // Добавить этап шифрования с расширенной валидацией
  addStep(algorithm = 'caesar', key = '') {
    // Расширенная валидация через AlgorithmManager
    if (this.config.algorithmManager) {
      const algorithmManager = this.config.algorithmManager;
      
      // Проверка валидности алгоритма
      if (!algorithmManager.isValidAlgorithm(algorithm)) {
        throw new Error(`Неизвестный алгоритм: ${algorithm}`);
      }

      // Проверка совместимости для multi-режима
      const multiValidation = algorithmManager.validateAlgorithmForMultiStep(algorithm);
      if (!multiValidation.isValid) {
        throw new Error(multiValidation.reason);
      }

      // Проверка поддержки пустых ключей
      const keyStr = String(key || '').trim();
      if (!keyStr && algorithmManager.requiresKey(algorithm) && !algorithmManager.supportsEmptyKey(algorithm)) {
        throw new Error(`Алгоритм "${algorithm}" требует ключ`);
      }

      // Валидация ограничений ключа
      const constraints = algorithmManager.getKeyConstraints(algorithm);
      if (constraints.type === 'number' && keyStr) {
        const numKey = parseInt(keyStr, 10);
        if (isNaN(numKey)) {
          throw new Error(`Алгоритм "${algorithm}" требует числовой ключ`);
        }
        if (constraints.min !== null && numKey < constraints.min) {
          throw new Error(`Ключ должен быть не менее ${constraints.min}`);
        }
        if (constraints.max !== null && numKey > constraints.max) {
          throw new Error(`Ключ должен быть не более ${constraints.max}`);
        }
      }
    }

    const step = {
      id: `step-${this.nextStepId++}`,
      algorithm,
      key,
      timestamp: new Date().toISOString()
    };

    this.encryptionSteps.push(step);
    this.stepCache.set(step.id, step); // Обновляем кэш
    this.emitStepAdded(step);
    
    return step;
  }

  // Удалить этап
  removeStep(stepId) {
    const index = this.encryptionSteps.findIndex(step => step.id === stepId);
    if (index !== -1) {
      const removedStep = this.encryptionSteps.splice(index, 1)[0];
      this.stepCache.delete(stepId); // Удаляем из кэша
      this.emitStepRemoved(removedStep);
      return removedStep;
    }
    return null;
  }

  // Обновить этап
  updateStep(stepId, updates) {
    const step = this.encryptionSteps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, updates);
      step.timestamp = new Date().toISOString();
      this.emitStepUpdated(step);
      return step;
    }
    return null;
  }

  // Получить все этапы
  getSteps() {
    return [...this.encryptionSteps];
  }

  // Получить этап по ID (оптимизированно через кэш)
  getStep(stepId) {
    return this.stepCache.get(stepId) || this.encryptionSteps.find(step => step.id === stepId);
  }

  // Очистить все этапы
  clearSteps() {
    const clearedSteps = [...this.encryptionSteps];
    this.encryptionSteps = [];
    this.stepCache.clear(); // Очищаем кэш
    this.emitStepsCleared(clearedSteps);
    return clearedSteps;
  }

  // Валидировать все этапы
  validateSteps() {
    const errors = [];
    
    this.encryptionSteps.forEach((step, index) => {
      if (step.algorithm !== 'base64' && !String(step.key || '').trim()) {
        errors.push({
          stepIndex: index,
          stepId: step.id,
          message: `Введите ключ для этапа ${step.algorithm}`
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Получить этапы для обработки
  getStepsForProcessing() {
    return this.encryptionSteps.map(step => ({
      algorithm: step.algorithm,
      key: step.key
    }));
  }

  // Добавить запись в историю с лимитом
  addToHistory(logEntry) {
    const historyEntry = {
      ...logEntry,
      timestamp: new Date().toISOString()
    };
    
    this.stepHistory.push(historyEntry);
    
    // Применяем лимит истории если включен
    if (this.config.enableHistoryLimit && this.stepHistory.length > this.config.maxHistoryEntries) {
      const removedEntries = this.stepHistory.splice(0, this.stepHistory.length - this.config.maxHistoryEntries);
      this.emitHistoryTrimmed(removedEntries);
    }
    
    this.emitHistoryUpdated();
  }

  // Получить историю
  getHistory() {
    return [...this.stepHistory];
  }

  // Очистить историю
  clearHistory() {
    this.stepHistory = [];
    this.emitHistoryCleared();
  }

  // Фильтровать историю
  filterHistory(filters = {}) {
    let filtered = [...this.stepHistory];

    if (filters.algorithm) {
      filtered = filtered.filter(entry => entry.algorithm === filters.algorithm);
    }

    if (filters.operation) {
      filtered = filtered.filter(entry => entry.operation === filters.operation);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => new Date(entry.timestamp) <= new Date(filters.dateTo));
    }

    return filtered;
  }

  // Поиск в истории с безопасными проверками
  searchHistory(query) {
    if (!query || !query.trim()) {
      return this.stepHistory;
    }

    const searchTerm = query.toLowerCase();
    return this.stepHistory.filter(entry => {
      // Безопасные проверки на null/undefined
      const algorithm = entry.algorithm || '';
      const operation = entry.operation || '';
      const key = entry.key || '';
      
      return algorithm.toLowerCase().includes(searchTerm) ||
             operation.toLowerCase().includes(searchTerm) ||
             key.toLowerCase().includes(searchTerm);
    });
  }

  // Получить статистику
  getStatistics() {
    const totalSteps = this.encryptionSteps.length;
    const algorithmCounts = {};
    const totalHistoryEntries = this.stepHistory.length;

    this.encryptionSteps.forEach(step => {
      algorithmCounts[step.algorithm] = (algorithmCounts[step.algorithm] || 0) + 1;
    });

    // Определяем наиболее используемый алгоритм
    const algorithmKeys = Object.keys(algorithmCounts);
    const mostUsedAlgorithm = algorithmKeys.length > 0 
      ? algorithmKeys.reduce((a, b) => algorithmCounts[a] > algorithmCounts[b] ? a : b)
      : null;

    return {
      totalSteps,
      algorithmCounts,
      totalHistoryEntries,
      mostUsedAlgorithm,
      hasSteps: totalSteps > 0,
      hasHistory: totalHistoryEntries > 0
    };
  }

  // События
  emitStepAdded(step) {
    const event = new CustomEvent('stepAdded', { detail: { step } });
    document.dispatchEvent(event);
  }

  emitStepRemoved(step) {
    const event = new CustomEvent('stepRemoved', { detail: { step } });
    document.dispatchEvent(event);
  }

  emitStepUpdated(step) {
    const event = new CustomEvent('stepUpdated', { detail: { step } });
    document.dispatchEvent(event);
  }

  emitStepsCleared(steps) {
    const event = new CustomEvent('stepsCleared', { detail: { steps } });
    document.dispatchEvent(event);
  }

  emitHistoryUpdated() {
    const event = new CustomEvent('historyUpdated', { detail: { history: this.stepHistory } });
    document.dispatchEvent(event);
  }

  emitHistoryCleared() {
    const event = new CustomEvent('historyCleared', { detail: { history: this.stepHistory } });
    document.dispatchEvent(event);
  }

  emitHistoryTrimmed(removedEntries) {
    const event = new CustomEvent('historyTrimmed', { detail: { removedEntries } });
    document.dispatchEvent(event);
  }

  // Импорт/экспорт
  exportSteps() {
    return {
      steps: this.encryptionSteps,
      history: this.stepHistory,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }

  importSteps(data) {
    if (data.steps && Array.isArray(data.steps)) {
      this.encryptionSteps = data.steps;
    }
    if (data.history && Array.isArray(data.history)) {
      this.stepHistory = data.history;
    }
    this.emitStepsImported(data);
  }

  emitStepsImported(data) {
    const event = new CustomEvent('stepsImported', { detail: { data } });
    document.dispatchEvent(event);
  }

  // Управление конфигурацией
  setAlgorithmManager(algorithmManager) {
    this.config.algorithmManager = algorithmManager;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig() {
    return { ...this.config };
  }

  // Валидация всех этапов с объединенной логикой (оптимизированно)
  validateAllSteps() {
    if (!this.config.algorithmManager) {
      return {
        isValid: false,
        errors: [{ message: 'AlgorithmManager не настроен' }],
        warnings: [],
        recommendations: []
      };
    }

    const algorithmManager = this.config.algorithmManager;
    
    // Используем встроенную валидацию последовательности для избежания дублирования
    const sequenceValidation = algorithmManager.validateMultiStepSequence(this.encryptionSteps);
    
    // Дополнительная валидация ключей
    const keyValidation = this._validateStepKeys(algorithmManager);
    
    return {
      isValid: sequenceValidation.isValid && keyValidation.isValid,
      errors: [...sequenceValidation.errors, ...keyValidation.errors],
      warnings: [...sequenceValidation.warnings, ...keyValidation.warnings],
      recommendations: [...sequenceValidation.recommendations, ...keyValidation.recommendations]
    };
  }

  // Приватный метод для валидации ключей этапов
  _validateStepKeys(algorithmManager) {
    const errors = [];
    const warnings = [];
    const recommendations = [];

    this.encryptionSteps.forEach((step, index) => {
      const keyStr = String(step.key || '').trim();
      
      // Проверка обязательности ключа
      if (!keyStr && algorithmManager.requiresKey(step.algorithm) && !algorithmManager.supportsEmptyKey(step.algorithm)) {
        errors.push({
          stepIndex: index,
          stepId: step.id,
          message: `Алгоритм "${step.algorithm}" требует ключ`
        });
      }

      // Валидация ограничений ключа
      if (keyStr) {
        const constraints = algorithmManager.getKeyConstraints(step.algorithm);
        if (constraints.type === 'number') {
          const numKey = parseInt(keyStr, 10);
          if (isNaN(numKey)) {
            errors.push({
              stepIndex: index,
              stepId: step.id,
              message: `Алгоритм "${step.algorithm}" требует числовой ключ`
            });
          } else {
            if (constraints.min !== null && numKey < constraints.min) {
              errors.push({
                stepIndex: index,
                stepId: step.id,
                message: `Ключ должен быть не менее ${constraints.min}`
              });
            }
            if (constraints.max !== null && numKey > constraints.max) {
              errors.push({
                stepIndex: index,
                stepId: step.id,
                message: `Ключ должен быть не более ${constraints.max}`
              });
            }
          }
        }
      }

      // Рекомендации по автогенерации
      if (algorithmManager.canAutoGenerateKey(step.algorithm) && !keyStr) {
        recommendations.push({
          stepIndex: index,
          stepId: step.id,
          message: `Можно сгенерировать ключ для алгоритма "${step.algorithm}"`
        });
      }
    });

    return { isValid: errors.length === 0, errors, warnings, recommendations };
  }

  // Получить информацию о производительности
  getPerformanceInfo() {
    return {
      totalSteps: this.encryptionSteps.length,
      totalHistoryEntries: this.stepHistory.length,
      cacheSize: this.stepCache.size,
      historyLimit: this.config.maxHistoryEntries,
      historyLimitEnabled: this.config.enableHistoryLimit,
      memoryUsage: {
        steps: this.encryptionSteps.length * 200, // Примерная оценка в байтах
        history: this.stepHistory.length * 150,
        cache: this.stepCache.size * 100
      }
    };
  }

  // Очистка старых записей истории
  cleanupOldHistory(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const initialLength = this.stepHistory.length;
    this.stepHistory = this.stepHistory.filter(entry => 
      new Date(entry.timestamp) >= cutoffDate
    );
    
    const removedCount = initialLength - this.stepHistory.length;
    if (removedCount > 0) {
      this.emitHistoryCleaned(removedCount);
    }
    
    return removedCount;
  }

  // Синхронизация истории с текущими шагами
  syncHistoryWithSteps() {
    const currentStepIds = new Set(this.encryptionSteps.map(step => step.id));
    const initialLength = this.stepHistory.length;
    
    // Удаляем записи истории для несуществующих шагов
    this.stepHistory = this.stepHistory.filter(entry => {
      // Если у записи есть stepId, проверяем его существование
      if (entry.stepId) {
        return currentStepIds.has(entry.stepId);
      }
      // Записи без stepId оставляем (общие операции)
      return true;
    });
    
    const removedCount = initialLength - this.stepHistory.length;
    if (removedCount > 0) {
      this.emitHistoryCleaned(removedCount, 'sync');
    }
    
    return removedCount;
  }

  emitHistoryCleaned(removedCount, type = 'time') {
    const event = new CustomEvent('historyCleaned', { 
      detail: { removedCount, type } 
    });
    document.dispatchEvent(event);
  }

  // Создать multi-этапную последовательность с валидацией (улучшенная)
  createMultiStepSequence(algorithms, keys = []) {
    if (!this.config.algorithmManager) {
      throw new Error('AlgorithmManager не настроен');
    }

    const algorithmManager = this.config.algorithmManager;
    const sequence = algorithmManager.getOptimalMultiStepSequence(algorithms);
    
    if (sequence.invalid.length > 0) {
      throw new Error(`Неподдерживаемые алгоритмы: ${sequence.invalid.join(', ')}`);
    }

    // Очищаем существующие этапы
    this.clearSteps();

    // Создаем новые этапы
    const createdSteps = [];
    const errors = [];
    
    for (let index = 0; index < sequence.sequence.length; index++) {
      const algorithm = sequence.sequence[index];
      const key = keys[index] || '';
      
      try {
        const step = this.addStep(algorithm, key);
        createdSteps.push(step);
      } catch (error) {
        const errorInfo = {
          stepIndex: index,
          algorithm,
          message: error.message
        };
        errors.push(errorInfo);
        
        if (this.config.stopOnFirstError) {
          // Останавливаемся на первой ошибке
          throw new Error(`Ошибка на этапе ${index + 1} (${algorithm}): ${error.message}`);
        } else {
          // Продолжаем, но логируем ошибку
          console.warn(`Не удалось создать этап для алгоритма ${algorithm}:`, error.message);
        }
      }
    }

    this.emitMultiStepSequenceCreated(createdSteps, sequence, errors);
    return { steps: createdSteps, errors, sequence };
  }

  // Создать предустановленную последовательность
  createPresetSequence(presetName) {
    if (!this.config.algorithmManager) {
      throw new Error('AlgorithmManager не настроен');
    }

    const algorithmManager = this.config.algorithmManager;
    const preset = algorithmManager.createPresetMultiStepSequence(presetName);
    
    return this.createMultiStepSequence(preset.sequence);
  }

  // Получить совместимые алгоритмы для добавления
  getCompatibleAlgorithms() {
    if (!this.config.algorithmManager) {
      return [];
    }

    return this.config.algorithmManager.getMultiStepCompatibleAlgorithms();
  }

  // Получить рекомендации для текущей последовательности
  getSequenceRecommendations() {
    if (!this.config.algorithmManager || this.encryptionSteps.length === 0) {
      return { recommendations: [], warnings: [] };
    }

    const algorithmManager = this.config.algorithmManager;
    const validation = algorithmManager.validateMultiStepSequence(this.encryptionSteps);
    
    return {
      recommendations: validation.recommendations,
      warnings: validation.warnings,
      canAddMore: this.encryptionSteps.length < this.config.maxSteps, // Настраиваемое ограничение
      suggestedAlgorithms: algorithmManager.getMultiStepRecommendations().recommended
    };
  }

  // Автогенерация ключей для этапов без ключей (с поддержкой async)
  async autoGenerateMissingKeys() {
    if (!this.config.algorithmManager) {
      return { generated: 0, errors: [] };
    }

    const algorithmManager = this.config.algorithmManager;
    const results = { generated: 0, errors: [], generatedKeys: [] };

    // Собираем этапы для генерации
    const stepsToGenerate = this.encryptionSteps
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => {
        const keyStr = String(step.key || '').trim();
        return !keyStr && algorithmManager.canAutoGenerateKey(step.algorithm);
      });

    if (this.config.enableAsyncGeneration && stepsToGenerate.length > 3) {
      // Асинхронная генерация для большого количества этапов
      const promises = stepsToGenerate.map(async ({ step, index }) => {
        try {
          const generatedKey = await this._generateKeyForAlgorithmAsync(step.algorithm);
          this.updateStep(step.id, { key: generatedKey });
          return {
            stepIndex: index,
            stepId: step.id,
            algorithm: step.algorithm,
            key: generatedKey
          };
        } catch (error) {
          return {
            stepIndex: index,
            stepId: step.id,
            message: error.message
          };
        }
      });

      const generatedResults = await Promise.all(promises);
      
      generatedResults.forEach(result => {
        if (result.key) {
          results.generated++;
          results.generatedKeys.push(result);
        } else {
          results.errors.push(result);
        }
      });
    } else {
      // Синхронная генерация для небольшого количества этапов
      stepsToGenerate.forEach(({ step, index }) => {
        try {
          const generatedKey = this._generateKeyForAlgorithm(step.algorithm);
          this.updateStep(step.id, { key: generatedKey });
          results.generated++;
          results.generatedKeys.push({
            stepIndex: index,
            stepId: step.id,
            algorithm: step.algorithm,
            key: generatedKey
          });
        } catch (error) {
          results.errors.push({
            stepIndex: index,
            stepId: step.id,
            message: error.message
          });
        }
      });
    }

    if (results.generated > 0) {
      this.emitKeysAutoGenerated(results);
    }

    return results;
  }

  // Приватный метод для генерации ключей (улучшенный)
  _generateKeyForAlgorithm(algorithm) {
    const algorithmManager = this.config.algorithmManager;
    const constraints = algorithmManager.getKeyConstraints(algorithm);
    
    switch (algorithm) {
    case 'caesar': {
      // Генерируем случайное число в допустимом диапазоне
      const min = constraints.min || 1;
      const max = constraints.max || 33;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
      
    case 'vigenere': {
      // Улучшенный генератор ключевых слов
      const wordSets = {
        security: ['secret', 'password', 'secure', 'safe', 'hidden', 'private', 'confidential'],
        nature: ['forest', 'ocean', 'mountain', 'river', 'valley', 'desert', 'island'],
        technology: ['cipher', 'code', 'algorithm', 'encrypt', 'decrypt', 'crypto', 'digital'],
        mythology: ['phoenix', 'dragon', 'unicorn', 'griffin', 'pegasus', 'sphinx', 'centaur'],
        colors: ['crimson', 'azure', 'emerald', 'golden', 'silver', 'purple', 'orange']
      };
      
      const categories = Object.keys(wordSets);
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const words = wordSets[randomCategory];
      return words[Math.floor(Math.random() * words.length)];
    }
      
    case 'aes': {
      // Генерируем случайный пароль с улучшенной энтропией
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let password = '';
      const length = 12 + Math.floor(Math.random() * 8); // 12-19 символов
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    }
      
    case 'base64':
      // Base64 не требует ключа
      return '';
      
    default:
      // Fallback для неизвестных алгоритмов
      return 'generated_key';
    }
  }

  // Асинхронная версия генерации ключей
  async _generateKeyForAlgorithmAsync(algorithm) {
    // Имитируем асинхронную операцию для криптографически стойкой генерации
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this._generateKeyForAlgorithm(algorithm));
      }, Math.random() * 10); // Небольшая задержка для имитации async операции
    });
  }

  // События для новых методов
  emitMultiStepSequenceCreated(steps, sequence, errors = []) {
    const event = new CustomEvent('multiStepSequenceCreated', { 
      detail: { steps, sequence, errors } 
    });
    document.dispatchEvent(event);
  }

  emitKeysAutoGenerated(results) {
    const event = new CustomEvent('keysAutoGenerated', { 
      detail: { results } 
    });
    document.dispatchEvent(event);
  }

  // Переупорядочивание шагов
  reorderSteps(fromIndex, toIndex) {
    if (fromIndex < 0 || toIndex < 0 || 
        fromIndex >= this.encryptionSteps.length || toIndex >= this.encryptionSteps.length) {
      return false;
    }

    // Перемещаем элемент в массиве
    const [movedStep] = this.encryptionSteps.splice(fromIndex, 1);
    this.encryptionSteps.splice(toIndex, 0, movedStep);

    // Обновляем кэш
    this.stepCache.clear();
    this.encryptionSteps.forEach(step => {
      this.stepCache.set(step.id, step);
    });

    // Эмитируем событие
    this.emitStepsReordered(fromIndex, toIndex);
    return true;
  }

  emitStepsReordered(fromIndex, toIndex) {
    const event = new CustomEvent('stepsReordered', { 
      detail: { fromIndex, toIndex, steps: this.encryptionSteps } 
    });
    document.dispatchEvent(event);
  }
}

export default EncryptionStepManager;
