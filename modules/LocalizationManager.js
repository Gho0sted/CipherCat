// Модуль для управления локализацией и многоязычной поддержки
class LocalizationManager {
  constructor(options = {}) {
    this.currentLanguage = 'ru';
    
    // Конфигурация
    this.config = {
      enableElementCache: options.enableElementCache !== false, // Кэширование DOM элементов
      enableParameterValidation: options.enableParameterValidation !== false, // Проверка параметров
      enableAsyncTranslations: options.enableAsyncTranslations !== false, // Асинхронная загрузка
      enableUIUpdateOptimization: options.enableUIUpdateOptimization !== false // Оптимизация UI обновлений
    };
    
    // Кэш для DOM элементов
    this.elementCache = new Map();
    this.lastCacheTime = 0;
    this.cacheTTL = 5000; // 5 секунд
    
    this.translations = {
      ru: {
        // Основные элементы
        'app-title': 'CipherCat',
        'visualization-title': 'Визуализация',
        'show-visualization': 'Показать визуализацию',
        'visualization-enabled': 'Визуализация включена',
        'visualization-disabled': 'Визуализация отключена',
        'algorithm-selection': 'Выберите алгоритм шифрования',
        'caesar-title': 'Шифр Цезаря',
        'caesar-description': 'Простое смещение символов',
        'reverse-caesar-title': 'Обратный Цезарь',
        'reverse-caesar-description': 'Шифр Цезаря с обратным сдвигом',
        'vigenere-title': 'Шифр Виженера',
        'vigenere-description': 'Полиалфавитное шифрование',
        'atbash-title': 'Атбаш',
        'atbash-description': 'Моноалфавитный шифр с обратным алфавитом',
        'base64-title': 'Base64',
        'base64-description': 'Кодирование в Base64',
        'aes-title': 'AES-256',
        'aes-description': 'Современное шифрование',
        'multi-title': 'Многоэтапное',
        'multi-description': 'Последовательное шифрование',
        
        // Ключи и ввод
        'key-input-title': 'Ключ шифрования',
        'key-label': 'Ключ шифрования:',
        'key-info-caesar': 'Для шифра Цезаря введите число (сдвиг)',
        'key-info-vigenere': 'Введите ключевое слово',
        'key-info-aes': 'Введите пароль (минимум 8 символов)',
        'key-info-base64': 'Base64 не требует ключа',
        'algorithm-options': 'Настройки алгоритма',
        
        // Многоэтапное шифрование
        'multi-step-title': 'Многоэтапное шифрование',
        'add-step': 'Добавить этап',
        'clear-steps': 'Очистить',
        'options-title': 'Настройки',
        'enable-logging': 'Включить логирование этапов',
        'save-metadata': 'Сохранять метаданные в файл',
        'enable-visualization': 'Показать визуализацию процесса',
        
        // История
        'history-title': 'История этапов',
        
        // Обработка текста
        'text-processing-title': 'Обработка текста',
        'input-text-title': 'Исходный текст',
        'output-text-title': 'Результат',
        'encrypt': 'Зашифровать',
        'decrypt': 'Расшифровать',
        'clear': 'Очистить',
        'load': 'Загрузить',
        'save': 'Сохранить',
        'copy': 'Копировать',
        'characters': 'символов',
        
        // Языки
        'language-support': 'Поддержка языков',
        'english': 'English',
        'russian': 'Русский',
        'unicode': 'Unicode',
        
        // О программе
        'about-title': 'О приложении',
        'about-description': 'Современное приложение для шифрования и дешифрования текста с поддержкой множества алгоритмов и языков.',
        'supported-algorithms': 'Поддерживаемые алгоритмы:',
        'caesar-name': 'Шифр Цезаря',
        'caesar-info': 'классическое шифрование со сдвигом',
        'vigenere-name': 'Шифр Виженера',
        'vigenere-info': 'полиалфавитное шифрование',
        'base64-name': 'Base64',
        'base64-info': 'кодирование в Base64',
        'aes-name': 'AES-256',
        'aes-info': 'современное симметричное шифрование',
        'features': 'Особенности:',
        'feature-languages': 'Поддержка русского и английского языков',
        'feature-interface': 'Современный и интуитивный интерфейс',
        'feature-files': 'Сохранение и загрузка файлов',
        'feature-keys': 'Генерация случайных ключей',
        'feature-counter': 'Подсчет символов в реальном времени',
        
        // Подвал
        'footer-text': 'Безопасное шифрование текста.',
        
        // Уведомления
        'notification-encrypt-success': 'Текст успешно зашифрован',
        'notification-decrypt-success': 'Текст успешно расшифрован',
        'notification-copy-success': 'Результат скопирован в буфер обмена',
        'notification-save-success': 'Файл сохранен',
        'notification-load-success': 'Файл загружен',
        'notification-clear-success': 'Текст очищен',
        'notification-swap-success': 'Текст поменялся местами',
        'notification-theme-light': 'Переключено на светлую тему',
        'notification-theme-dark': 'Переключено на темную тему',
        'notification-step-added': 'Этап добавлен',
        'notification-step-removed': 'Этап удален',
        'notification-steps-cleared': 'Все этапы очищены',
        'notification-history-cleared': 'История этапов очищена',
        'notification-language-changed': 'Язык изменен на',
        
        // Ошибки
        'error-no-text': 'Введите текст для обработки',
        'error-no-key': 'Введите ключ шифрования',
        'error-invalid-key': 'Неверный формат ключа',
        'error-no-result': 'Нет результата для копирования',
        'error-no-result-save': 'Нет результата для сохранения',
        'error-file-load': 'Ошибка при загрузке файла',
        'error-file-save': 'Ошибка при сохранении файла',
        'error-copy': 'Ошибка при копировании',
        'error-processing': 'Ошибка при обработке текста',
        'error-no-steps': 'Добавьте хотя бы один этап шифрования',
        'error-step-key': 'Введите ключ для этапа',
        'error-step-format': 'Неверный формат ключа для этапа'
      },
      
      en: {
        // Main elements
        'app-title': 'CipherCat',
        'visualization-title': 'Visualization',
        'show-visualization': 'Show visualization',
        'visualization-enabled': 'Visualization enabled',
        'visualization-disabled': 'Visualization disabled',
        'algorithm-selection': 'Choose encryption algorithm',
        'caesar-title': 'Caesar Cipher',
        'caesar-description': 'Simple character shift',
        'reverse-caesar-title': 'Reverse Caesar',
        'reverse-caesar-description': 'Caesar cipher with reverse shift',
        'vigenere-title': 'Vigenère Cipher',
        'vigenere-description': 'Polyalphabetic encryption',
        'atbash-title': 'Atbash',
        'atbash-description': 'Monoalphabetic cipher with reverse alphabet',
        'base64-title': 'Base64',
        'base64-description': 'Base64 encoding',
        'aes-title': 'AES-256',
        'aes-description': 'Modern encryption',
        'multi-title': 'Multi-step',
        'multi-description': 'Sequential encryption',
        
        // Keys and input
        'key-input-title': 'Encryption Key',
        'key-label': 'Encryption key:',
        'key-info-caesar': 'Enter a number (shift) for Caesar cipher',
        'key-info-vigenere': 'Enter a keyword',
        'key-info-aes': 'Enter password (minimum 8 characters)',
        'key-info-base64': 'Base64 does not require a key',
        'algorithm-options': 'Algorithm options',
        
        // Multi-step encryption
        'multi-step-title': 'Multi-step Encryption',
        'add-step': 'Add Step',
        'clear-steps': 'Clear',
        'options-title': 'Options',
        'enable-logging': 'Enable step logging',
        'save-metadata': 'Save metadata to file',
        'enable-visualization': 'Show process visualization',
        
        // History
        'history-title': 'Steps History',
        
        // Text processing
        'text-processing-title': 'Text Processing',
        'input-text-title': 'Input Text',
        'output-text-title': 'Result',
        'encrypt': 'Encrypt',
        'decrypt': 'Decrypt',
        'clear': 'Clear',
        'load': 'Load',
        'save': 'Save',
        'copy': 'Copy',
        'characters': 'characters',
        
        // Languages
        'language-support': 'Language Support',
        'english': 'English',
        'russian': 'Русский',
        'unicode': 'Unicode',
        
        // About
        'about-title': 'About Application',
        'about-description': 'Modern application for text encryption and decryption with support for multiple algorithms and languages.',
        'supported-algorithms': 'Supported algorithms:',
        'caesar-name': 'Caesar Cipher',
        'caesar-info': 'classical shift encryption',
        'vigenere-name': 'Vigenère Cipher',
        'vigenere-info': 'polyalphabetic encryption',
        'base64-name': 'Base64',
        'base64-info': 'Base64 encoding',
        'aes-name': 'AES-256',
        'aes-info': 'modern symmetric encryption',
        'features': 'Features:',
        'feature-languages': 'Support for Russian and English languages',
        'feature-interface': 'Modern and intuitive interface',
        'feature-files': 'File save and load',
        'feature-keys': 'Random key generation',
        'feature-counter': 'Real-time character counting',
        
        // Footer
        'footer-text': 'Secure text encryption.',
        
        // Notifications
        'notification-encrypt-success': 'Text successfully encrypted',
        'notification-decrypt-success': 'Text successfully decrypted',
        'notification-copy-success': 'Result copied to clipboard',
        'notification-save-success': 'File saved',
        'notification-load-success': 'File loaded',
        'notification-clear-success': 'Text cleared',
        'notification-swap-success': 'Text swapped',
        'notification-theme-light': 'Switched to light theme',
        'notification-theme-dark': 'Switched to dark theme',
        'notification-step-added': 'Step added',
        'notification-step-removed': 'Step removed',
        'notification-steps-cleared': 'All steps cleared',
        'notification-history-cleared': 'Steps history cleared',
        'notification-language-changed': 'Language changed to',
        
        // Errors
        'error-no-text': 'Enter text to process',
        'error-no-key': 'Enter encryption key',
        'error-invalid-key': 'Invalid key format',
        'error-no-result': 'No result to copy',
        'error-no-result-save': 'No result to save',
        'error-file-load': 'Error loading file',
        'error-file-save': 'Error saving file',
        'error-copy': 'Error copying',
        'error-processing': 'Error processing text',
        'error-no-steps': 'Add at least one encryption step',
        'error-step-key': 'Enter key for step',
        'error-step-format': 'Invalid key format for step'
      }
    };
    
    this.observers = new Set();
    this.init();
  }

