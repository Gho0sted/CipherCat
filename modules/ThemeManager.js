// Модуль для управления темами с кэшированием
class ThemeManager {
  constructor(options = {}) {
    this.currentTheme = 'light';
    this.availableThemes = ['light', 'dark'];
    this.themeCache = new Map();
    
    // Конфигурация
    this.config = {
      enableStyleCache: options.enableStyleCache || false, // Отключен по умолчанию
      enableAsyncPreload: options.enableAsyncPreload !== false, // Асинхронная предзагрузка
      enableSmoothTransitions: options.enableSmoothTransitions !== false, // Плавные переходы
      enableCustomThemes: options.enableCustomThemes !== false // Динамические темы
    };
    
    // Кэш стилей (опциональный)
    this.styleCache = this.config.enableStyleCache ? new Map() : null;
    
    // Пользовательские темы
    this.customThemes = new Map();
    
    this.init();
  }

  init() {
    this.loadTheme();
    this.preloadThemes();
    this.setupThemeChangeListener();
  }

  // Предзагрузка стилей для тем (асинхронная)
  async preloadThemes() {
    // Отключаем предзагрузку тем, так как файлы не существуют
    // if (this.config.enableAsyncPreload) {
    //   // Асинхронная предзагрузка
    //   const preloadPromises = this.availableThemes.map(theme => this.preloadThemeAsync(theme));
    //   await Promise.all(preloadPromises);
    // } else {
    //   // Синхронная предзагрузка
    //   this.availableThemes.forEach(theme => {
    //     this.preloadTheme(theme);
    //   });
    // }
  }

  // Предзагрузка конкретной темы
  preloadTheme(themeName) {
    if (this.themeCache.has(themeName)) {
      return; // Тема уже загружена
    }

    // Создаем стили для темы
    const themeStyles = this.generateThemeStyles(themeName);
    this.themeCache.set(themeName, themeStyles);
    
    // Кэшируем CSS переменные только если включен кэш стилей
    if (this.config.enableStyleCache) {
      this.cacheCSSVariables(themeName);
    }
  }

  // Асинхронная предзагрузка темы
  async preloadThemeAsync(themeName) {
    if (this.themeCache.has(themeName)) {
      return; // Тема уже загружена
    }

    try {
      // Пытаемся загрузить тему из JSON файла
      const response = await fetch(`themes/${themeName}.json`);
      if (response.ok) {
        const themeData = await response.json();
        this.themeCache.set(themeName, themeData);
        return;
      }
    } catch (error) {
      console.warn(`Не удалось загрузить тему ${themeName} из файла:`, error);
    }

    // Fallback на генерацию стилей
    const themeStyles = this.generateThemeStyles(themeName);
    this.themeCache.set(themeName, themeStyles);
  }

