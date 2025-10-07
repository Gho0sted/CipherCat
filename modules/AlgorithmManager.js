// Модуль для управления алгоритмами шифрования
class AlgorithmManager {
  constructor(options = {}) {
    this.currentAlgorithm = 'caesar';
    this.previousAlgorithm = null;
    // Улучшенная структура кэша: algorithm -> key -> data
    this.algorithmCache = new Map();
    
    // Кэш для оптимизации повторных вычислений
    this.computationCache = new Map();
    this.cacheInvalidationTime = Date.now();
    
    // Настраиваемые параметры
    this.config = {
      computationCacheTTL: options.computationCacheTTL || 30000, // 30 секунд
      visualizationDebounceDelay: options.visualizationDebounceDelay || 100, // мс
      enableRecommendationCache: options.enableRecommendationCache !== false
    };
    
    // Дебаунс для VisualizationAPI
    this.visualizationDebounceTimer = null;
    this.pendingVisualizationEvents = new Map(); // Накапливаем события

    // Конфигурация алгоритмов - вынесена в поле класса для избежания лишних аллокаций
    this.algorithms = {
      caesar: {
        name: 'Шифр Цезаря',
        description: 'Простой шифр сдвига',
        keyType: 'number',
        keyPlaceholder: 'Введите число от 1 до 33...',
        keyMin: 1,
        keyMax: 33,
        requiresKey: true,
        autoGenerate: true
      },
      vigenere: {
        name: 'Шифр Виженера',
        description: 'Полиалфавитный шифр',
        keyType: 'text',
        keyPlaceholder: 'Введите ключевое слово...',
        requiresKey: true,
        autoGenerate: true
      },
      aes: {
        name: 'AES-256',
        description: 'Современный симметричный шифр',
        keyType: 'text',
        keyPlaceholder: 'Введите пароль...',
        requiresKey: true,
        autoGenerate: true
      },
      base64: {
        name: 'Base64',
        description: 'Кодирование в Base64',
        keyType: 'text',
        keyPlaceholder: 'Base64 не требует ключа',
        requiresKey: false,
        autoGenerate: false
      },
      reverseCaesar: {
        name: 'Обратный Цезарь',
        description: 'Шифр Цезаря с обратным сдвигом',
        keyType: 'number',
        keyPlaceholder: 'Введите число от 1 до 33...',
        keyMin: 1,
        keyMax: 33,
        requiresKey: true,
        autoGenerate: true
      },
      atbash: {
        name: 'Атбаш',
        description: 'Моноалфавитный шифр с обратным алфавитом',
        keyType: 'text',
        keyPlaceholder: 'Атбаш не требует ключа',
        requiresKey: false,
        autoGenerate: false
      },
      multi: {
        name: 'Многоэтапное шифрование',
        description: 'Комбинация нескольких алгоритмов',
        keyType: 'text',
        keyPlaceholder: 'Многоэтапный режим - ключи настраиваются для каждого этапа',
        requiresKey: false, // Позволяет пустые ключи для сложных цепочек
        autoGenerate: false,
        supportsEmptyKey: true // Специальный флаг для multi-режима
      }
    };
  }

  // Получить информацию об алгоритме
  getAlgorithmInfo(algorithm) {
    return this.algorithms[algorithm] || this.algorithms.caesar;
  }

  // Переключить алгоритм с оптимизацией
  switchAlgorithm(newAlgorithm, options = {}) {
    if (this.currentAlgorithm === newAlgorithm && !options.force) {
      return false; // Нет изменений
    }

    this.previousAlgorithm = this.currentAlgorithm;
    this.currentAlgorithm = newAlgorithm;

    // Проверяем кэш для нового алгоритма и загружаем подготовленные данные
    this.loadCachedDataForAlgorithm(newAlgorithm);

    // Эмитируем событие смены алгоритма
    this.emitAlgorithmChange(newAlgorithm, this.previousAlgorithm);

    return true;
  }

  // Эмитировать событие смены алгоритма
  emitAlgorithmChange(newAlgorithm, previousAlgorithm) {
    const algorithmInfo = this.getAlgorithmInfo(newAlgorithm);
    const event = new CustomEvent('algorithmChanged', {
      detail: {
        newAlgorithm,
        previousAlgorithm,
        algorithmInfo,
        previousAlgorithmInfo: this.getAlgorithmInfo(previousAlgorithm)
      }
    });
    document.dispatchEvent(event);

    // Уведомляем VisualizationAPI о смене алгоритма
    this.notifyVisualizationAPI('algorithmChanged', {
      newAlgorithm,
      previousAlgorithm,
      algorithmInfo
    });
  }

