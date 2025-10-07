// Расширенный модуль для управления темами с автоматической загрузкой
import ThemeManager from './ThemeManager.js';

class EnhancedThemeManager extends ThemeManager {
  constructor(options = {}) {
    super();
    this.themeObservers = new Set();
    this.systemThemeQuery = null;
    
    // Настраиваемые параметры
    this.config = {
      preferencesCacheTTL: options.preferencesCacheTTL || 10000, // 10 секунд (увеличено)
      enableDuplicateCheck: options.enableDuplicateCheck !== false, // Проверка дубликатов тем
      useModernEvents: options.useModernEvents !== false // Современные события
    };
    
    // Кэширование для производительности
    this.preferencesCache = null;
    this.preferencesCacheTime = 0;
    
    // Утилиты для localStorage
    this.storageUtils = {
      get: (key, defaultValue = null) => {
        try {
          const value = localStorage.getItem(key);
          return value ? JSON.parse(value) : defaultValue;
        } catch (error) {
          console.warn(`Ошибка чтения из localStorage: ${key}`, error);
          return defaultValue;
        }
      },
      set: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (error) {
          console.warn(`Ошибка записи в localStorage: ${key}`, error);
          return false;
        }
      },
      remove: (key) => {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (error) {
          console.warn(`Ошибка удаления из localStorage: ${key}`, error);
          return false;
        }
      }
    };
    
