// Модуль для управления состоянием UI
class UIStateManager {
  constructor(options = {}) {
    this.isDarkTheme = false;
    this.isProcessing = false;
    this.currentView = 'main';
    this.uiCache = new Map();
    this.eventListeners = new Map();
    
    // Конфигурация
    this.config = {
      enableLocalStorageSync: options.enableLocalStorageSync !== false, // Синхронизация с localStorage
      enableUnifiedEventHandlers: options.enableUnifiedEventHandlers !== false, // Объединенные обработчики
      enableExtendedCache: options.enableExtendedCache !== false, // Расширенный кэш
      enableButtonTextRestoration: options.enableButtonTextRestoration !== false // Восстановление текста кнопок
    };
    
    // Хранилище оригинальных текстов кнопок
    this.originalButtonTexts = new Map();
    
    // Объединенный обработчик событий
    this.unifiedEventHandler = null;
  }

  // Управление темой (делегируется в EnhancedThemeManager)
  toggleTheme() {
    // Делегируем управление темами в EnhancedThemeManager
    if (window.app && window.app.themeManager) {
      window.app.themeManager.toggleTheme();
    }
  }

  loadTheme() {
    // Делегируем загрузку темы в EnhancedThemeManager
    if (window.app && window.app.themeManager) {
      const currentTheme = window.app.themeManager.getCurrentTheme();
      this.isDarkTheme = currentTheme === 'dark';
    }
  }

  // Управление состоянием обработки
  setProcessing(isProcessing) {
    this.isProcessing = isProcessing;
    this.updateProcessingState();
    this.emitProcessingStateChanged();
  }

  updateProcessingState() {
    const buttons = [
      document.getElementById('encryptBtn'),
      document.getElementById('decryptBtn')
    ];

    buttons.forEach(button => {
      if (button) {
        if (this.isProcessing) {
          // Сохраняем оригинальный текст если еще не сохранен
          if (this.config.enableButtonTextRestoration && !this.originalButtonTexts.has(button.id)) {
            this.originalButtonTexts.set(button.id, button.innerHTML);
          }
          
          button.disabled = true;
          button.innerHTML = '<div class="loading"></div> Обработка...';
        } else {
          button.disabled = false;
          // Восстанавливаем оригинальный текст
          this.restoreButtonText(button);
        }
      }
    });
  }

  // Восстановить оригинальный текст кнопки (универсальный)
  restoreButtonText(button) {
    if (this.config.enableButtonTextRestoration) {
      // Используем сохраненный оригинальный текст
      const originalText = this.originalButtonTexts.get(button.id);
      if (originalText) {
        button.innerHTML = originalText;
        return;
      }
    }
    
    // Fallback на жестко прописанные тексты
    const originalTexts = {
      'encryptBtn': 'Зашифровать',
      'decryptBtn': 'Расшифровать'
    };

    const originalText = originalTexts[button.id];
    if (originalText) {
      button.innerHTML = originalText;
    }
  }