  // Подписка на изменения алгоритма
  onAlgorithmChange(callback) {
    document.addEventListener('algorithmChanged', callback);
  }

  // Отписка от изменений алгоритма
  offAlgorithmChange(callback) {
    document.removeEventListener('algorithmChanged', callback);
  }

  // Загрузка кэшированных данных для алгоритма
  loadCachedDataForAlgorithm(algorithm) {
    const algorithmCache = this.algorithmCache.get(algorithm);
    if (algorithmCache) {
      // Эмитируем событие загрузки кэшированных данных
      const event = new CustomEvent('algorithmCacheLoaded', {
        detail: {
          algorithm,
          cachedData: algorithmCache,
          algorithmInfo: this.getAlgorithmInfo(algorithm)
        }
      });
      document.dispatchEvent(event);

      // Уведомляем VisualizationAPI о загрузке кэша
      this.notifyVisualizationAPI('cacheLoaded', {
        algorithm,
        cachedData: algorithmCache
      });
    }
  }

  // Получить текущий алгоритм
  getCurrentAlgorithm() {
    return this.currentAlgorithm;
  }

  // Проверить, требует ли алгоритм ключ
  requiresKey(algorithm = this.currentAlgorithm) {
    return this.getAlgorithmInfo(algorithm).requiresKey;
  }

  // Проверить, поддерживает ли алгоритм автогенерацию ключа
  supportsAutoGenerate(algorithm = this.currentAlgorithm) {
    return this.getAlgorithmInfo(algorithm).autoGenerate;
  }

  // Получить список всех доступных алгоритмов
  getAllAlgorithms() {
    return Object.keys(this.algorithms).filter(key => key !== 'multi');
  }

  // Валидация алгоритма
  isValidAlgorithm(algorithm) {
    return Object.prototype.hasOwnProperty.call(this.algorithms, algorithm);
  }

  // Универсальный метод для проверки автогенерации ключа
  canAutoGenerateKey(algorithm = this.currentAlgorithm) {
    return this.getAlgorithmInfo(algorithm).autoGenerate;
  }

  // Проверка поддержки пустых ключей (для multi-режима)
  supportsEmptyKey(algorithm = this.currentAlgorithm) {
    const info = this.getAlgorithmInfo(algorithm);
    return info.supportsEmptyKey || !info.requiresKey;
  }

  // Проверка, является ли алгоритм multi-режимом
  isMultiStepAlgorithm(algorithm = this.currentAlgorithm) {
    return algorithm === 'multi';
  }

  // Получить алгоритмы, подходящие для multi-режима (с кэшированием)
  getMultiStepCompatibleAlgorithms() {
    const cacheKey = 'multiStepCompatibleAlgorithms';
    const cached = this.getCachedComputation(cacheKey, 'algorithms');
    if (cached) {
      return cached;
    }

    const result = this.getAllAlgorithms().filter(algorithm => {
      const info = this.getAlgorithmInfo(algorithm);
      return info.requiresKey || info.supportsEmptyKey;
    });
    
    this.setCachedComputation(cacheKey, result, 'algorithms');
    return result;
  }

  // Валидация алгоритма для multi-этапа
  validateAlgorithmForMultiStep(algorithm) {
    const compatibleAlgorithms = this.getMultiStepCompatibleAlgorithms();
    return {
      isValid: compatibleAlgorithms.includes(algorithm),
      compatibleAlgorithms,
      reason: compatibleAlgorithms.includes(algorithm) 
        ? null 
        : `Алгоритм "${algorithm}" не поддерживается в multi-режиме`
    };
  }

  // Получить рекомендации по алгоритмам для multi-режима
  getMultiStepRecommendations() {
    const compatible = this.getMultiStepCompatibleAlgorithms();
    const recommendations = {
      recommended: [],
      notRecommended: [],
      reasons: {}
    };

    compatible.forEach(algorithm => {
      const info = this.getAlgorithmInfo(algorithm);
      if (info.autoGenerate && info.requiresKey) {
        recommendations.recommended.push(algorithm);
      } else if (!info.requiresKey) {
        recommendations.notRecommended.push(algorithm);
        recommendations.reasons[algorithm] = 'Не требует ключа - может снизить безопасность';
      }
    });

    return recommendations;
  }

  // Получить placeholder для поля ключа
  getAlgorithmPlaceholder(algorithm = this.currentAlgorithm) {
    return this.getAlgorithmInfo(algorithm).keyPlaceholder;
  }

  // Получить тип ключа для алгоритма
  getKeyType(algorithm = this.currentAlgorithm) {
    return this.getAlgorithmInfo(algorithm).keyType;
  }

