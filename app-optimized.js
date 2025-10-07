// Оптимизированная версия основного приложения с модульной архитектурой
import AlgorithmManager from './modules/AlgorithmManager.js';
import KeyManager from './modules/KeyManager.js';
import NotificationManager from './modules/NotificationManager.js';
import EncryptionStepManager from './modules/EncryptionStepManager.js';
import UIStateManager from './modules/UIStateManager.js';
import FileManager from './modules/FileManager.js';
import HistoryManager from './modules/HistoryManager.js';
import EnhancedThemeManager from './modules/EnhancedThemeManager.js';
import LocalizationManager from './modules/LocalizationManager.js';
import ModalManager from './modules/ModalManager.js';
import CryptoUtils from './crypto-utils-optimized.js';

class CoderDecoderApp {
  constructor() {
    try {
      console.log('Initializing CoderDecoderApp...');
      
      // Кэширование DOM элементов
      this.domCache = new Map();
      
      // Инициализация менеджеров
      console.log('Creating AlgorithmManager...');
      this.algorithmManager = new AlgorithmManager();
      
      console.log('Creating KeyManager...');
      this.keyManager = new KeyManager();
      
      console.log('Creating NotificationManager...');
      this.notificationManager = new NotificationManager();
      
      console.log('Creating EncryptionStepManager...');
      this.stepManager = new EncryptionStepManager();
      
      console.log('Creating UIStateManager...');
      this.uiManager = new UIStateManager();
      
      console.log('Creating FileManager...');
      this.fileManager = new FileManager();
      
      console.log('Creating HistoryManager...');
      this.historyManager = new HistoryManager();
      
      console.log('Creating EnhancedThemeManager...');
      this.themeManager = new EnhancedThemeManager();
      
      console.log('Creating LocalizationManager...');
      this.localizationManager = new LocalizationManager();
      
      console.log('Creating ModalManager...');
      this.modalManager = new ModalManager();
      
      // Состояние приложения
      this.multiStepMode = false;
      this.isProcessing = false;
      this.draggedElement = null;
      
      // Кэш для предзагрузки алгоритмов
      this.algorithmCache = new Map();
      
      console.log('All managers created successfully');
      this.init();
      
    } catch (error) {
      console.error('Error initializing CoderDecoderApp:', error);
      throw error;
    }
  }

  init() {
    try {
      console.log('Caching DOM elements...');
      this.cacheDOMElements();
      
      console.log('Setting up event listeners...');
      this.setupEventListeners();
      
      console.log('Updating UI...');
      this.updateUI();
      
      // Скрываем визуализацию при старте
      if (window.VisualizationAPI) {
        console.log('Clearing visualization...');
        window.VisualizationAPI.clear();
      }
      
      // Предзагружаем алгоритмы для многоэтапного шифрования
      this.preloadAlgorithms();
      
      // Загружаем настройки визуализации
      this.loadVisualizationSettings();
      
      console.log('App initialization complete');
    } catch (error) {
      console.error('Error in app init:', error);
      throw error;
    }
  }