    // Не вызываем init() здесь, так как он уже вызван в родительском конструкторе
    // Вместо этого вызываем наши дополнительные методы инициализации
    this.enhancedInit();
  }

  enhancedInit() {
    this.loadSavedTheme();
    this.setupSystemThemeListener();
    this.setupThemeObservers();
  }

  // Настройка наблюдателей тем
  setupThemeObservers() {
    // Здесь можно добавить дополнительную настройку наблюдателей
    // Пока что просто инициализируем пустой Set если он не существует
    if (!this.themeObservers) {
      this.themeObservers = new Set();
    }
  }

  // Загрузка сохраненной темы при запуске (оптимизированно)
  loadSavedTheme() {
    try {
      const savedTheme = this.storageUtils.get('ciphercat-theme');
      if (savedTheme && this.availableThemes.includes(savedTheme)) {
        this.setTheme(savedTheme, false); // Не сохраняем в localStorage повторно
      } else {
        // Определяем системную тему
        const systemTheme = this.detectSystemTheme();
        this.setTheme(systemTheme, false);
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
      // Fallback к светлой теме
      this.setTheme('light', false);
    }
  }

  // Переопределяем setTheme для поддержки флага сохранения
  setTheme(themeName, saveToStorage = true) {
    try {
      if (!this.availableThemes.includes(themeName)) {
        console.warn(`Тема ${themeName} недоступна`);
        return;
      }

      const previousTheme = this.currentTheme;
      this.currentTheme = themeName;

      // Применяем тему
      this.applyTheme(themeName);

      // Сохраняем в localStorage только если требуется
      if (saveToStorage) {
        this.saveTheme(themeName);
      }

      // Эмитируем событие
      this.emitThemeChanged(themeName, previousTheme);

      // Предзагружаем следующую тему для быстрого переключения
      this.preloadNextTheme();
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }

  // Улучшенное определение системной темы
  detectSystemTheme() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      return mediaQuery.matches ? 'dark' : 'light';
    }
    return 'light';
  }

  // Настройка слушателя изменений системной темы (улучшенная)
  setupSystemThemeListener() {
    if (window.matchMedia) {
      this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e) => {
        // Автоматически переключаемся на системную тему только если пользователь не выбирал тему вручную
        const hasManualTheme = this.storageUtils.get('ciphercat-theme');
        if (!hasManualTheme) {
          const systemTheme = e.matches ? 'dark' : 'light';
          this.setTheme(systemTheme, false);
          this.notifyObservers('systemThemeChanged', { theme: systemTheme });
          // Инвалидируем кэш предпочтений при изменении системной темы
          this.invalidatePreferencesCache();
        }
      };
      
      if (this.config.useModernEvents) {
        // Современный способ с addEventListener
        this.systemThemeQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // Старый способ с addListener для совместимости
        this.systemThemeQuery.addListener(handleSystemThemeChange);
      }
    }
  }

  // Добавление наблюдателей тем
  addThemeObserver(callback) {
    if (!this.themeObservers) {
      this.themeObservers = new Set();
    }
    this.themeObservers.add(callback);
  }

  // Удаление наблюдателей тем
  removeThemeObserver(callback) {
    if (this.themeObservers) {
      this.themeObservers.delete(callback);
    }
  }

  // Уведомление наблюдателей тем
  notifyObservers(event, data) {
    if (this.themeObservers && this.themeObservers.forEach) {
      this.themeObservers.forEach(callback => {
        try {
          callback(event, data);
        } catch (error) {
          console.error('Error in theme observer:', error);
        }
      });
    }
  }

  // Переопределяем emitThemeChanged для уведомления наблюдателей
  emitThemeChanged(newTheme, previousTheme) {
    // Вызываем родительский метод
    super.emitThemeChanged(newTheme, previousTheme);
    
    // Уведомляем наших наблюдателей
    this.notifyObservers('themeChanged', {
      newTheme,
      previousTheme,
      isDark: newTheme === 'dark'
    });
  }

  // Получение информации о текущей теме
  getThemeInfo() {
    return {
      currentTheme: this.currentTheme,
      isDark: this.isDarkTheme(),
      isSystemTheme: !localStorage.getItem('ciphercat-theme'),
      availableThemes: this.availableThemes,
      systemTheme: this.detectSystemTheme(),
      cacheStats: this.getCacheStats()
    };
  }

  // Принудительное применение системной темы (оптимизированно)
  applySystemTheme() {
    const systemTheme = this.detectSystemTheme();
    this.setTheme(systemTheme, false);
    this.storageUtils.remove('ciphercat-theme');
    this.notifyObservers('systemThemeApplied', { theme: systemTheme });
  }

  // Сброс к настройкам по умолчанию (оптимизированно)
  resetToDefault() {
    const systemTheme = this.detectSystemTheme();
    this.setTheme(systemTheme, false);
    this.storageUtils.remove('ciphercat-theme');
    this.clearCache();
    this.notifyObservers('themeReset', { theme: systemTheme });
  }

  // Получение предпочтений пользователя по теме (с кэшированием)
  getUserThemePreferences() {
    const now = Date.now();
    
    // Проверяем кэш
    if (this.preferencesCache && (now - this.preferencesCacheTime) < this.config.preferencesCacheTTL) {
      return this.preferencesCache;
    }
    
    // Обновляем кэш
    this.preferencesCache = {
      prefersDark: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
      prefersLight: window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches,
      prefersReducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersHighContrast: window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches
    };
    
    this.preferencesCacheTime = now;
    return this.preferencesCache;
  }

  // Инвалидация кэша предпочтений
  invalidatePreferencesCache() {
    this.preferencesCache = null;
    this.preferencesCacheTime = 0;
  }

  // Применение темы с учетом пользовательских предпочтений
  applyThemeWithPreferences(themeName) {
    const preferences = this.getUserThemePreferences();
    
    // Применяем основную тему
    this.setTheme(themeName);
    
    // Применяем дополнительные стили в зависимости от предпочтений
    this.applyAccessibilityStyles(preferences);
  }

  // Применение стилей доступности (оптимизированно)
  applyAccessibilityStyles(preferences) {
    const styleId = 'accessibility-styles';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    // Генерируем CSS только для измененных предпочтений
    const currentCSS = style.textContent || '';
    const newCSS = this._generateAccessibilityCSS(preferences);
    
    // Обновляем только если CSS изменился
    if (currentCSS !== newCSS) {
      style.textContent = newCSS;
    }
  }

  // Приватный метод для генерации CSS доступности (оптимизированный)
  _generateAccessibilityCSS(preferences) {
    const cssTemplates = {
      highContrast: `
        .btn, .algorithm-card {
          border: 2px solid currentColor !important;
        }
        
        .modal-content {
          border: 3px solid currentColor !important;
        }
      `,
      reducedMotion: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `
    };

    // Используем map для генерации CSS
    const activeStyles = Object.entries(preferences)
      .filter(([key, value]) => value && cssTemplates[key])
      .map(([key]) => cssTemplates[key])
      .join('\n');

    return activeStyles;
  }

  // Создание кастомной темы (улучшенная с проверкой дубликатов)
  createCustomTheme(name, colors) {
    // Проверка на дубликаты если включена
    if (this.config.enableDuplicateCheck && this.availableThemes.includes(name)) {
      throw new Error(`Тема с именем "${name}" уже существует`);
    }

    // Используем текущую тему как базовую, а не всегда light
    const baseTheme = this.currentTheme || 'light';
    const customTheme = {
      ...this.generateThemeStyles(baseTheme), // Базовые стили от текущей темы
      ...colors // Переопределяем цвета
    };

    this.ALPHABETS = this.ALPHABETS || {};
    this.ALPHABETS[name] = customTheme;
    this.availableThemes.push(name);
    this.themeCache.set(name, customTheme);

    return name;
  }

  // Удаление кастомной темы
  removeCustomTheme(name) {
    if (['light', 'dark'].includes(name)) {
      console.warn('Cannot remove default themes');
      return false;
    }

    const index = this.availableThemes.indexOf(name);
    if (index > -1) {
      this.availableThemes.splice(index, 1);
    }

    delete this.ALPHABETS[name];
    this.themeCache.delete(name);

    // Если удаленная тема была активной, переключаемся на светлую
    if (this.currentTheme === name) {
      this.setTheme('light');
    }

    return true;
  }

  // Экспорт настроек темы
  exportThemeSettings() {
    return {
      currentTheme: this.currentTheme,
      availableThemes: this.availableThemes,
      customThemes: Object.keys(this.ALPHABETS).filter(theme => 
        !['light', 'dark'].includes(theme)
      ),
      timestamp: new Date().toISOString()
    };
  }

  // Импорт настроек темы
  importThemeSettings(data) {
    if (data.currentTheme && this.availableThemes.includes(data.currentTheme)) {
      this.setTheme(data.currentTheme);
    }

    if (data.customThemes) {
      data.customThemes.forEach(themeName => {
        if (!this.availableThemes.includes(themeName)) {
          this.availableThemes.push(themeName);
        }
      });
    }

    return true;
  }

  // Получение статистики использования тем (оптимизированно)
  getThemeUsageStats() {
    const stats = {
      currentTheme: this.currentTheme,
      totalThemes: this.availableThemes.length,
      cacheStats: this.getCacheStats(),
      systemTheme: this.detectSystemTheme(),
      preferences: this.getUserThemePreferences(),
      lastChanged: this.storageUtils.get('ciphercat-theme-last-changed')
    };

    return stats;
  }

  // Сохранение времени последнего изменения темы (оптимизированно)
  saveTheme(themeName) {
    super.saveTheme(themeName);
    if (this.storageUtils && this.storageUtils.set) {
      this.storageUtils.set('ciphercat-theme-last-changed', new Date().toISOString());
    }
  }

  // Очистка всех настроек тем (оптимизированно)
  clearAllThemeSettings() {
    this.storageUtils.remove('ciphercat-theme');
    this.storageUtils.remove('theme');
    this.storageUtils.remove('ciphercat-theme-last-changed');
    this.clearCache();
    this.resetToDefault();
  }
}

export default EnhancedThemeManager;