  // Получить ограничения ключа (min/max для числовых ключей)
  getKeyConstraints(algorithm = this.currentAlgorithm) {
    const info = this.getAlgorithmInfo(algorithm);
    return {
      min: info.keyMin || null,
      max: info.keyMax || null,
      type: info.keyType || 'text'
    };
  }

  // Кэширование данных для алгоритма (улучшенная структура)
  cacheAlgorithmData(algorithm, key, data) {
    if (!this.algorithmCache.has(algorithm)) {
      this.algorithmCache.set(algorithm, new Map());
    }
    this.algorithmCache.get(algorithm).set(key, data);
  }

  // Получение кэшированных данных
  getCachedAlgorithmData(algorithm, key) {
    const algorithmCache = this.algorithmCache.get(algorithm);
    return algorithmCache ? algorithmCache.get(key) : undefined;
  }

  // Получение всех кэшированных данных для алгоритма
  getAllCachedDataForAlgorithm(algorithm) {
    return this.algorithmCache.get(algorithm) || new Map();
  }

  // Получение сводки кэшированных данных (оптимизированно для больших объемов)
  getCachedDataSummary(algorithm, limit = 10) {
    const algorithmCache = this.algorithmCache.get(algorithm);
    if (!algorithmCache) {
      return { total: 0, keys: [], summary: 'Нет кэшированных данных' };
    }

    const keys = Array.from(algorithmCache.keys()).slice(0, limit);
    const total = algorithmCache.size;
    
    return {
      total,
      keys,
      hasMore: total > limit,
      summary: `Кэшировано ${total} записей${total > limit ? ` (показано ${limit})` : ''}`
    };
  }

  // Очистка кэша для конкретного алгоритма
  clearAlgorithmCache(algorithm) {
    this.algorithmCache.delete(algorithm);
  }

  // Очистка конкретного ключа в кэше алгоритма
  clearAlgorithmCacheKey(algorithm, key) {
    const algorithmCache = this.algorithmCache.get(algorithm);
    if (algorithmCache) {
      algorithmCache.delete(key);
      // Если кэш алгоритма пуст, удаляем его полностью
      if (algorithmCache.size === 0) {
        this.algorithmCache.delete(algorithm);
      }
    }
  }

  // Очистка всего кэша
  clearAllCache() {
    this.algorithmCache.clear();
  }

  // Получение статистики кэша
  getCacheStats() {
    const stats = {
      totalAlgorithms: this.algorithmCache.size,
      totalEntries: 0,
      algorithms: {}
    };

    for (const [algorithm, cache] of this.algorithmCache) {
      stats.algorithms[algorithm] = cache.size;
      stats.totalEntries += cache.size;
    }

    return stats;
  }

  // Уведомление VisualizationAPI о изменениях (с улучшенным дебаунсом)
  notifyVisualizationAPI(eventType, data) {
    // Накапливаем события
    this.pendingVisualizationEvents.set(eventType, data);
    
    // Очищаем предыдущий таймер
    if (this.visualizationDebounceTimer) {
      clearTimeout(this.visualizationDebounceTimer);
    }

    // Устанавливаем новый таймер
    this.visualizationDebounceTimer = setTimeout(() => {
      this._executePendingVisualizationEvents();
    }, this.config.visualizationDebounceDelay);
  }

  // Выполнение накопленных событий VisualizationAPI
  _executePendingVisualizationEvents() {
    if (typeof window !== 'undefined' && window.VisualizationAPI) {
      try {
        // Выполняем все накопленные события
        for (const [eventType, data] of this.pendingVisualizationEvents) {
          this._executeVisualizationAPI(eventType, data);
        }
        
        // Очищаем накопленные события
        this.pendingVisualizationEvents.clear();
      } catch (error) {
        console.error('Ошибка при выполнении накопленных событий VisualizationAPI:', error);
      }
    }
  }

  // Выполнение уведомления VisualizationAPI
  _executeVisualizationAPI(eventType, data) {
    if (typeof window !== 'undefined' && window.VisualizationAPI) {
      try {
        switch (eventType) {
        case 'algorithmChanged':
          // Проверяем, что метод существует перед вызовом
          if (typeof window.VisualizationAPI.updateAlgorithm === 'function') {
            window.VisualizationAPI.updateAlgorithm(data.newAlgorithm, data.algorithmInfo);
          } else {
            console.log('VisualizationAPI.updateAlgorithm не доступен');
          }
          break;
        case 'cacheLoaded':
          // Проверяем, что метод существует перед вызовом
          if (typeof window.VisualizationAPI.loadCachedData === 'function') {
            window.VisualizationAPI.loadCachedData(data.algorithm, data.cachedData);
          } else {
            console.log('VisualizationAPI.loadCachedData не доступен');
          }
          break;
        default:
          console.warn(`Неизвестный тип события для VisualizationAPI: ${eventType}`);
        }
      } catch (error) {
        console.error('Ошибка при уведомлении VisualizationAPI:', error);
      }
    }
  }

