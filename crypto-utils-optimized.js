// Оптимизированные утилиты для различных алгоритмов шифрования
class CryptoUtils {
  // Алфавиты для разных языков
  static ALPHABETS = {
    russian: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
    russianLower: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
    english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    englishLower: 'abcdefghijklmnopqrstuvwxyz'
  };

  // Оптимизированное кэширование алфавитов по кодам символов
  static ALPHABET_MAP = new Map([
    // Русские заглавные буквы (А-Я, включая Ё)
    ...Array.from({length: 32}, (_, i) => [1040 + i, 'russian']),
    ...Array.from({length: 1}, () => [1025, 'russian']), // Ё
    // Русские строчные буквы (а-я, включая ё)
    ...Array.from({length: 32}, (_, i) => [1072 + i, 'russianLower']),
    ...Array.from({length: 1}, () => [1105, 'russianLower']), // ё
    // Английские заглавные буквы (A-Z)
    ...Array.from({length: 26}, (_, i) => [65 + i, 'english']),
    // Английские строчные буквы (a-z)
    ...Array.from({length: 26}, (_, i) => [97 + i, 'englishLower'])
  ]);

  // Кэш для часто используемых алфавитов
  static _alphabetCache = new Map();

  // Константы для AES
  static AES_CONFIG = {
    VERSION: 0x01,
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    TAG_LENGTH: 16,
    PBKDF2_ITERATIONS: 200000,
    KEY_LENGTH: 256,
    MIN_PASSWORD_LENGTH: 8,
    MAX_LOG_ENTRIES: 1000
  };

  // Централизованная обработка ошибок
  static handleError(message, error = null, context = {}) {
    const errorInfo = {
      message,
      error: error?.message || error,
      timestamp: new Date().toISOString(),
      context
    };

    console.error('CryptoUtils Error:', errorInfo);
        
    return {
      success: false,
      error: message,
      details: errorInfo
    };
  }

  // Безопасный модуль для корректной работы с отрицательными числами
  static safeMod(a, b) {
    return ((a % b) + b) % b;
  }

  // Оптимизированное получение алфавита для символа с кэшированием
  static getAlphabetForChar(char) {
    // Проверяем кэш
    if (this._alphabetCache.has(char)) {
      return this._alphabetCache.get(char);
    }

    const code = char.charCodeAt(0);
    const alphabetKey = this.ALPHABET_MAP.get(code);
        
    if (!alphabetKey) {
      this._alphabetCache.set(char, null);
      return null;
    }

    const alphabet = this.ALPHABETS[alphabetKey];
    this._alphabetCache.set(char, alphabet);
    return alphabet;
  }

  // Сдвиг символа в алфавите
  static shiftChar(char, shift, alphabet) {
    const index = alphabet.indexOf(char);
    if (index === -1) {return char;}
        
    const newIndex = this.safeMod(index + shift, alphabet.length);
    return alphabet[newIndex];
  }

  // Универсальный метод для шифрования/дешифрования
  static async processText(algorithm, text, key, isEncrypt = true) {
    if (!text) {return { success: true, result: '' };}

    try {
      let result;
      switch (algorithm) {
      case 'caesar':
        result = this.caesarShift(text, key, isEncrypt);
        break;
      case 'vigenere':
        result = isEncrypt ? this.vigenereEncrypt(text, key) : this.vigenereDecrypt(text, key);
        break;
      case 'base64':
        result = isEncrypt ? this.base64Encode(text) : this.base64Decode(text);
        break;
      case 'aes':
        result = await (isEncrypt ? this.aesEncrypt(text, key) : this.aesDecrypt(text, key));
        break;
      case 'reverseCaesar':
        result = this.reverseCaesarShift(text, key, isEncrypt);
        break;
      case 'atbash':
        result = this.atbashCipher(text);
        break;
      default:
        throw new Error(`Неподдерживаемый алгоритм: ${algorithm}`);
      }

      return { success: true, result };
    } catch (error) {
      // Для дешифрования, если это обычный текст, не показываем ошибку
      if (!isEncrypt && this.isLikelyPlainText(text, algorithm)) {
        return { success: false, result: text, isPlainText: true };
      }
      return this.handleError(`Ошибка ${isEncrypt ? 'шифрования' : 'дешифрования'} (${algorithm})`, error);
    }
  }

