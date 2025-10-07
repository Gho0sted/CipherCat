// Модуль для управления ключами шифрования
class KeyManager {
  constructor(options = {}) {
    this.currentKey = '';
    this.keyHistory = [];
    
    // Настраиваемые параметры
    this.config = {
      maxHistorySize: options.maxHistorySize || 10,
      enableSecureGeneration: options.enableSecureGeneration !== false, // Криптографически безопасная генерация
      enableValidationCache: options.enableValidationCache !== false // Кэширование валидации
    };
    
    // Кэш для валидации
    this.validationCache = new Map();
  }

  // Установить ключ
  setKey(key, algorithm) {
    if (this.validateKey(key, algorithm)) {
      this.addToHistory(this.currentKey);
      this.currentKey = key;
      return true;
    }
    return false;
  }

  // Получить текущий ключ
  getKey() {
    return this.currentKey;
  }

  // Очистить ключ
  clearKey() {
    this.addToHistory(this.currentKey);
    this.currentKey = '';
  }

  // Валидация ключа для конкретного алгоритма (с кэшированием)
  validateKey(key, algorithm) {
    // Преобразуем key в строку если это не строка
    const keyStr = String(key || '');
    
    // Проверяем кэш если включен
    if (this.config.enableValidationCache) {
      const cacheKey = `${algorithm}:${keyStr}`;
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey);
      }
    }
    
    const keyInfo = this.getKeyValidationInfo(algorithm);
    
    if (!keyInfo.requiresKey && keyStr.trim() === '') {
      return this._cacheValidationResult(algorithm, keyStr, true);
    }

    if (keyInfo.requiresKey && keyStr.trim() === '') {
      return this._cacheValidationResult(algorithm, keyStr, false);
    }

    let isValid = false;
    switch (algorithm) {
    case 'caesar': {
      const shift = parseInt(keyStr, 10);
      isValid = !isNaN(shift) && shift >= 1 && shift <= 33;
      break;
    }
      
    case 'vigenere':
      isValid = keyStr.length > 0 && /^[a-zA-Zа-яА-Я]+$/.test(keyStr);
      break;
      
    case 'aes':
      isValid = keyStr.length >= 8; // Минимум 8 символов для AES
      break;
      
    case 'base64':
      isValid = true; // Base64 не требует ключа
      break;
      
    case 'reverseCaesar': {
      const shift = parseInt(keyStr, 10);
      isValid = !isNaN(shift) && shift >= 1 && shift <= 33;
      break;
    }
      
    case 'atbash':
      isValid = true; // Атбаш не требует ключа
      break;
      
    default:
      isValid = keyStr.length > 0;
    }
    
    return this._cacheValidationResult(algorithm, keyStr, isValid);
  }

  // Кэширование результата валидации
  _cacheValidationResult(algorithm, key, result) {
    if (this.config.enableValidationCache) {
      const cacheKey = `${algorithm}:${key}`;
      this.validationCache.set(cacheKey, result);
    }
    return result;
  }

  // Получить информацию для валидации ключа
  getKeyValidationInfo(algorithm) {
    const validationRules = {
      caesar: {
        requiresKey: true,
        type: 'number',
        min: 1,
        max: 33,
        pattern: /^\d+$/,
        message: 'Ключ должен быть числом от 1 до 33'
      },
      vigenere: {
        requiresKey: true,
        type: 'text',
        minLength: 1,
        pattern: /^[a-zA-Zа-яА-Я]+$/,
        message: 'Ключ должен содержать только буквы'
      },
      aes: {
        requiresKey: true,
        type: 'text',
        minLength: 8,
        message: 'Ключ должен содержать минимум 8 символов'
      },
      base64: {
        requiresKey: false,
        message: 'Base64 не требует ключа'
      },
      reverseCaesar: {
        requiresKey: true,
        type: 'number',
        min: 1,
        max: 33,
        pattern: /^\d+$/,
        message: 'Ключ должен быть числом от 1 до 33'
      },
      atbash: {
        requiresKey: false,
        message: 'Атбаш не требует ключа'
      }
    };

    return validationRules[algorithm] || validationRules.caesar;
  }

  // Генерация ключа для алгоритма
  generateKey(algorithm) {
    switch (algorithm) {
    case 'caesar':
      return Math.floor(Math.random() * 33) + 1;
      
    case 'vigenere':
      return this.generateRandomString(8, true);
      
    case 'aes':
      return this.generateRandomString(16, false);
      
    case 'base64':
      return '';
      
    case 'reverseCaesar':
      return Math.floor(Math.random() * 33) + 1;
      
    case 'atbash':
      return '';
      
    default:
      return this.generateRandomString(12, false);
    }
  }

  // Генерация случайной строки (с криптографически безопасным генератором)
  generateRandomString(length, lettersOnly = false) {
    const chars = lettersOnly 
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    
    if (this.config.enableSecureGeneration && window.crypto && window.crypto.getRandomValues) {
      // Криптографически безопасная генерация
      const array = new Uint32Array(length);
      window.crypto.getRandomValues(array);
      
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
      return result;
    } else {
      // Fallback на Math.random для совместимости
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  }

  // Добавить ключ в историю (с настраиваемым лимитом)
  addToHistory(key) {
    // Проверяем, что ключ не пустой и отличается от текущего
    if (key && String(key).trim() !== '' && key !== this.currentKey) {
      this.keyHistory.unshift(key);
      if (this.keyHistory.length > this.config.maxHistorySize) {
        this.keyHistory.pop();
      }
    }
  }

  // Получить историю ключей
  getKeyHistory() {
    return [...this.keyHistory];
  }

  // Очистить историю ключей
  clearKeyHistory() {
    this.keyHistory = [];
  }

  // Получить предыдущий ключ из истории
  getPreviousKey() {
    return this.keyHistory[0] || '';
  }

  // Эмитировать событие изменения ключа
  emitKeyChange(newKey, algorithm) {
    const event = new CustomEvent('keyChanged', {
      detail: {
        key: newKey,
        algorithm,
        isValid: this.validateKey(newKey, algorithm)
      }
    });
    document.dispatchEvent(event);
  }

  // Получить сообщение об ошибке валидации (объединенная логика)
  getValidationErrorMessage(key, algorithm) {
    const keyStr = String(key || '');
    const keyInfo = this.getKeyValidationInfo(algorithm);
    
    if (!keyInfo.requiresKey) {
      return null;
    }

    if (keyStr.trim() === '') {
      return 'Ключ обязателен для данного алгоритма';
    }

    // Используем ту же логику валидации, что и в validateKey
    const isValid = this.validateKey(key, algorithm);
    if (isValid) {
      return null;
    }

    // Возвращаем сообщение об ошибке из конфигурации
    return keyInfo.message || 'Неверный формат ключа';
  }

  // Инвалидация кэша валидации
  invalidateValidationCache() {
    this.validationCache.clear();
  }
}

export default KeyManager;