  // Кэширование вычислений (улучшенное)
  getCachedComputation(key, type = 'general') {
    const cacheKey = `${type}:${key}`;
    const cached = this.computationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.config.computationCacheTTL) {
      return cached.value;
    }
    return null;
  }

  setCachedComputation(key, value, type = 'general') {
    const cacheKey = `${type}:${key}`;
    this.computationCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      type
    });
  }

  // Инвалидация кэша вычислений
  invalidateComputationCache() {
    this.computationCache.clear();
    this.cacheInvalidationTime = Date.now();
  }

  // Интеграция с EncryptionStepManager (с кэшированием рекомендаций)
  validateMultiStepSequence(steps) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    if (!Array.isArray(steps)) {
      validation.isValid = false;
      validation.errors.push('Этапы должны быть массивом');
      return validation;
    }

    // Создаем ключ для кэширования на основе последовательности алгоритмов
    const sequenceKey = steps.map(step => step.algorithm).join(',');
    
    // Проверяем кэш рекомендаций если включен
    let recommendations;
    if (this.config.enableRecommendationCache) {
      const cachedRecommendations = this.getCachedComputation(`recommendations:${sequenceKey}`, 'validation');
      if (cachedRecommendations) {
        recommendations = cachedRecommendations;
      } else {
        recommendations = this.getMultiStepRecommendations();
        this.setCachedComputation(`recommendations:${sequenceKey}`, recommendations, 'validation');
      }
    } else {
      recommendations = this.getMultiStepRecommendations();
    }

    const compatibleAlgorithms = this.getMultiStepCompatibleAlgorithms();

    steps.forEach((step, index) => {
      // Проверка валидности алгоритма
      if (!compatibleAlgorithms.includes(step.algorithm)) {
        validation.isValid = false;
        validation.errors.push({
          stepIndex: index,
          algorithm: step.algorithm,
          message: `Алгоритм "${step.algorithm}" не поддерживается в multi-режиме`
        });
      }

      // Проверка рекомендаций
      if (recommendations.notRecommended.includes(step.algorithm)) {
        validation.warnings.push({
          stepIndex: index,
          algorithm: step.algorithm,
          message: recommendations.reasons[step.algorithm]
        });
      }

      // Рекомендации по улучшению
      if (recommendations.recommended.includes(step.algorithm)) {
        validation.recommendations.push({
          stepIndex: index,
          algorithm: step.algorithm,
          message: 'Рекомендуемый алгоритм для multi-режима'
        });
      }
    });

    return validation;
  }

  // Получить оптимальную последовательность для multi-режима
  getOptimalMultiStepSequence(desiredAlgorithms = []) {
    const compatible = this.getMultiStepCompatibleAlgorithms();
    const recommendations = this.getMultiStepRecommendations();
    
    // Фильтруем желаемые алгоритмы по совместимости
    const validAlgorithms = desiredAlgorithms.filter(alg => compatible.includes(alg));
    
    // Добавляем рекомендуемые алгоритмы если их нет в списке
    const recommended = recommendations.recommended.filter(alg => !validAlgorithms.includes(alg));
    
    return {
      sequence: [...validAlgorithms, ...recommended],
      invalid: desiredAlgorithms.filter(alg => !compatible.includes(alg)),
      added: recommended,
      totalSteps: validAlgorithms.length + recommended.length
    };
  }

  // Создать предустановленную последовательность multi-этапов (с мягкой обработкой ошибок)
  createPresetMultiStepSequence(presetName) {
    const presets = {
      'secure': ['aes', 'vigenere', 'caesar'],
      'classic': ['caesar', 'vigenere'],
      'modern': ['aes', 'base64'],
      'mixed': ['caesar', 'aes', 'vigenere', 'base64']
    };

    const algorithms = presets[presetName];
    if (!algorithms) {
      console.warn(`Неизвестный пресет: ${presetName}. Доступные: ${Object.keys(presets).join(', ')}`);
      // Fallback к классическому пресету
      return this.getOptimalMultiStepSequence(presets.classic);
    }

    try {
      return this.getOptimalMultiStepSequence(algorithms);
    } catch (error) {
      console.error(`Ошибка создания пресета ${presetName}:`, error);
      // Fallback к простому пресету
      return this.getOptimalMultiStepSequence(['caesar']);
    }
  }
}

export default AlgorithmManager;