  // Генерация стилей для темы
  generateThemeStyles(themeName) {
    const themes = {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f8f9fa',
        '--bg-tertiary': '#e9ecef',
        '--text-primary': '#212529',
        '--text-secondary': '#6c757d',
        '--text-muted': '#adb5bd',
        '--border-color': '#dee2e6',
        '--shadow-sm': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
        '--shadow-md': '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
        '--shadow-lg': '0 1rem 3rem rgba(0, 0, 0, 0.175)',
        '--primary-color': '#007bff',
        '--success-color': '#28a745',
        '--warning-color': '#ffc107',
        '--error-color': '#dc3545',
        '--info-color': '#17a2b8'
      },
      dark: {
        '--bg-primary': '#1a1a1a',
        '--bg-secondary': '#2d2d2d',
        '--bg-tertiary': '#404040',
        '--text-primary': '#ffffff',
        '--text-secondary': '#b3b3b3',
        '--text-muted': '#808080',
        '--border-color': '#404040',
        '--shadow-sm': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.3)',
        '--shadow-md': '0 0.5rem 1rem rgba(0, 0, 0, 0.4)',
        '--shadow-lg': '0 1rem 3rem rgba(0, 0, 0, 0.5)',
        '--primary-color': '#4dabf7',
        '--success-color': '#51cf66',
        '--warning-color': '#ffd43b',
        '--error-color': '#ff6b6b',
        '--info-color': '#74c0fc'
      }
    };

    return themes[themeName] || themes.light;
  }

  // Кэширование CSS переменных
  cacheCSSVariables(themeName) {
    // const computedStyles = getComputedStyle(document.documentElement);
    const cssVariables = {};
    
    // Получаем все CSS переменные
    const styleSheets = Array.from(document.styleSheets);
    styleSheets.forEach(sheet => {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules);
        rules.forEach(rule => {
          if (rule.style) {
            Array.from(rule.style).forEach(property => {
              if (property.startsWith('--')) {
                cssVariables[property] = rule.style.getPropertyValue(property);
              }
            });
          }
        });
      } catch (e) {
        // Игнорируем ошибки CORS
      }
    });

    this.styleCache.set(themeName, cssVariables);
  }

  // Переключение темы
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  // Установка темы (с плавными переходами)
  setTheme(themeName) {
    if (!this.availableThemes.includes(themeName) && !this.customThemes.has(themeName)) {
      console.warn(`Тема ${themeName} недоступна`);
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = themeName;

    // Применяем тему с плавным переходом
    this.applyTheme(themeName);

    // Сохраняем в localStorage
    this.saveTheme(themeName);

    // Эмитируем событие
    this.emitThemeChanged(themeName, previousTheme);

    // Предзагружаем следующую тему для быстрого переключения
    this.preloadNextTheme();
  }

  // Применение темы (с плавными переходами)
  applyTheme(themeName) {
    // Включаем плавные переходы если настроено
    if (this.config.enableSmoothTransitions) {
      document.documentElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }

    // Устанавливаем атрибут data-theme
    document.documentElement.setAttribute('data-theme', themeName);

    // Применяем CSS переменные
    const themeStyles = this.themeCache.get(themeName) || this.customThemes.get(themeName);
    if (themeStyles) {
      Object.entries(themeStyles).forEach(([property, value]) => {
        document.documentElement.style.setProperty(property, value);
      });
    }

    // Обновляем иконку темы
    this.updateThemeIcon(themeName);

    // Применяем дополнительные стили
    this.applyAdditionalStyles(themeName);

    // Отключаем переходы после применения
    if (this.config.enableSmoothTransitions) {
      setTimeout(() => {
        document.documentElement.style.transition = '';
      }, 300);
    }
  }

  // Применение дополнительных стилей через CSS переменные
  applyAdditionalStyles(themeName) {
    const root = document.documentElement;
    const additionalStyles = this.getAdditionalStyles(themeName);
    
    // Применяем стили через CSS переменные вместо inline стилей
    if (typeof additionalStyles === 'object') {
      Object.entries(additionalStyles).forEach(([property, value]) => {
        if (property.startsWith('--')) {
          root.style.setProperty(property, value);
        }
      });
    }
  }

  // Получение дополнительных стилей для темы
  getAdditionalStyles(themeName) {
    const styles = {
      light: {
        '--notification-bg': 'rgba(255, 255, 255, 0.95)',
        '--scrollbar-track': 'var(--bg-secondary)',
        '--scrollbar-thumb': 'var(--bg-tertiary)',
        '--scrollbar-thumb-hover': 'var(--text-secondary)'
      },
      dark: {
        '--notification-bg': 'rgba(45, 45, 45, 0.95)',
        '--scrollbar-track': 'var(--bg-secondary)',
        '--scrollbar-thumb': 'var(--bg-tertiary)',
        '--scrollbar-thumb-hover': 'var(--text-secondary)'
      }
    };
    
    return styles[themeName] || {};
  }

  // Обновление иконки темы
  updateThemeIcon(themeName) {
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
      themeIcon.className = themeName === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }

  // Предзагрузка следующей темы
  preloadNextTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    if (!this.themeCache.has(nextTheme)) {
      this.preloadTheme(nextTheme);
    }
  }

  // Загрузка темы из localStorage
  loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && this.availableThemes.includes(savedTheme)) {
      this.setTheme(savedTheme);
    } else {
      // Определяем системную тему
      const systemTheme = this.detectSystemTheme();
      this.setTheme(systemTheme);
    }
  }

  // Определение системной темы
  detectSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }

  // Сохранение темы
  saveTheme(themeName) {
    localStorage.setItem('theme', themeName);
  }

  // Настройка слушателя изменений системной темы
  setupThemeChangeListener() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener((e) => {
        // Автоматически переключаемся на системную тему только если пользователь не выбирал тему вручную
        const hasManualTheme = localStorage.getItem('theme');
        if (!hasManualTheme) {
          const systemTheme = e.matches ? 'dark' : 'light';
          this.setTheme(systemTheme);
        }
      });
    }
  }

  // Получение текущей темы
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Получение доступных тем
  getAvailableThemes() {
    return [...this.availableThemes, ...this.customThemes.keys()];
  }

  // Добавление пользовательской темы
  addCustomTheme(name, variables) {
    if (this.config.enableCustomThemes) {
      this.customThemes.set(name, variables);
      this.themeCache.set(name, variables);
      return true;
    } else {
      console.warn('Пользовательские темы отключены');
      return false;
    }
  }

  // Удаление пользовательской темы
  removeCustomTheme(name) {
    if (this.customThemes.has(name)) {
      this.customThemes.delete(name);
      this.themeCache.delete(name);
      return true;
    }
    return false;
  }

  // Получение пользовательских тем
  getCustomThemes() {
    return Array.from(this.customThemes.keys());
  }

  // Проверка, является ли тема темной
  isDarkTheme() {
    return this.currentTheme === 'dark';
  }

  // Получение контрастного цвета
  getContrastColor() {
    return this.currentTheme === 'dark' ? '#ffffff' : '#000000';
  }

  // События
  emitThemeChanged(newTheme, previousTheme) {
    const event = new CustomEvent('themeChanged', {
      detail: { 
        newTheme, 
        previousTheme, 
        isDark: newTheme === 'dark' 
      }
    });
    document.dispatchEvent(event);
  }

  // Очистка кэша
  clearCache() {
    this.themeCache.clear();
    this.styleCache.clear();
  }

  // Получение статистики кэша
  getCacheStats() {
    return {
      themeCacheSize: this.themeCache.size,
      styleCacheSize: this.styleCache.size,
      cachedThemes: Array.from(this.themeCache.keys())
    };
  }
}

export default ThemeManager;