  // Универсальный метод шифра Цезаря
  static caesarShift(text, shift, isEncrypt = true) {
    if (!text || typeof shift !== 'number') {return '';}
        
    const actualShift = isEncrypt ? shift : -shift;
        
    return text.split('').map(char => {
      const alphabet = this.getAlphabetForChar(char);
      if (!alphabet) {return char;}
            
      return this.shiftChar(char, actualShift, alphabet);
    }).join('');
  }

  // Шифр Цезаря (для обратной совместимости)
  static caesarEncrypt(text, shift) {
    return this.caesarShift(text, shift, true);
  }

  static caesarDecrypt(text, shift) {
    return this.caesarShift(text, shift, false);
  }

  // Обратный шифр Цезаря - сдвиг в обратную сторону при шифровании
  static reverseCaesarShift(text, shift, isEncrypt) {
    if (!text) return '';
    
    const shiftNum = parseInt(shift, 10);
    if (isNaN(shiftNum) || shiftNum < 1 || shiftNum > 33) {
      throw new Error('Ключ должен быть числом от 1 до 33');
    }

    const russianAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const englishAlphabet = 'abcdefghijklmnopqrstuvwxyz';

    return text.split('').map(char => {
      const lowerChar = char.toLowerCase();
      let alphabet = null;

      if (russianAlphabet.includes(lowerChar)) {
        alphabet = russianAlphabet;
      } else if (englishAlphabet.includes(lowerChar)) {
        alphabet = englishAlphabet;
      } else {
        return char;
      }

      const index = alphabet.indexOf(lowerChar);
      let newIndex;
      
      if (isEncrypt) {
        // Для шифрования: сдвиг в обратную сторону
        newIndex = (index - shiftNum + alphabet.length) % alphabet.length;
      } else {
        // Для дешифрования: сдвиг в прямую сторону
        newIndex = (index + shiftNum) % alphabet.length;
      }

      const newChar = alphabet[newIndex];
      return char === char.toUpperCase() ? newChar.toUpperCase() : newChar;
    }).join('');
  }

  // Шифр Атбаш - моноалфавитный шифр с обратным алфавитом
  static atbashCipher(text) {
    if (!text) return '';
    
    const russianAlphabet = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
    const englishAlphabet = 'abcdefghijklmnopqrstuvwxyz';
    
    return text.split('').map(char => {
      const lowerChar = char.toLowerCase();
      
      // Обработка русских букв
      if (russianAlphabet.includes(lowerChar)) {
        const index = russianAlphabet.indexOf(lowerChar);
        const reversedChar = russianAlphabet[russianAlphabet.length - 1 - index];
        return char === char.toUpperCase() ? reversedChar.toUpperCase() : reversedChar;
      }
      
      // Обработка английских букв
      if (englishAlphabet.includes(lowerChar)) {
        const index = englishAlphabet.indexOf(lowerChar);
        const reversedChar = englishAlphabet[englishAlphabet.length - 1 - index];
        return char === char.toUpperCase() ? reversedChar.toUpperCase() : reversedChar;
      }
      
      // Возвращаем символ как есть, если это не буква
      return char;
    }).join('');
  }

  // Оптимизированный шифр Виженера с улучшенной поддержкой кириллицы
  static vigenereEncrypt(text, key) {
    if (!text || !key) {return '';}
        
    // Нормализуем ключ - оставляем только буквы
    const normalizedKey = key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '');
    if (!normalizedKey) {return text;}
        
    let keyIndex = 0;
        