  init() {
    this.loadLanguage();
    this.setupLanguageSwitcher();
    this.applyTranslations();
    this.setupKeyboardShortcuts();
  }

  // Загрузка языка из localStorage
  loadLanguage() {
    const savedLanguage = localStorage.getItem('ciphercat-language');
    if (savedLanguage && this.translations[savedLanguage]) {
      this.currentLanguage = savedLanguage;
    } else {
      // Определяем язык браузера
      const browserLanguage = navigator.language.split('-')[0];
      if (this.translations[browserLanguage]) {
        this.currentLanguage = browserLanguage;
      }
    }
  }

  // Сохранение языка в localStorage
  saveLanguage(language) {
    localStorage.setItem('ciphercat-language', language);
  }

  // Переключение языка (с объединением UI обновлений)
  switchLanguage(language) {
    if (!this.translations[language]) {
      console.warn(`Language ${language} is not supported`);
      return false;
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;
    this.saveLanguage(language);
    
    // Объединяем UI обновления в один метод
    if (this.config.enableUIUpdateOptimization) {
      this._updateUIForLanguageChange();
    } else {
      this.applyTranslations();
      this.updateLanguageSwitcher();
      this.updateDocumentLanguage();
    }
    
    // Уведомляем наблюдателей
    this.notifyObservers('languageChanged', {
      newLanguage: language,
      previousLanguage: previousLanguage
    });

    return true;
  }

  // Объединенное обновление UI при смене языка
  _updateUIForLanguageChange() {
    // Инвалидируем кэш элементов
    this.elementCache.clear();
    this.lastCacheTime = 0;
    
    // Выполняем все обновления
    this.applyTranslations();
    this.updateLanguageSwitcher();
    this.updateDocumentLanguage();
  }

  // Применение переводов к элементам страницы
  applyTranslations() {
    const elements = this._getCachedElements();
    elements.forEach(element => {
      const key = element.getAttribute('data-localize');
      const translation = this.getTranslation(key);
      
      if (translation) {
        if (element.tagName === 'INPUT' && element.type === 'text') {
          element.placeholder = translation;
        } else {
          element.textContent = translation;
        }
      } else {
        console.warn(`Translation not found for key: ${key}`);
      }
    });
  }

  // Получение кэшированных элементов
  _getCachedElements() {
    const now = Date.now();
    
    // Проверяем актуальность кэша
    if (this.config.enableElementCache && 
        this.elementCache.size > 0 && 
        (now - this.lastCacheTime) < this.cacheTTL) {
      return Array.from(this.elementCache.values());
    }
    
    // Обновляем кэш
    const elements = document.querySelectorAll('[data-localize]');
    this.elementCache.clear();
    elements.forEach(element => {
      const key = element.getAttribute('data-localize');
      if (key) {
        this.elementCache.set(key, element);
      }
    });
    
    this.lastCacheTime = now;
    return elements;
  }

  // Получение перевода по ключу
  getTranslation(key) {
    return this.translations[this.currentLanguage]?.[key] || 
           this.translations['ru']?.[key] || 
           key;
  }

  // Получение текущего языка
  getCurrentLanguage() {
    return this.currentLanguage;
  }

  // Получение списка поддерживаемых языков
  getSupportedLanguages() {
    return Object.keys(this.translations);
  }

  // Обновление атрибута lang документа
  updateDocumentLanguage() {
    document.documentElement.lang = this.currentLanguage;
  }

  // Настройка переключателя языков
  setupLanguageSwitcher() {
    const switcher = document.getElementById('languageSwitcher');
    if (switcher) {
      const buttons = switcher.querySelectorAll('[data-lang]');
      buttons.forEach(button => {
        button.addEventListener('click', () => {
          const lang = button.getAttribute('data-lang');
          this.switchLanguage(lang);
        });
      });
      
      // Показываем переключатель если поддерживается несколько языков
      if (this.getSupportedLanguages().length > 1) {
        switcher.style.display = 'block';
      }
    }
  }

  // Обновление состояния переключателя языков
  updateLanguageSwitcher() {
    const switcher = document.getElementById('languageSwitcher');
    if (switcher) {
      const buttons = switcher.querySelectorAll('[data-lang]');
      buttons.forEach(button => {
        const lang = button.getAttribute('data-lang');
        if (lang === this.currentLanguage) {
          button.classList.add('active');
          button.setAttribute('aria-pressed', 'true');
        } else {
          button.classList.remove('active');
          button.setAttribute('aria-pressed', 'false');
        }
      });
    }
  }

  // Настройка горячих клавиш для переключения языков
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key) {
        case 'R':
          e.preventDefault();
          this.switchLanguage('ru');
          break;
        case 'E':
          e.preventDefault();
          this.switchLanguage('en');
          break;
        }
      }
    });
  }

  // Добавление наблюдателя
  addObserver(callback) {
    this.observers.add(callback);
  }

  // Удаление наблюдателя
  removeObserver(callback) {
    this.observers.delete(callback);
  }

  // Уведомление наблюдателей
  notifyObservers(event, data) {
    this.observers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in localization observer:', error);
      }
    });
  }

  // Добавление нового языка
  addLanguage(code, translations) {
    this.translations[code] = translations;
    
    // Обновляем переключатель если он существует
    this.setupLanguageSwitcher();
  }

  // Удаление языка
  removeLanguage(code) {
    if (code === 'ru' || code === 'en') {
      console.warn('Cannot remove default languages (ru, en)');
      return false;
    }
    
    delete this.translations[code];
    
    // Если удаленный язык был текущим, переключаемся на русский
    if (this.currentLanguage === code) {
      this.switchLanguage('ru');
    }
    
    return true;
  }

  // Получение статистики переводов
  getTranslationStats() {
    const stats = {};
    
    Object.keys(this.translations).forEach(lang => {
      stats[lang] = {
        totalKeys: Object.keys(this.translations[lang]).length,
        missingKeys: []
      };
    });

    // Проверяем отсутствующие ключи
    const allKeys = new Set();
    Object.values(this.translations).forEach(translation => {
      Object.keys(translation).forEach(key => allKeys.add(key));
    });

    Object.keys(this.translations).forEach(lang => {
      allKeys.forEach(key => {
        if (!this.translations[lang][key]) {
          stats[lang].missingKeys.push(key);
        }
      });
    });

    return stats;
  }

  // Экспорт переводов
  exportTranslations(language = null) {
    if (language) {
      return {
        language: language,
        translations: this.translations[language] || {}
      };
    } else {
      return this.translations;
    }
  }

  // Импорт переводов
  importTranslations(data) {
    if (typeof data === 'object') {
      if (data.language && data.translations) {
        // Импорт одного языка
        this.addLanguage(data.language, data.translations);
      } else {
        // Импорт всех языков
        Object.keys(data).forEach(lang => {
          this.addLanguage(lang, data[lang]);
        });
      }
      return true;
    }
    return false;
  }

  // Форматирование с параметрами (с проверкой параметров)
  format(key, ...params) {
    let translation = this.getTranslation(key);
    
    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
    
    // Проверяем соответствие количества параметров
    if (this.config.enableParameterValidation) {
      const placeholderCount = (translation.match(/\{\d+\}/g) || []).length;
      if (placeholderCount !== params.length) {
        console.warn(`Parameter count mismatch for key "${key}": expected ${placeholderCount}, got ${params.length}`);
      }
    }
    
    params.forEach((param, index) => {
      translation = translation.replace(`{${index}}`, param);
    });
    
    return translation;
  }

  // Получение локализованной даты
  formatDate(date, options = {}) {
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return new Intl.DateTimeFormat(this.currentLanguage, { ...defaultOptions, ...options }).format(date);
  }

  // Получение локализованного числа
  formatNumber(number, options = {}) {
    return new Intl.NumberFormat(this.currentLanguage, options).format(number);
  }

  // Асинхронная загрузка переводов из JSON файлов
  async loadTranslationsFromFile(language, filePath) {
    if (!this.config.enableAsyncTranslations) {
      console.warn('Async translations are disabled');
      return false;
    }

    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load translations: ${response.status}`);
      }
      
      const translations = await response.json();
      
      // Объединяем с существующими переводами
      if (!this.translations[language]) {
        this.translations[language] = {};
      }
      
      Object.assign(this.translations[language], translations);
      
      // Если это текущий язык, обновляем UI
      if (language === this.currentLanguage) {
        this.applyTranslations();
      }
      
      return true;
    } catch (error) {
      console.error(`Error loading translations for ${language}:`, error);
      return false;
    }
  }

  // Инвалидация кэша элементов
  invalidateElementCache() {
    this.elementCache.clear();
    this.lastCacheTime = 0;
  }
}

export default LocalizationManager;