  // Кэширование часто используемых DOM элементов
  cacheDOMElements() {
    const elementsToCache = [
      'inputText', 'outputText', 'keyInput', 'keyInfo',
      'encryptBtn', 'decryptBtn', 'generateKeyBtn',
      'loadFileBtn', 'saveFileBtn', 'clearInputBtn',
      'copyResultBtn', 'swapTextBtn', 'themeToggle',
      'aboutBtn', 'addStepBtn', 'clearStepsBtn',
      'clearHistoryBtn', 'stepsContainer', 'keySection',
      'multiStepSection', 'stepsHistory'
    ];

    elementsToCache.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.domCache.set(id, element);
      }
    });
  }

  // Получение кэшированного элемента
  getElement(id) {
    return this.domCache.get(id) || document.getElementById(id);
  }

  // Установка состояния обработки с визуальным индикатором
  setProcessingState(isProcessing) {
    this.isProcessing = isProcessing;
    this.uiManager.setProcessing(isProcessing);
    
    // Добавляем overlay для визуального индикатора
    if (isProcessing) {
      this.showProcessingOverlay();
    } else {
      this.hideProcessingOverlay();
    }
  }

  // Показать overlay обработки
  showProcessingOverlay() {
    let overlay = document.getElementById('processing-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'processing-overlay';
      overlay.className = 'processing-overlay';
      overlay.innerHTML = `
        <div class="processing-spinner">
          <div class="spinner"></div>
          <p>${this.localizationManager.getTranslation('processing-text')}</p>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
  }

  // Скрыть overlay обработки
  hideProcessingOverlay() {
    const overlay = document.getElementById('processing-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  setupEventListeners() {
    // Универсальный обработчик кликов
    this.setupUnifiedClickHandler();
    
    // Остальные события
    this.setupAlgorithmEvents();
    this.setupKeyEvents();
    this.setupTextProcessingEvents();
    this.setupFileEvents();
    this.setupUIEvents();
    this.setupStepEvents();
    this.setupKeyboardShortcuts();
    
    // Делегирование событий
    this.uiManager.setupEventDelegation();
  }

  // Универсальный обработчик кликов
  setupUnifiedClickHandler() {
    document.addEventListener('click', (e) => {
      this.handleUnifiedClick(e);
    });
  }

  // Обработка всех кликов в одном месте
  handleUnifiedClick(e) {
    // Алгоритмы
    const algorithmCard = e.target.closest('.algorithm-card');
    if (algorithmCard) {
      const algorithm = algorithmCard.dataset.algorithm;
      if (algorithm) {
        this.selectAlgorithm(algorithm);
      }
      return;
    }

    // Кнопки с data-action
    const actionButton = e.target.closest('[data-action]');
    if (actionButton) {
      const action = actionButton.dataset.action;
      this.handleAction(action, actionButton);
      return;
    }

    // Обработка модальных окон
    if (e.target.closest('[data-action="close-modal"]')) {
      const modalId = e.target.closest('[data-action="close-modal"]').dataset.modal;
      if (modalId) {
        console.log('Closing modal:', modalId);
        this.modalManager.closeModal(modalId);
      }
      return;
    }

    // Модальные окна - клик вне модального окна
    if (e.target.classList.contains('modal')) {
      const modalId = e.target.id;
      console.log('Clicked on modal:', modalId);
      if (modalId && this.modalManager.isModalOpen(modalId)) {
        console.log('Closing modal by clicking outside');
        this.modalManager.closeModal(modalId);
      }
      return;
    }
  }

  // Обработка действий
  handleAction(action, button) {
    switch (action) {
    case 'encrypt':
      this.processText('encrypt');
      break;
    case 'decrypt':
      this.processText('decrypt');
      break;
    case 'generate-key':
      this.generateKey();
      break;
    case 'load-file':
      this.loadFile();
      break;
    case 'save-file':
      this.saveFile();
      break;
    case 'clear-input':
      this.clearInput();
      break;
    case 'copy-result':
      this.copyResult();
      break;
    case 'swap-text':
      this.swapText();
      break;
    case 'toggle-theme':
      this.themeManager.toggleTheme();
      break;
    case 'about':
      console.log('Opening about modal');
      this.modalManager.openModal('aboutModal');
      break;
    case 'add-step':
      this.addEncryptionStep();
      break;
    case 'clear-steps':
      this.stepManager.clearSteps();
      break;
    case 'clear-history':
      this.historyManager.clearHistory();
      break;
    case 'toggle-visualization':
      this.toggleVisualization(button.checked);
      break;
    case 'close-modal': {
      const modalId = button.dataset.modal;
      if (modalId) {
        console.log('Closing modal:', modalId);
        this.modalManager.closeModal(modalId);
      }
      break;
    }
    default:
      console.warn('Unknown action:', action, 'from button:', button);
    }
  }

  setupAlgorithmEvents() {
    // Слушаем события смены алгоритма
    document.addEventListener('algorithmChanged', (event) => {
      this.handleAlgorithmChange(event.detail);
    });

    document.addEventListener('algorithmSelected', (event) => {
      this.selectAlgorithm(event.detail.algorithm);
    });

    // Клавиатурная навигация для алгоритмов
    document.addEventListener('keydown', (event) => {
      this.handleAlgorithmKeyboardNavigation(event);
    });
  }

  // Обработка клавиатурной навигации для алгоритмов
  handleAlgorithmKeyboardNavigation(e) {
    const algorithmGrid = document.querySelector('.algorithm-grid');
    if (!algorithmGrid || !algorithmGrid.contains(e.target)) {
      return;
    }

    const algorithmCards = Array.from(document.querySelectorAll('.algorithm-card'));
    const currentIndex = algorithmCards.findIndex(card => card === document.activeElement);
    
    if (currentIndex === -1) {
      return;
    }

    let newIndex = currentIndex;

    switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      newIndex = currentIndex > 0 ? currentIndex - 1 : algorithmCards.length - 1;
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      e.preventDefault();
      newIndex = currentIndex < algorithmCards.length - 1 ? currentIndex + 1 : 0;
      break;
    case 'Enter':
    case ' ': {
      e.preventDefault();
      const algorithm = algorithmCards[currentIndex].dataset.algorithm;
      if (algorithm) {
        this.selectAlgorithm(algorithm);
      }
      return;
    }
    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      e.preventDefault();
      newIndex = algorithmCards.length - 1;
      break;
    default:
      return;
    }

    // Обновляем фокус
    algorithmCards[newIndex].focus();
  }

  setupKeyEvents() {
    // Слушаем события изменения ключа
    document.addEventListener('keyChanged', (event) => {
      this.handleKeyChange(event.detail);
    });

    // Обработка ввода ключа
    document.addEventListener('input', (e) => {
      if (e.target.id === 'keyInput') {
        const key = e.target.value;
        const algorithm = this.algorithmManager.getCurrentAlgorithm();
        
        if (this.keyManager.setKey(key, algorithm)) {
          this.keyManager.emitKeyChange(key, algorithm);
        }
      }
    });

    document.addEventListener('focus', (e) => {
      if (e.target.id === 'keyInput') {
        e.target.disabled = false;
      }
    });
  }

  setupTextProcessingEvents() {
    // Слушаем события изменения текста
    document.addEventListener('textChanged', () => {
      this.uiManager.updateCharCounts();
    });
  }

  setupFileEvents() {
    // События файлов обрабатываются в универсальном обработчике
  }

  setupUIEvents() {
    // Слушаем события темы
    document.addEventListener('themeChanged', (event) => {
      const message = event.detail.isDark 
        ? this.localizationManager.getTranslation('notification-theme-dark')
        : this.localizationManager.getTranslation('notification-theme-light');
      this.notificationManager.info(message);
    });

    // Обработка закрытия модального окна при нажатии Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = this.modalManager.getActiveModal();
        if (activeModal) {
          this.modalManager.closeModal(activeModal);
        }
      }
    });
  }

  setupStepEvents() {
    // Слушаем события этапов шифрования
    document.addEventListener('stepAdded', () => {
      const message = this.localizationManager.getTranslation('notification-step-added');
      this.notificationManager.success(message);
    });

    document.addEventListener('stepRemoved', () => {
      const message = this.localizationManager.getTranslation('notification-step-removed');
      this.notificationManager.success(message);
    });

    document.addEventListener('stepsCleared', () => {
      const message = this.localizationManager.getTranslation('notification-steps-cleared');
      this.notificationManager.success(message);
    });

    document.addEventListener('historyCleared', () => {
      const message = this.localizationManager.getTranslation('notification-history-cleared');
      this.notificationManager.success(message);
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
        case 'e':
          e.preventDefault();
          this.processText('encrypt');
          break;
        case 'd':
          e.preventDefault();
          this.processText('decrypt');
          break;
        case 's':
          e.preventDefault();
          this.saveFile();
          break;
        case 'o':
          e.preventDefault();
          this.loadFile();
          break;
        }
      }
    });
  }

  // Обработка смены алгоритма
  selectAlgorithm(algorithm) {
    if (this.algorithmManager.switchAlgorithm(algorithm)) {
      this.handleAlgorithmChange({
        newAlgorithm: algorithm,
        previousAlgorithm: this.algorithmManager.previousAlgorithm,
        algorithmInfo: this.algorithmManager.getAlgorithmInfo(algorithm)
      });
    }
  }

  handleAlgorithmChange(detail) {
    const { newAlgorithm, algorithmInfo } = detail;
    
    // Обновление визуального выбора
    document.querySelectorAll('.algorithm-card').forEach((card) => {
      card.classList.remove('active');
    });
    
    const activeCard = document.querySelector(`[data-algorithm="${newAlgorithm}"]`);
    if (activeCard) {
      activeCard.classList.add('active');
    }

    // Обновление режима многоэтапного шифрования
    this.multiStepMode = newAlgorithm === 'multi';

    // Обновление UI
    this.updateUIForAlgorithm();
    this.updateKeyInfo();

    // Скрытие визуализации
    if (window.VisualizationAPI) {
      window.VisualizationAPI.clear();
    }

    // Управление полем ввода ключа
    this.handleKeyInputForAlgorithm(newAlgorithm);

    // Автогенерация ключа
    if (algorithmInfo.autoGenerate && newAlgorithm !== 'multi') {
      this.generateKey();
    }
  }

  handleKeyInputForAlgorithm(algorithm) {
    const keyInput = document.getElementById('keyInput');
    if (!keyInput) {return;}

    if (algorithm !== 'base64' && algorithm !== 'multi') {
      keyInput.disabled = false;
      keyInput.focus();
    } else if (algorithm === 'base64') {
      keyInput.disabled = true;
      keyInput.value = '';
    }
  }

  updateUIForAlgorithm() {
    // const keySection = document.getElementById('keySection');
    // const multiStepSection = document.getElementById('multiStepSection');
    // const stepsHistory = document.getElementById('stepsHistory');

    if (this.multiStepMode) {
      this.uiManager.hideSection('keySection');
      this.uiManager.showSection('multiStepSection');
      
      const hasHistory = this.stepManager.getHistory().length > 0;
      if (hasHistory) {
        this.uiManager.showSection('stepsHistory');
      } else {
        this.uiManager.hideSection('stepsHistory');
      }
    } else {
      this.uiManager.showSection('keySection');
      this.uiManager.hideSection('multiStepSection');
      this.uiManager.hideSection('stepsHistory');
    }
  }

  updateKeyInfo() {
    const keyInfo = document.getElementById('keyInfo');
    const algorithm = this.algorithmManager.getCurrentAlgorithm();

    if (keyInfo) {
      const info = CryptoUtils.getKeyInfo(algorithm);
      const span = keyInfo.querySelector('span');
      if (span) {
        span.textContent = info;
      }
    }

    this.uiManager.updateKeyInput(algorithm);
    
    // Обновляем кнопку генерации ключа
    const generateKeyBtn = document.getElementById('generateKeyBtn');
    if (generateKeyBtn) {
      generateKeyBtn.disabled = algorithm === 'base64' || algorithm === 'atbash';
    }
  }

  generateKey() {
    const algorithm = this.algorithmManager.getCurrentAlgorithm();
    const generatedKey = this.keyManager.generateKey(algorithm);
    
    if (this.keyManager.setKey(generatedKey, algorithm)) {
      const keyInput = document.getElementById('keyInput');
      if (keyInput) {
        keyInput.value = generatedKey;
        keyInput.disabled = false;
        keyInput.focus();
      }
      this.keyManager.emitKeyChange(generatedKey, algorithm);
    }
  }

  handleKeyChange(detail) {
    const { key, algorithm, isValid } = detail;
    
    if (!isValid) {
      const errorMessage = this.keyManager.getValidationErrorMessage(key, algorithm);
      if (errorMessage) {
        this.notificationManager.warning(errorMessage);
      }
    }
  }

  async processText(operation) {
    const inputText = this.getElement('inputText').value;

    if (!inputText.trim()) {
      this.notificationManager.warning(
        this.localizationManager.getTranslation('error-no-input-text')
      );
      return;
    }

    // Устанавливаем состояние обработки
    this.setProcessingState(true);

    try {
      let result;

      if (this.multiStepMode) {
        result = await this.processMultiStep(inputText, operation);
      } else {
        result = await this.processSingleStep(inputText, operation);
      }

      // Обновляем результат
      const outputText = this.getElement('outputText');
      if (outputText) {
        outputText.value = result;
      }

      this.uiManager.updateCharCounts();

      if (result) {
        const message = this.multiStepMode
          ? this.localizationManager.getTranslation('success-multi-step-processed')
          : this.localizationManager.getTranslation('success-single-step-processed');

        this.notificationManager.success(message);
      } else {
        this.notificationManager.error(
          this.localizationManager.getTranslation('error-text-processing')
        );
      }
    } catch (error) {
      console.error('Ошибка обработки:', error);
      this.notificationManager.error(
        this.localizationManager.getTranslation('error-text-processing-detailed')
      );
    } finally {
      this.setProcessingState(false);
    }
  }

  async processMultiStep(inputText, operation) {
    const steps = this.stepManager.getSteps();
    
    if (steps.length === 0) {
      this.notificationManager.warning(
        this.localizationManager.getTranslation('error-no-encryption-steps')
      );
      return null;
    }

    // Валидация этапов
    const validation = this.stepManager.validateSteps();
    if (!validation.isValid) {
      validation.errors.forEach(() => {
        this.notificationManager.warning(
          this.localizationManager.getTranslation('error-step-validation')
        );
      });
      return null;
    }

    const enableLogging = document.getElementById('enableLogging')?.checked || false;
    const stepsForProcessing = this.stepManager.getStepsForProcessing();

    let result;
    let log = [];

    if (operation === 'encrypt') {
      const resultObj = await CryptoUtils.multiStepEncrypt(
        inputText,
        stepsForProcessing,
        enableLogging
      );
      result = resultObj.result;
      log = resultObj.log;
    } else {
      const resultObj = await CryptoUtils.multiStepDecrypt(
        inputText,
        stepsForProcessing,
        enableLogging
      );
      result = resultObj.result;
      log = resultObj.log;
    }

    // Сохраняем логи в историю
    if (enableLogging && log.length > 0) {
      log.forEach(logEntry => {
        this.historyManager.addEntry(logEntry);
      });
    }

    // Визуализация с оптимизацией
    if (window.VisualizationAPI) {
      this.renderVisualizationWithRAF('multi', operation, inputText, '', result || '');
    }

    return result;
  }

  async processSingleStep(inputText, operation) {
    const algorithm = this.algorithmManager.getCurrentAlgorithm();
    const key = this.keyManager.getKey();

    if (algorithm !== 'base64' && algorithm !== 'atbash' && !String(key || '').trim()) {
      this.notificationManager.warning(
        this.localizationManager.getTranslation('error-no-encryption-key')
      );
      return null;
    }

    // Валидация ключа
    if (!this.keyManager.validateKey(key, algorithm)) {
      const errorMessage = this.keyManager.getValidationErrorMessage(key, algorithm);
      this.notificationManager.error(
        errorMessage || this.localizationManager.getTranslation('error-invalid-key-format')
      );
      return null;
    }

    // Проверяем настройки логирования
    const enableLogging = document.getElementById('enableLoggingSingle')?.checked || false;
    
    let result;
    try {
      if (operation === 'encrypt') {
        result = await CryptoUtils.encrypt(inputText, algorithm, key);
      } else {
        result = await CryptoUtils.decrypt(inputText, algorithm, key);
      }

      // Логирование для одиночного шага
      if (enableLogging) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          operation: operation,
          algorithm: algorithm,
          key: key ? (algorithm === 'aes' ? '[скрыт]' : key) : 'не требуется',
          inputLength: inputText.length,
          outputLength: result.length,
          success: true
        };
        this.historyManager.addEntry(logEntry);
      }

      // Визуализация с оптимизацией
      if (window.VisualizationAPI) {
        this.renderVisualizationWithRAF(algorithm, operation, inputText, key, result || '');
      }

      return result;
    } catch (error) {
      // Показываем ошибку только если это не обычный текст
      this.notificationManager.error(error.message || 'Неизвестная ошибка');
      return null;
    }
  }

  // Методы для работы с этапами
  addEncryptionStep() {
    const step = this.stepManager.addStep();
    this.renderStepElement(step);
  }

  // Добавление нескольких этапов одновременно (оптимизация)
  addMultipleSteps(count = 1) {
    const steps = [];
    for (let i = 0; i < count; i++) {
      steps.push(this.stepManager.addStep());
    }
    
    // Используем document fragment для оптимизации
    const fragment = document.createDocumentFragment();
    steps.forEach(step => {
      const stepElement = this.createStepElement(step);
      fragment.appendChild(stepElement);
    });
    
    const stepsContainer = this.getElement('stepsContainer');
    if (stepsContainer) {
      stepsContainer.appendChild(fragment);
    }
    
    // Обновляем номера шагов
    this.updateStepNumbers();
  }

  renderStepElement(step) {
    const stepElement = this.createStepElement(step);
    const stepsContainer = this.getElement('stepsContainer');
    if (stepsContainer) {
      stepsContainer.appendChild(stepElement);
    }
    this.bindStepEvents(stepElement);
    this.setupDragAndDrop(stepElement);
  }

  createStepElement(step) {
    const stepNumber = this.stepManager.getSteps().length;
    const stepElement = document.createElement('div');
    stepElement.className = 'step-item';
    stepElement.id = step.id;
    stepElement.draggable = true;
    stepElement.innerHTML = `
      <div class="step-drag-handle" title="Перетащить для изменения порядка">
        <i class="fas fa-grip-vertical"></i>
      </div>
      <div class="step-number">${stepNumber}</div>
      <div class="step-content">
        <select class="step-algorithm" data-step-algorithm>
          <option value="caesar">Шифр Цезаря</option>
          <option value="reverseCaesar">Обратный Цезарь</option>
          <option value="vigenere">Шифр Виженера</option>
          <option value="atbash">Атбаш</option>
          <option value="base64">Base64</option>
          <option value="aes">AES-256</option>
        </select>
        <input type="text" class="step-key" placeholder="Введите ключ..." data-step-key>
        <button class="btn btn-icon" title="Сгенерировать ключ" data-generate-step-key>
          <i class="fas fa-dice"></i>
        </button>
      </div>
      <div class="step-actions">
        <button class="btn btn-icon btn-danger" title="Удалить этап" data-remove-step>
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    
    // Устанавливаем значения из объекта step
    const algorithmSelect = stepElement.querySelector('[data-step-algorithm]');
    const keyInput = stepElement.querySelector('[data-step-key]');
    
    if (algorithmSelect && step.algorithm) {
      algorithmSelect.value = step.algorithm;
    }
    
    if (keyInput && step.key !== undefined) {
      keyInput.value = step.key || '';
    }
    
    return stepElement;
  }

  bindStepEvents(stepElement) {
    const algorithmSelect = stepElement.querySelector('[data-step-algorithm]');
    const keyInput = stepElement.querySelector('[data-step-key]');
    const generateBtn = stepElement.querySelector('[data-generate-step-key]');
    const removeBtn = stepElement.querySelector('[data-remove-step]');

    algorithmSelect.addEventListener('change', (e) => {
      const algorithm = e.target.value;
      this.stepManager.updateStep(stepElement.id, { algorithm });
      this.updateStepKeyPlaceholder(keyInput, algorithm);
    });

    keyInput.addEventListener('input', (e) => {
      const key = e.target.value;
      this.stepManager.updateStep(stepElement.id, { key });
    });

    generateBtn.addEventListener('click', () => {
      const algorithm = algorithmSelect.value;
      const generatedKey = this.keyManager.generateKey(algorithm);
      keyInput.value = generatedKey;
      this.stepManager.updateStep(stepElement.id, { key: generatedKey });
    });

    removeBtn.addEventListener('click', () => {
      this.stepManager.removeStep(stepElement.id);
      stepElement.remove();
      this.updateStepNumbers();
    });

    // Инициализируем placeholder
    this.updateStepKeyPlaceholder(keyInput, algorithmSelect.value);
  }

  updateStepKeyPlaceholder(keyInput, algorithm) {
    const placeholders = {
      caesar: 'Введите число от 1 до 33...',
      reverseCaesar: 'Введите число от 1 до 33...',
      vigenere: 'Введите ключевое слово...',
      atbash: 'Атбаш не требует ключа',
      base64: 'Base64 не требует ключа',
      aes: 'Введите пароль...',
    };

    keyInput.placeholder = placeholders[algorithm] || 'Введите ключ...';
    keyInput.disabled = algorithm === 'base64' || algorithm === 'atbash';
    keyInput.readOnly = algorithm === 'base64' || algorithm === 'atbash';
  }

  updateStepNumbers() {
    const stepElements = document.querySelectorAll('.step-item');
    stepElements.forEach((element, index) => {
      const stepNumber = element.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.textContent = index + 1;
      }
    });
  }

  // Полный перерендер этапов (для отладки)
  rerenderSteps() {
    const stepsContainer = this.getElement('stepsContainer');
    if (!stepsContainer) return;

    // Очищаем контейнер
    stepsContainer.innerHTML = '';

    // Получаем актуальный порядок этапов из менеджера
    const steps = this.stepManager.getSteps();
    
    // Рендерим этапы в правильном порядке
    steps.forEach((step, index) => {
      const stepElement = this.createStepElement(step);
      // Обновляем номер этапа
      const stepNumber = stepElement.querySelector('.step-number');
      if (stepNumber) {
        stepNumber.textContent = index + 1;
      }
      stepsContainer.appendChild(stepElement);
      this.bindStepEvents(stepElement);
      this.setupDragAndDrop(stepElement);
    });
  }

  // Настройка drag&drop для шагов
  setupDragAndDrop(stepElement) {
    stepElement.addEventListener('dragstart', (e) => {
      this.draggedElement = stepElement;
      stepElement.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', stepElement.id);
      console.log('Начато перетаскивание этапа:', stepElement.id);
    });

    stepElement.addEventListener('dragend', (e) => {
      stepElement.classList.remove('dragging');
      console.log('Завершено перетаскивание этапа:', stepElement.id);
      this.draggedElement = null;
    });

    stepElement.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    stepElement.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (stepElement !== this.draggedElement) {
        stepElement.classList.add('drag-over');
        console.log('Наведение на этап:', stepElement.id);
      }
    });

    stepElement.addEventListener('dragleave', (e) => {
      // Проверяем, что мы действительно покинули элемент
      if (!stepElement.contains(e.relatedTarget)) {
        stepElement.classList.remove('drag-over');
      }
    });

    stepElement.addEventListener('drop', (e) => {
      e.preventDefault();
      stepElement.classList.remove('drag-over');
      
      console.log('Drop на этап:', stepElement.id, 'от этапа:', this.draggedElement?.id);
      
      if (this.draggedElement && stepElement !== this.draggedElement) {
        this.reorderSteps(this.draggedElement, stepElement);
      }
    });
  }

  // Переупорядочивание шагов
  reorderSteps(draggedElement, targetElement) {
    console.log('reorderSteps вызван для:', draggedElement?.id, '->', targetElement?.id);
    
    const stepsContainer = this.getElement('stepsContainer');
    if (!stepsContainer) {
      console.error('Контейнер этапов не найден');
      return;
    }

    const allSteps = Array.from(stepsContainer.querySelectorAll('.step-item'));
    const draggedIndex = allSteps.indexOf(draggedElement);
    const targetIndex = allSteps.indexOf(targetElement);

    console.log('Индексы:', draggedIndex, '->', targetIndex);

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      console.log('Некорректные индексы или одинаковые элементы');
      return;
    }

    // Сначала обновляем порядок в менеджере шагов
    const success = this.stepManager.reorderSteps(draggedIndex, targetIndex);
    
    if (!success) {
      console.warn('Не удалось переупорядочить шаги в менеджере');
      return;
    }

    // Выполняем полный перерендер для гарантии правильного порядка
    console.log('Выполняем полный перерендер этапов');
    this.rerenderSteps();
    
    // Уведомляем пользователя
    this.notificationManager.success(
      this.localizationManager.getTranslation('success-steps-reordered')
    );
  }

  // Методы для работы с файлами
  async loadFile() {
    try {
      const result = await this.fileManager.loadFile();

      if (result.success) {
        const inputText = this.getElement('inputText');
        if (inputText) {
          inputText.value = result.content;
        }
        this.uiManager.updateCharCounts();
        this.notificationManager.success(
          this.localizationManager.getTranslation('success-file-loaded')
        );
      } else if (result.cancelled) {
        // Пользователь отменил загрузку - это нормальное поведение, не показываем ошибку
        console.log('Загрузка файла отменена пользователем');
      } else {
        // Реальная ошибка загрузки
        this.notificationManager.error(
          this.localizationManager.getTranslation('error-file-load')
        );
      }
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      this.notificationManager.error(
        this.localizationManager.getTranslation('error-file-load-detailed')
      );
    }
  }

  async saveFile() {
    const outputText = this.getElement('outputText');

    if (!outputText || !outputText.value.trim()) {
      this.notificationManager.warning(
        this.localizationManager.getTranslation('error-no-result-to-save')
      );
      return;
    }

    try {
      let contentToSave = outputText.value;
      let filename = 'encrypted_text.txt';

      // Проверяем, нужно ли сохранять метаданные
      const saveMetadata = this.multiStepMode 
        ? document.getElementById('saveMetadata')?.checked
        : document.getElementById('saveMetadataSingle')?.checked;

      if (saveMetadata) {
        if (this.multiStepMode && this.stepManager.getSteps().length > 0) {
          contentToSave = this.createMetadataContent();
          filename = `encrypted_with_metadata_${new Date().toISOString().split('T')[0]}.txt`;
        } else if (!this.multiStepMode) {
          // Создаем метаданные для одиночного алгоритма
          const algorithm = this.algorithmManager.getCurrentAlgorithm();
          const key = this.keyManager.getKey();
          const inputText = this.getElement('inputText')?.value || '';
          
          contentToSave = this.createSingleStepMetadataContent(algorithm, key, inputText, outputText.value);
          filename = `${algorithm}_with_metadata_${new Date().toISOString().split('T')[0]}.txt`;
        }
      }

      const result = await this.fileManager.saveFile(contentToSave, filename);

      if (result.success) {
        const message = saveMetadata && this.multiStepMode
          ? this.localizationManager.getTranslation('success-file-with-metadata-saved')
          : this.localizationManager.getTranslation('success-file-saved');
        this.notificationManager.success(message);
      } else if (result.cancelled) {
        // Пользователь отменил сохранение - это нормальное поведение, не показываем ошибку
        console.log('Сохранение файла отменено пользователем');
      } else {
        // Реальная ошибка сохранения
        this.notificationManager.error(
          this.localizationManager.getTranslation('error-file-save-detailed')
        );
      }
    } catch (error) {
      console.error('Ошибка сохранения файла:', error);
      this.notificationManager.error(
        this.localizationManager.getTranslation('error-file-save-detailed')
      );
    }
  }

  createMetadataContent() {
    const steps = this.stepManager.getSteps();
    const history = this.historyManager.getFilteredHistory();
    const inputText = document.getElementById('inputText')?.value || '';
    const outputText = document.getElementById('outputText')?.value || '';

    return this.fileManager.createMetadataFile(
      steps.map(s => ({ algorithm: s.algorithm, key: s.key })),
      history,
      inputText,
      outputText
    );
  }

  // Создание метаданных для одиночного алгоритма
  createSingleStepMetadataContent(algorithm, key, inputText, outputText) {
    const timestamp = new Date().toISOString();
    const algorithmNames = {
      caesar: 'Шифр Цезаря',
      vigenere: 'Шифр Виженера',
      aes: 'AES-256',
      base64: 'Base64'
    };

    return `=== МЕТАДАННЫЕ ШИФРОВАНИЯ ===
Дата: ${new Date(timestamp).toLocaleString('ru-RU')}
Алгоритм: ${algorithmNames[algorithm] || algorithm}
Ключ: ${key ? (algorithm === 'aes' ? '[скрыт]' : key) : 'не требуется'}
Длина входного текста: ${inputText.length} символов
Длина результата: ${outputText.length} символов

=== РЕЗУЛЬТАТ ===
${outputText}

=== ИСХОДНЫЙ ТЕКСТ ===
${inputText}
`;
  }

  // Вспомогательные методы
  clearInput() {
    const inputText = this.getElement('inputText');
    const outputText = this.getElement('outputText');
    
    if (inputText) {inputText.value = '';}
    if (outputText) {outputText.value = '';}
    
    this.uiManager.updateCharCounts();
    this.notificationManager.success(
      this.localizationManager.getTranslation('success-text-cleared')
    );
  }

  swapText() {
    const inputText = this.getElement('inputText');
    const outputText = this.getElement('outputText');

    if (inputText && outputText) {
      const tempText = inputText.value;
      inputText.value = outputText.value;
      outputText.value = tempText;
      this.uiManager.updateCharCounts();
      this.notificationManager.success(
        this.localizationManager.getTranslation('success-text-swapped')
      );
    }
  }

  async copyResult() {
    const outputText = this.getElement('outputText');

    if (!outputText || !outputText.value.trim()) {
      this.notificationManager.warning(
        this.localizationManager.getTranslation('error-no-result-to-copy')
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText.value);
      this.notificationManager.success(
        this.localizationManager.getTranslation('success-result-copied')
      );
    } catch (error) {
      console.error('Ошибка копирования:', error);
      this.notificationManager.error(
        this.localizationManager.getTranslation('error-copy-failed')
      );
    }
  }

  toggleTheme() {
    this.themeManager.toggleTheme();
  }

  loadTheme() {
    // Тема загружается автоматически в ThemeManager
  }

  updateUI() {
    this.updateKeyInfo();
    this.updateUIForAlgorithm();
    this.uiManager.updateCharCounts();
  }

  // Асинхронная предзагрузка алгоритмов для многоэтапного шифрования
  async preloadAlgorithms() {
    const algorithms = ['caesar', 'vigenere', 'aes', 'base64'];
    
    try {
      const preloadPromises = algorithms.map(async (algorithm) => {
        if (!this.algorithmCache.has(algorithm)) {
          // Предзагружаем ключи для алгоритма
          const key = this.keyManager.generateKey(algorithm);
          this.algorithmCache.set(algorithm, {
            key,
            timestamp: Date.now(),
            preloaded: true
          });
        }
      });
      
      await Promise.all(preloadPromises);
      console.log('Алгоритмы предзагружены для многоэтапного шифрования');
    } catch (error) {
      console.warn('Ошибка предзагрузки алгоритмов:', error);
    }
  }

  // Получение предзагруженного ключа для алгоритма
  getPreloadedKey(algorithm) {
    const cached = this.algorithmCache.get(algorithm);
    if (cached && cached.preloaded) {
      return cached.key;
    }
    return null;
  }

  // Оптимизированная визуализация с requestAnimationFrame
  renderVisualizationWithRAF(algorithm, operation, inputText, key, result) {
    // Проверяем, включена ли визуализация
    const visualizationEnabled = localStorage.getItem('visualizationEnabled') !== 'false';
    
    if (!visualizationEnabled || !window.VisualizationAPI) {
      return;
    }
    
    // Для больших текстов используем requestAnimationFrame
    if (inputText.length > 1000 || result.length > 1000) {
      requestAnimationFrame(() => {
        window.VisualizationAPI.render(algorithm, operation, inputText, key, result);
      });
    } else {
      // Для небольших текстов рендерим сразу
      window.VisualizationAPI.render(algorithm, operation, inputText, key, result);
    }
  }

  // Очистка ресурсов
  // Переключение видимости визуализации
  toggleVisualization(visible) {
    // Сохраняем настройку в localStorage
    localStorage.setItem('visualizationEnabled', visible.toString());
    
    // Синхронизируем оба переключателя
    const multiStepToggle = document.getElementById('enableVisualization');
    const singleStepToggle = document.getElementById('enableVisualizationSingle');
    
    if (multiStepToggle) {
      multiStepToggle.checked = visible;
    }
    
    if (singleStepToggle) {
      singleStepToggle.checked = visible;
    }
    
    // Обновляем видимость
    this.updateVisualizationVisibility(visible);
    
    // Уведомляем пользователя
    const message = visible 
      ? this.localizationManager.getTranslation('visualization-enabled')
      : this.localizationManager.getTranslation('visualization-disabled');
    
    this.notificationManager.info(message);
  }

  // Загрузка настроек визуализации при инициализации
  loadVisualizationSettings() {
    const visualizationEnabled = localStorage.getItem('visualizationEnabled');
    const enabled = visualizationEnabled !== null ? visualizationEnabled === 'true' : true;
    
    // Обновляем оба переключателя
    const multiStepToggle = document.getElementById('enableVisualization');
    const singleStepToggle = document.getElementById('enableVisualizationSingle');
    
    if (multiStepToggle) {
      multiStepToggle.checked = enabled;
    }
    
    if (singleStepToggle) {
      singleStepToggle.checked = enabled;
    }
    
    // Применяем настройку
    this.updateVisualizationVisibility(enabled);
  }

  // Обновление видимости визуализации
  updateVisualizationVisibility(enabled) {
    const visualizationSection = document.querySelector('.visualization-section');
    
    if (visualizationSection) {
      if (enabled) {
        visualizationSection.classList.add('show');
        visualizationSection.style.display = 'block';
      } else {
        visualizationSection.classList.remove('show');
        visualizationSection.style.display = 'none';
      }
    }
    
    // Очищаем визуализацию если отключена
    if (!enabled && window.VisualizationAPI) {
      window.VisualizationAPI.clear();
    }
  }

  cleanup() {
    this.uiManager.cleanup();
    this.themeManager.clearCache();
    this.modalManager.cleanup();
    this.algorithmCache.clear();
    this.domCache.clear();
  }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CoderDecoderApp();
});

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
  if (window.app) {
    window.app.cleanup();
  }
});