    return text.split('').map(char => {
      const alphabet = this.getAlphabetForChar(char);
      if (!alphabet) {return char;}
            
      // Получаем символ ключа для текущей позиции
      const keyChar = normalizedKey[keyIndex % normalizedKey.length];
      const keyAlphabet = this.getAlphabetForChar(keyChar);
            
      if (!keyAlphabet) {return char;}
            
      // Находим сдвиг в алфавите ключа
      const shift = keyAlphabet.indexOf(keyChar);
      if (shift === -1) {return char;}
            
      // Сдвигаем символ в его алфавите
      const result = this.shiftChar(char, shift, alphabet);
            
      // Переходим к следующему символу ключа только для букв
      keyIndex++;
            
      return result;
    }).join('');
  }

  static vigenereDecrypt(text, key) {
    if (!text || !key) {return '';}
        
    // Нормализуем ключ - оставляем только буквы
    const normalizedKey = key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '');
    if (!normalizedKey) {return text;}
        
    let keyIndex = 0;
        
    return text.split('').map(char => {
      const alphabet = this.getAlphabetForChar(char);
      if (!alphabet) {return char;}
            
      // Получаем символ ключа для текущей позиции
      const keyChar = normalizedKey[keyIndex % normalizedKey.length];
      const keyAlphabet = this.getAlphabetForChar(keyChar);
            
      if (!keyAlphabet) {return char;}
            
      // Находим сдвиг в алфавите ключа
      const shift = keyAlphabet.indexOf(keyChar);
      if (shift === -1) {return char;}
            
      // Сдвигаем символ в обратную сторону в его алфавите
      const result = this.shiftChar(char, -shift, alphabet);
            
      // Переходим к следующему символу ключа только для букв
      keyIndex++;
            
      return result;
    }).join('');
  }

  // Base64 кодирование/декодирование с улучшенной обработкой ошибок
  static base64Encode(text) {
    try {
      if (typeof window !== 'undefined' && window.btoa) {
        // Браузер
        return btoa(unescape(encodeURIComponent(text)));
      } else {
        // Node.js
        const Buffer = require('buffer').Buffer;
        return Buffer.from(text, 'utf8').toString('base64');
      }
    } catch (error) {
      console.error('Ошибка Base64 кодирования:', error);
      throw new Error('Ошибка кодирования Base64');
    }
  }

  static base64Decode(text) {
    try {
      // Проверяем, является ли текст валидным Base64
      if (!this.isValidBase64(text)) {
        throw new Error('Текст не является валидным Base64');
      }

      if (typeof window !== 'undefined' && window.atob) {
        // Браузер
        return decodeURIComponent(escape(atob(text)));
      } else {
        // Node.js
        const Buffer = require('buffer').Buffer;
        return Buffer.from(text, 'base64').toString('utf8');
      }
    } catch (error) {
      console.error('Ошибка Base64 декодирования:', error);
      throw new Error('Ошибка декодирования Base64: ' + error.message);
    }
  }

  // Проверка валидности Base64
  static isValidBase64(str) {
    try {
      // Удаляем пробелы и переносы строк
      const cleanStr = str.replace(/\s/g, '');
      
      // Проверяем длину (должна быть кратна 4)
      if (cleanStr.length % 4 !== 0) {
        return false;
      }
      
      // Проверяем, что строка содержит только валидные Base64 символы
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanStr)) {
        return false;
      }
      
      // Пробуем декодировать
      if (typeof window !== 'undefined' && window.atob) {
        atob(cleanStr);
      } else {
        const Buffer = require('buffer').Buffer;
        Buffer.from(cleanStr, 'base64');
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Проверка, является ли текст обычным текстом (не зашифрованным)
  static isLikelyPlainText(text, algorithm) {
    if (!text || typeof text !== 'string') return false;
    
    switch (algorithm) {
      case 'base64':
        // Если текст не является валидным Base64, скорее всего это обычный текст
        return !this.isValidBase64(text);
      
      case 'aes':
        // Для AES проверяем очень строго:
        // 1. Если не Base64 или слишком короткий - точно обычный текст
        if (!this.isValidBase64(text) || text.length < 50) {
          return true;
        }
        
        // 2. Если содержит пробелы, знаки препинания или кириллицу - обычный текст
        const hasSpaces = text.includes(' ');
        const hasPunctuation = /[.,!?;:()\-]/.test(text);
        const hasCyrillic = /[а-яё]/i.test(text);
        
        if (hasSpaces || hasPunctuation || hasCyrillic) {
          return true;
        }
        
        // 3. Дополнительная проверка: если текст слишком "читаемый" (много гласных/согласных)
        const vowels = (text.match(/[aeiouаеёиоуыэюя]/gi) || []).length;
        const consonants = (text.match(/[bcdfghjklmnpqrstvwxyzбвгджзклмнпрстфхцчшщ]/gi) || []).length;
        const totalLetters = vowels + consonants;
        
        if (totalLetters > 0) {
          const vowelRatio = vowels / totalLetters;
          // Если соотношение гласных/согласных похоже на обычный текст (30-60%)
          if (vowelRatio > 0.3 && vowelRatio < 0.6) {
            return true;
          }
        }
        
        return false;
      
      case 'caesar':
      case 'vigenere':
        // Для этих алгоритмов сложнее определить, но если текст содержит пробелы и знаки препинания,
        // скорее всего это обычный текст
        return /[а-яё\s.,!?;:()\-]/.test(text.toLowerCase());
      
      default:
        return false;
    }
  }

  // Улучшенное AES-256-GCM шифрование с подробными проверками
  static async aesEncrypt(text, password) {
    try {
      // Подробные проверки совместимости
      if (typeof window === 'undefined') {
        throw new Error('WebCrypto API доступен только в браузере');
      }

      if (!window.crypto) {
        throw new Error('window.crypto недоступен');
      }

      if (!window.crypto.subtle) {
        throw new Error('WebCrypto Subtle API не поддерживается');
      }

      if (!window.crypto.getRandomValues) {
        throw new Error('crypto.getRandomValues недоступен');
      }

      // Валидация входных данных
      if (!text) {
        throw new Error('Текст для шифрования не может быть пустым');
      }

      if (!password || password.length < this.AES_CONFIG.MIN_PASSWORD_LENGTH) {
        throw new Error(`Пароль должен содержать минимум ${this.AES_CONFIG.MIN_PASSWORD_LENGTH} символов`);
      }

      // Генерируем соль и IV
      const salt = window.crypto.getRandomValues(new Uint8Array(this.AES_CONFIG.SALT_LENGTH));
      const iv = window.crypto.getRandomValues(new Uint8Array(this.AES_CONFIG.IV_LENGTH));

      // Получаем ключ из пароля с помощью PBKDF2
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.AES_CONFIG.PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: this.AES_CONFIG.KEY_LENGTH },
        false,
        ['encrypt']
      );

      // Шифруем текст
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        new TextEncoder().encode(text)
      );

      // Формат пакета: version(1B) | salt(16B) | iv(12B) | ciphertext(n) | tag(16B)
      const result = new Uint8Array(1 + this.AES_CONFIG.SALT_LENGTH + this.AES_CONFIG.IV_LENGTH + encrypted.byteLength);
      let offset = 0;
            
      // Версия
      result[offset++] = this.AES_CONFIG.VERSION;
            
      // Соль
      result.set(salt, offset);
      offset += this.AES_CONFIG.SALT_LENGTH;
            
      // IV
      result.set(iv, offset);
      offset += this.AES_CONFIG.IV_LENGTH;
            
      // Зашифрованные данные (включая тег)
      result.set(new Uint8Array(encrypted), offset);

      // Возвращаем в Base64
      return this.arrayBufferToBase64(result);
    } catch (error) {
      console.error('Ошибка AES шифрования:', error);
      throw new Error(`Ошибка шифрования AES: ${error.message}`);
    }
  }

  static async aesDecrypt(encryptedData, password) {
    try {
      // Подробные проверки совместимости
      if (typeof window === 'undefined') {
        throw new Error('WebCrypto API доступен только в браузере');
      }

      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('WebCrypto API не поддерживается');
      }

      // Валидация входных данных
      if (!encryptedData) {
        throw new Error('Данные для расшифровки не могут быть пустыми');
      }

      if (!password) {
        throw new Error('Пароль не может быть пустым');
      }

      // Сначала проверяем на обычный текст
      if (this.isLikelyPlainText(encryptedData, 'aes')) {
        throw new Error('Данные выглядят как обычный текст, а не зашифрованные данные AES');
      }

      // Проверяем, что данные являются валидным Base64
      if (!this.isValidBase64(encryptedData)) {
        throw new Error('Данные не являются валидным Base64');
      }

      // Декодируем из Base64
      const data = this.base64ToArrayBuffer(encryptedData);
            
      if (data.byteLength < 1 + this.AES_CONFIG.SALT_LENGTH + this.AES_CONFIG.IV_LENGTH) {
        throw new Error('Неверный формат зашифрованных данных');
      }

      let offset = 0;
            
      // Проверяем версию
      const version = data[offset++];
      if (version === undefined || version !== this.AES_CONFIG.VERSION) {
        throw new Error(`Неподдерживаемая версия формата: ${version || 'undefined'}`);
      }
            
      // Извлекаем соль, IV и зашифрованные данные
      const salt = data.slice(offset, offset + this.AES_CONFIG.SALT_LENGTH);
      offset += this.AES_CONFIG.SALT_LENGTH;
            
      const iv = data.slice(offset, offset + this.AES_CONFIG.IV_LENGTH);
      offset += this.AES_CONFIG.IV_LENGTH;
            
      const encrypted = data.slice(offset);

      // Получаем ключ из пароля с помощью PBKDF2
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );

      const key = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: this.AES_CONFIG.PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: this.AES_CONFIG.KEY_LENGTH },
        false,
        ['decrypt']
      );

      // Расшифровываем текст
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Ошибка AES расшифровки:', error);
      throw new Error(`Ошибка расшифровки AES: ${error.message}`);
    }
  }

  // Вспомогательные функции для работы с ArrayBuffer
  static arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  static base64ToArrayBuffer(base64) {
    try {
      // Проверяем валидность Base64
      if (!this.isValidBase64(base64)) {
        throw new Error('Невалидный Base64 для ArrayBuffer');
      }
      
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error('Ошибка конвертации Base64 в ArrayBuffer:', error);
      throw new Error('Ошибка конвертации Base64 в ArrayBuffer: ' + error.message);
    }
  }

  // Универсальная генерация ключей для алгоритмов
  static generateKeyForAlgorithm(algorithm, length = 16) {
    switch (algorithm) {
    case 'caesar':
      return this.generateRandomShift();
    case 'vigenere':
      return this.generateRandomKey(Math.max(4, Math.min(length, 20)), true); // Только буквы
    case 'aes':
      return this.generateRandomKey(Math.max(12, length)); // Минимум 12 символов
    case 'base64':
      return ''; // Base64 не требует ключа
    default:
      throw new Error(`Неизвестный алгоритм: ${algorithm}`);
    }
  }

  // Криптостойкая генерация случайных ключей с улучшенной поддержкой кириллицы
  static generateRandomKey(length = 16, lettersOnly = false) {
    const chars = lettersOnly 
      ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя'
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя!@#$%^&*()_+-=[]{}|;:,.<>?';
        
    let result = '';
        
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Используем криптостойкий RNG в браузере
      const randomValues = new Uint32Array(length);
      window.crypto.getRandomValues(randomValues);
            
      for (let i = 0; i < length; i++) {
        result += chars[randomValues[i] % chars.length];
      }
    } else {
      // Fallback для Node.js или старых браузеров
      try {
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(length);
        for (let i = 0; i < length; i++) {
          result += chars[randomBytes[i] % chars.length];
        }
      } catch (error) {
        // Последний fallback - Math.random (не рекомендуется для продакшена)
        console.warn('Используется Math.random для генерации ключей - не рекомендуется для продакшена');
        for (let i = 0; i < length; i++) {
          result += chars[Math.floor(Math.random() * chars.length)];
        }
      }
    }
        
    return result;
  }

  // Генерация случайного сдвига для шифра Цезаря
  static generateRandomShift() {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      // Используем криптостойкий RNG в браузере
      const randomValues = new Uint32Array(1);
      window.crypto.getRandomValues(randomValues);
      return (randomValues[0] % 33) + 1; // 1-33 для поддержки кириллицы
    } else {
      // Fallback для Node.js
      try {
        const crypto = require('crypto');
        const randomBytes = crypto.randomBytes(1);
        return (randomBytes[0] % 33) + 1;
      } catch (error) {
        return (Math.floor(Math.random() * 33) + 1);
      }
    }
  }

  // Улучшенная валидация ключей для разных алгоритмов
  static validateKey(algorithm, key) {
    try {
      switch (algorithm) {
      case 'caesar': {
        const num = parseInt(key, 10);
        return !isNaN(num) && num >= 1 && num <= 33; // Поддержка кириллицы (33 символа)
      }
      case 'vigenere':
        // Ключ должен содержать хотя бы одну букву
        return key && key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '').length > 0;
      case 'aes':
        // Минимальные требования к паролю
        return key && key.length >= this.AES_CONFIG.MIN_PASSWORD_LENGTH && this.hasPasswordComplexity(key);
      case 'base64':
        return true; // Base64 не требует ключа
      default:
        return false;
      }
    } catch (error) {
      console.error('Ошибка валидации ключа:', error);
      return false;
    }
  }

  // Улучшенная проверка сложности пароля для AES
  static hasPasswordComplexity(password) {
    if (password.length < this.AES_CONFIG.MIN_PASSWORD_LENGTH) {return false;}
        
    let hasLower = false;
    let hasUpper = false;
    let hasDigit = false;
    let hasSpecial = false;
    let hasCyrillic = false;
        
    for (const char of password) {
      if (char >= 'a' && char <= 'z') {hasLower = true;}
      else if (char >= 'A' && char <= 'Z') {hasUpper = true;}
      else if (char >= '0' && char <= '9') {hasDigit = true;}
      else if ('!@#$%^&*()_+-=[]{}|;:,.<>?'.includes(char)) {hasSpecial = true;}
      else if (char >= 'а' && char <= 'я') {hasCyrillic = true;}
      else if (char >= 'А' && char <= 'Я') {hasCyrillic = true;}
    }
        
    // Требуем минимум 3 из 5 критериев
    const criteria = [hasLower, hasUpper, hasDigit, hasSpecial, hasCyrillic].filter(Boolean).length;
    return criteria >= 3;
  }

  // Получение силы пароля (0-100)
  static getPasswordStrength(password) {
    if (!password) {return 0;}
        
    let score = 0;
        
    // Длина
    if (password.length >= 16) {score += 25;}
    else if (password.length >= 12) {score += 20;}
    else if (password.length >= this.AES_CONFIG.MIN_PASSWORD_LENGTH) {score += 10;}
        
    // Разнообразие символов
    let hasLower = /[a-z]/.test(password);
    let hasUpper = /[A-Z]/.test(password);
    let hasDigit = /\d/.test(password);
    let hasSpecial = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password);
    let hasCyrillic = /[а-яА-Я]/.test(password);
        
    const charTypes = [hasLower, hasUpper, hasDigit, hasSpecial, hasCyrillic].filter(Boolean).length;
    score += charTypes * 15;
        
    // Дополнительные бонусы
    if (password.length >= 20) {score += 10;}
    if (password.length >= 25) {score += 10;}
        
    // Штрафы за простые паттерны
    if (/(.)\1{2,}/.test(password)) {score -= 10;} // Повторяющиеся символы
    if (/123|abc|qwe|йцу/i.test(password)) {score -= 15;} // Простые последовательности
        
    return Math.min(Math.max(score, 0), 100);
  }

  // Получение информации о ключах для разных алгоритмов
  static getKeyInfo(algorithm) {
    switch (algorithm) {
    case 'caesar':
      return 'Для шифра Цезаря введите число от 1 до 33 (сдвиг, учитывает кириллицу)';
    case 'vigenere':
      return 'Для шифра Виженера введите ключевое слово (минимум 1 буква)';
    case 'aes':
      return `Для AES-256 введите пароль (минимум ${this.AES_CONFIG.MIN_PASSWORD_LENGTH} символов, разнообразный)`;
    case 'base64':
      return 'Base64 не требует ключа';
    default:
      return '';
    }
  }

  // Оптимизированное многоэтапное кодирование/декодирование с улучшенным логированием
  static async multiStepEncrypt(text, steps, enableLogging = true) {
    if (!text || !Array.isArray(steps) || steps.length === 0) {
      return { result: text, log: [] };
    }
        
    let result = text;
    const log = enableLogging ? [] : null;
    const startTime = Date.now();
        
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const { algorithm, key } = step;
      if (!algorithm) {continue;}
            
      const stepNumber = i + 1;
      const stepName = this.getAlgorithmDisplayName(algorithm);
      const stepStartTime = Date.now();
            
      try {
        const beforeText = result;
        const processResult = await this.processText(algorithm, result, key || '', true);
                
        if (!processResult.success) {
          throw new Error(processResult.error);
        }
                
        result = processResult.result;
                
        if (!result) {
          throw new Error(`Ошибка на шаге ${algorithm}`);
        }
                
        // Логируем этап с ограничением
        if (enableLogging && log.length < this.AES_CONFIG.MAX_LOG_ENTRIES) {
          log.push({
            step: stepNumber,
            algorithm: algorithm,
            algorithmName: stepName,
            key: key || 'без ключа',
            inputLength: beforeText.length,
            outputLength: result.length,
            processingTime: Date.now() - stepStartTime,
            timestamp: new Date().toISOString(),
            operation: 'encrypt'
          });
        }
                
      } catch (error) {
        console.error(`Ошибка многоэтапного шифрования на шаге ${algorithm}:`, error);
        return { 
          result: '', 
          log: log || [], 
          error: error.message,
          totalTime: Date.now() - startTime
        };
      }
    }
        
    return { 
      result, 
      log: log || [], 
      totalTime: Date.now() - startTime,
      stepsProcessed: steps.length
    };
  }

  static async multiStepDecrypt(text, steps, enableLogging = true) {
    if (!text || !Array.isArray(steps) || steps.length === 0) {
      return { result: text, log: [] };
    }
        
    let result = text;
    const log = enableLogging ? [] : null;
    const startTime = Date.now();
        
    // Выполняем шаги в обратном порядке
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      const { algorithm, key } = step;
      if (!algorithm) {continue;}
            
      const stepNumber = steps.length - i;
      const stepName = this.getAlgorithmDisplayName(algorithm);
      const stepStartTime = Date.now();
            
      try {
        const beforeText = result;
        const processResult = await this.processText(algorithm, result, key || '', false);
                
        if (!processResult.success) {
          throw new Error(processResult.error);
        }
                
        result = processResult.result;
                
        if (!result) {
          throw new Error(`Ошибка на шаге ${algorithm}`);
        }
                
        // Логируем этап с ограничением
        if (enableLogging && log.length < this.AES_CONFIG.MAX_LOG_ENTRIES) {
          log.push({
            step: stepNumber,
            algorithm: algorithm,
            algorithmName: stepName,
            key: key || 'без ключа',
            inputLength: beforeText.length,
            outputLength: result.length,
            processingTime: Date.now() - stepStartTime,
            timestamp: new Date().toISOString(),
            operation: 'decrypt'
          });
        }
                
      } catch (error) {
        console.error(`Ошибка многоэтапного расшифровки на шаге ${algorithm}:`, error);
        return { 
          result: '', 
          log: log || [], 
          error: error.message,
          totalTime: Date.now() - startTime
        };
      }
    }
        
    return { 
      result, 
      log: log || [], 
      totalTime: Date.now() - startTime,
      stepsProcessed: steps.length
    };
  }

  // Параллельное выполнение независимых операций
  static async parallelProcess(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return [];
    }

    try {
      const results = await Promise.allSettled(
        operations.map(async (op) => {
          const result = await this.processText(op.algorithm, op.text, op.key, op.isEncrypt);
          return {
            ...op,
            result: result.success ? result.result : null,
            error: result.success ? null : result.error
          };
        })
      );

      return results.map((result, index) => ({
        operation: operations[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
      }));
    } catch (error) {
      console.error('Ошибка параллельной обработки:', error);
      throw error;
    }
  }

  // Получение отображаемого имени алгоритма
  static getAlgorithmDisplayName(algorithm) {
    const names = {
      'caesar': 'Шифр Цезаря',
      'vigenere': 'Шифр Виженера',
      'base64': 'Base64',
      'aes': 'AES-256'
    };
    return names[algorithm] || algorithm;
  }

  // Создание метаданных для сохранения
  static createMetadata(steps, log, originalText, finalResult) {
    return {
      version: '2.0',
      timestamp: new Date().toISOString(),
      steps: steps.map((step, index) => ({
        step: index + 1,
        algorithm: step.algorithm,
        algorithmName: this.getAlgorithmDisplayName(step.algorithm),
        key: step.key || 'без ключа',
        keyType: this.getKeyType(step.algorithm)
      })),
      log: log || [],
      statistics: {
        originalLength: originalText.length,
        finalLength: finalResult.length,
        stepsCount: steps.length,
        algorithms: [...new Set(steps.map(s => s.algorithm))],
        processingTime: log && log.length > 0 ? log.reduce((sum, entry) => sum + (entry.processingTime || 0), 0) : 0
      }
    };
  }

  // Получение типа ключа для отображения
  static getKeyType(algorithm) {
    const types = {
      'caesar': 'число (сдвиг)',
      'vigenere': 'текст (ключевое слово)',
      'base64': 'не требуется',
      'aes': 'пароль'
    };
    return types[algorithm] || 'неизвестно';
  }

  // Основной метод шифрования (для обратной совместимости)
  static async encrypt(text, algorithm, key) {
    const result = await this.processText(algorithm, text, key, true);
    if (result.success) {
      return result.result;
    } else {
      throw new Error(result.error || 'Ошибка шифрования');
    }
  }

  // Основной метод дешифрования (для обратной совместимости)
  static async decrypt(text, algorithm, key) {
    const result = await this.processText(algorithm, text, key, false);
    if (result.success) {
      return result.result;
    } else if (result.isPlainText) {
      return result.result; // Возвращаем текст как есть для обычного текста
    } else {
      throw new Error(result.error || 'Ошибка дешифрования');
    }
  }

  // Очистка кэша
  static clearCache() {
    this._alphabetCache.clear();
  }

  // Получение статистики кэша
  static getCacheStats() {
    return {
      alphabetCacheSize: this._alphabetCache.size,
      alphabetMapSize: this.ALPHABET_MAP.size
    };
  }
}

// Экспорт для использования в основном приложении
// ES6 экспорт
export default CryptoUtils;