  // Управление видимостью секций
  showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('visible');
      this.cacheSectionState(sectionId, true);
    }
  }

  hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('visible');
      this.cacheSectionState(sectionId, false);
    }
  }

  toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      const isVisible = section.style.display !== 'none';
      section.style.display = isVisible ? 'none' : 'block';
      this.cacheSectionState(sectionId, !isVisible);
    }
  }

  // Кэширование состояний
  cacheSectionState(sectionId, isVisible) {
    this.uiCache.set(`section_${sectionId}`, isVisible);
  }

  getSectionState(sectionId) {
    return this.uiCache.get(`section_${sectionId}`);
  }

  // Управление полями ввода
  updateKeyInput(algorithm) {
    const keyInput = document.getElementById('keyInput');
    if (!keyInput) {return;}

    const keyInfo = this.getKeyInputConfig(algorithm);
    
    keyInput.placeholder = keyInfo.placeholder;
    keyInput.type = keyInfo.type;
    keyInput.disabled = keyInfo.disabled;
    keyInput.readOnly = keyInfo.disabled;
    
    if (keyInfo.min !== undefined) {
      keyInput.min = keyInfo.min;
    } else {
      keyInput.removeAttribute('min');
    }
    
    if (keyInfo.max !== undefined) {
      keyInput.max = keyInfo.max;
    } else {
      keyInput.removeAttribute('max');
    }

    if (keyInfo.disabled) {
      keyInput.value = '';
    }

    this.emitKeyInputUpdated(algorithm);
  }

  getKeyInputConfig(algorithm) {
    const configs = {
      caesar: {
        placeholder: 'Введите число от 1 до 33...',
        type: 'number',
        min: '1',
        max: '33',
        disabled: false
      },
      vigenere: {
        placeholder: 'Введите ключевое слово...',
        type: 'text',
        disabled: false
      },
      aes: {
        placeholder: 'Введите пароль...',
        type: 'text',
        disabled: false
      },
      reverseCaesar: {
        placeholder: 'Введите число от 1 до 33...',
        type: 'number',
        min: '1',
        max: '33',
        disabled: false
      },
      atbash: {
        placeholder: 'Атбаш не требует ключа',
        type: 'text',
        disabled: true
      },
      base64: {
        placeholder: 'Base64 не требует ключа',
        type: 'text',
        disabled: true
      }
    };

    return configs[algorithm] || configs.caesar;
  }

  // Обновление счетчиков символов
  updateCharCounts() {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const inputCount = document.getElementById('inputCharCount');
    const outputCount = document.getElementById('outputCharCount');

    if (inputText && inputCount) {
      inputCount.textContent = inputText.value.length;
    }
    
    if (outputText && outputCount) {
      outputCount.textContent = outputText.value.length;
    }
  }

  // Управление модальными окнами
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
      this.emitModalShown(modalId);
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
      this.emitModalHidden(modalId);
    }
  }

  // Делегирование событий (объединенное)
  setupEventDelegation() {
    if (this.config.enableUnifiedEventHandlers) {
      // Объединенный обработчик кликов
      this.unifiedEventHandler = (e) => {
        this._handleUnifiedClick(e);
      };
      document.addEventListener('click', this.unifiedEventHandler);
    } else {
      // Раздельные обработчики (старый способ)
      this._setupSeparateEventHandlers();
    }

    // Обработка ввода в текстовые поля
    document.addEventListener('input', (e) => {
      if (e.target.id === 'inputText' || e.target.id === 'outputText') {
        this.updateCharCounts();
        this.emitTextChanged(e.target.id, e.target.value);
      }
    });
  }

  // Объединенный обработчик кликов
  _handleUnifiedClick(e) {
    // Обработка кликов по карточкам алгоритмов
    if (e.target.closest('.algorithm-card')) {
      const card = e.target.closest('.algorithm-card');
      const algorithm = card.dataset.algorithm;
      if (algorithm) {
        this.emitAlgorithmSelected(algorithm);
      }
      return;
    }

    // Обработка кликов по кнопкам
    if (e.target.closest('[data-action]')) {
      const button = e.target.closest('[data-action]');
      const action = button.dataset.action;
      if (action) {
        this.emitActionTriggered(action, button);
      }
      return;
    }
  }

  // Раздельные обработчики событий (для совместимости)
  _setupSeparateEventHandlers() {
    // Обработка кликов по карточкам алгоритмов
    document.addEventListener('click', (e) => {
      if (e.target.closest('.algorithm-card')) {
        const card = e.target.closest('.algorithm-card');
        const algorithm = card.dataset.algorithm;
        if (algorithm) {
          this.emitAlgorithmSelected(algorithm);
        }
      }
    });

    // Обработка кликов по кнопкам
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) {
        const button = e.target.closest('[data-action]');
        const action = button.dataset.action;
        if (action) {
          this.emitActionTriggered(action, button);
        }
      }
    });
  }

  // События
  emitThemeChanged() {
    const event = new CustomEvent('themeChanged', { 
      detail: { isDarkTheme: this.isDarkTheme } 
    });
    document.dispatchEvent(event);
  }

  emitProcessingStateChanged() {
    const event = new CustomEvent('processingStateChanged', { 
      detail: { isProcessing: this.isProcessing } 
    });
    document.dispatchEvent(event);
  }

  emitKeyInputUpdated(algorithm) {
    const event = new CustomEvent('keyInputUpdated', { 
      detail: { algorithm } 
    });
    document.dispatchEvent(event);
  }

  emitModalShown(modalId) {
    const event = new CustomEvent('modalShown', { 
      detail: { modalId } 
    });
    document.dispatchEvent(event);
  }

  emitModalHidden(modalId) {
    const event = new CustomEvent('modalHidden', { 
      detail: { modalId } 
    });
    document.dispatchEvent(event);
  }

  emitAlgorithmSelected(algorithm) {
    const event = new CustomEvent('algorithmSelected', { 
      detail: { algorithm } 
    });
    document.dispatchEvent(event);
  }

  emitActionTriggered(action, element) {
    const event = new CustomEvent('actionTriggered', { 
      detail: { action, element } 
    });
    document.dispatchEvent(event);
  }

  emitTextChanged(fieldId, value) {
    const event = new CustomEvent('textChanged', { 
      detail: { fieldId, value } 
    });
    document.dispatchEvent(event);
  }

  // Очистка
  // Синхронизация состояния с localStorage
  syncWithLocalStorage() {
    if (!this.config.enableLocalStorageSync) {
      return;
    }

    try {
      // Сохраняем состояние UI
      const uiState = {
        currentView: this.currentView,
        isProcessing: this.isProcessing,
        sectionVisibility: this._getSectionVisibilityState(),
        buttonStates: this._getButtonStates()
      };
      
      localStorage.setItem('ciphercat-ui-state', JSON.stringify(uiState));
    } catch (error) {
      console.warn('Не удалось сохранить состояние UI:', error);
    }
  }

  // Загрузка состояния из localStorage
  loadFromLocalStorage() {
    if (!this.config.enableLocalStorageSync) {
      return;
    }

    try {
      const savedState = localStorage.getItem('ciphercat-ui-state');
      if (savedState) {
        const uiState = JSON.parse(savedState);
        
        this.currentView = uiState.currentView || 'main';
        this.isProcessing = uiState.isProcessing || false;
        
        // Восстанавливаем видимость секций
        if (uiState.sectionVisibility) {
          this._restoreSectionVisibility(uiState.sectionVisibility);
        }
        
        // Восстанавливаем состояния кнопок
        if (uiState.buttonStates) {
          this._restoreButtonStates(uiState.buttonStates);
        }
      }
    } catch (error) {
      console.warn('Не удалось загрузить состояние UI:', error);
    }
  }

  // Получение состояния видимости секций
  _getSectionVisibilityState() {
    const sections = ['keySection', 'multiStepSection', 'stepsHistory'];
    const visibility = {};
    
    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);
      if (section) {
        visibility[sectionId] = section.style.display !== 'none';
      }
    });
    
    return visibility;
  }

  // Восстановление видимости секций
  _restoreSectionVisibility(visibility) {
    Object.entries(visibility).forEach(([sectionId, isVisible]) => {
      if (isVisible) {
        this.showSection(sectionId);
      } else {
        this.hideSection(sectionId);
      }
    });
  }

  // Получение состояний кнопок
  _getButtonStates() {
    const buttons = ['encryptBtn', 'decryptBtn'];
    const states = {};
    
    buttons.forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        states[buttonId] = {
          disabled: button.disabled,
          text: button.innerHTML
        };
      }
    });
    
    return states;
  }

  // Восстановление состояний кнопок
  _restoreButtonStates(states) {
    Object.entries(states).forEach(([buttonId, state]) => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.disabled = state.disabled;
        button.innerHTML = state.text;
      }
    });
  }

  // Расширенное кэширование UI элементов
  cacheUIElement(key, element, metadata = {}) {
    if (this.config.enableExtendedCache) {
      this.uiCache.set(key, {
        element,
        metadata,
        timestamp: Date.now()
      });
    }
  }

  // Получение кэшированного элемента
  getCachedUIElement(key) {
    if (this.config.enableExtendedCache) {
      const cached = this.uiCache.get(key);
      if (cached && cached.element) {
        return cached.element;
      }
    }
    return null;
  }

  cleanup() {
    // Удаляем объединенный обработчик
    if (this.unifiedEventHandler) {
      document.removeEventListener('click', this.unifiedEventHandler);
    }
    
    this.eventListeners.forEach((listener, element) => {
      element.removeEventListener(listener.event, listener.handler);
    });
    this.eventListeners.clear();
    this.uiCache.clear();
    this.originalButtonTexts.clear();
  }
}

export default UIStateManager;
