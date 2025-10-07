// Модуль для управления модальными окнами с предотвращением множественных открытий
class ModalManager {
  constructor(options = {}) {
    this.activeModals = new Set();
    this.modalStack = [];
    this.focusableElements = [
      'button', 'input', 'textarea', 'select', 'a[href]', 
      '[tabindex]:not([tabindex="-1"])'
    ];
    this.previousActiveElement = null;
    
    // Конфигурация
    this.config = {
      enableScrollLockCounter: options.enableScrollLockCounter !== false, // Счётчик блокировок скролла
      enableOptimizedAnimations: options.enableOptimizedAnimations !== false, // Оптимизированные анимации
      enableEnhancedVisibilityCheck: options.enableEnhancedVisibilityCheck !== false // Улучшенная проверка видимости
    };
    
    // Счётчик блокировок скролла
    this.scrollLockCounter = 0;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupKeyboardNavigation();
  }

  // Настройка слушателей событий
  setupEventListeners() {
    // Обработка кликов вне модального окна
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        this.closeModal(e.target.id);
      }
    });

    // Обработка нажатия Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        const topModal = this.modalStack[this.modalStack.length - 1];
        if (topModal) {
          this.closeModal(topModal);
        }
      }
    });

    // Предотвращение потери фокуса
    document.addEventListener('focusin', (e) => {
      if (this.activeModals.size > 0) {
        const activeModalId = this.modalStack[this.modalStack.length - 1];
        const activeModal = document.getElementById(activeModalId);
        if (activeModal && !activeModal.contains(e.target)) {
          e.preventDefault();
          this.focusFirstElement(activeModal);
        }
      }
    });
  }

  // Настройка клавиатурной навигации
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (this.activeModals.size > 0) {
        const activeModal = this.modalStack[this.modalStack.length - 1];
        if (activeModal) {
          this.handleKeyboardNavigation(e, activeModal);
        }
      }
    });
  }

  // Открытие модального окна
  openModal(modalId, options = {}) {
    console.log(`Opening modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with id "${modalId}" not found`);
      return false;
    }

    // Проверяем, не открыто ли уже это модальное окно
    if (this.activeModals.has(modalId)) {
      console.warn(`Modal "${modalId}" is already open`);
      return false;
    }

    // Сохраняем текущий активный элемент
    this.previousActiveElement = document.activeElement;

    // Добавляем модальное окно в активные
    this.activeModals.add(modalId);
    this.modalStack.push(modalId);

    // Показываем модальное окно
    modal.style.display = 'flex';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');

    // Блокируем скролл body (с счётчиком)
    this._lockScroll();

    // Фокусируемся на первом элементе
    setTimeout(() => {
      this.focusFirstElement(modal);
    }, 100);

    // Эмитируем событие
    this.emitModalEvent('opened', modalId, options);

    return true;
  }

  // Закрытие модального окна
  closeModal(modalId, options = {}) {
    console.log(`Closing modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with id "${modalId}" not found`);
      return false;
    }

    // Проверяем, открыто ли модальное окно
    if (!this.activeModals.has(modalId)) {
      console.warn(`Modal "${modalId}" is not open, forcing close`);
      // Принудительно закрываем модальное окно
      this.forceCloseModal(modalId);
      return true;
    }

    // Удаляем из активных модальных окон
    this.activeModals.delete(modalId);
    this.modalStack = this.modalStack.filter(id => id !== modalId);

    // Скрываем модальное окно
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');

    // Восстанавливаем скролл body (с счётчиком)
    this._unlockScroll();

    // Возвращаем фокус
    setTimeout(() => {
      if (this.previousActiveElement && this.previousActiveElement.focus) {
        this.previousActiveElement.focus();
      }
    }, 100);

    // Эмитируем событие
    this.emitModalEvent('closed', modalId, options);

    return true;
  }

  // Переключение модального окна
  toggleModal(modalId, options = {}) {
    if (this.activeModals.has(modalId)) {
      return this.closeModal(modalId, options);
    } else {
      return this.openModal(modalId, options);
    }
  }

  // Закрытие всех модальных окон
  closeAllModals() {
    const modalsToClose = [...this.activeModals];
    modalsToClose.forEach(modalId => {
      this.closeModal(modalId);
    });
  }

  // Фокусировка на первом доступном элементе (с улучшенной проверкой видимости)
  focusFirstElement(modal) {
    const focusableElements = modal.querySelectorAll(this.focusableElements.join(', '));
    const firstElement = Array.from(focusableElements).find(element => 
      this._isElementFocusable(element)
    );

    if (firstElement) {
      if (this.config.enableOptimizedAnimations) {
        // Используем requestAnimationFrame для точности
        requestAnimationFrame(() => {
          firstElement.focus();
        });
      } else {
        firstElement.focus();
      }
    }
  }

  // Улучшенная проверка фокусируемости элемента
  _isElementFocusable(element) {
    if (element.disabled || element.hidden) {
      return false;
    }

    if (this.config.enableEnhancedVisibilityCheck) {
      // Проверяем offsetParent и visibility
      const computedStyle = window.getComputedStyle(element);
      return element.offsetParent !== null && 
             computedStyle.visibility !== 'hidden' &&
             computedStyle.display !== 'none';
    } else {
      // Базовая проверка
      return element.offsetParent !== null;
    }
  }

  // Обработка клавиатурной навигации
  handleKeyboardNavigation(e, modal) {
    const focusableElements = Array.from(modal.querySelectorAll(this.focusableElements.join(', ')))
      .filter(element => !element.disabled && !element.hidden && element.offsetParent !== null);

    if (focusableElements.length === 0) {return;}

    const currentIndex = focusableElements.indexOf(document.activeElement);

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab - назад
        if (currentIndex <= 0) {
          e.preventDefault();
          focusableElements[focusableElements.length - 1].focus();
        }
      } else {
        // Tab - вперед
        if (currentIndex >= focusableElements.length - 1) {
          e.preventDefault();
          focusableElements[0].focus();
        }
      }
    }
  }

  // Получение активных модальных окон
  getActiveModals() {
    return [...this.activeModals];
  }

  // Получение последнего активного модального окна
  getActiveModal() {
    if (this.modalStack.length > 0) {
      return this.modalStack[this.modalStack.length - 1];
    }
    return null;
  }

  // Получение стека модальных окон
  getModalStack() {
    return [...this.modalStack];
  }

  // Проверка, открыто ли модальное окно
  isModalOpen(modalId) {
    return this.activeModals.has(modalId);
  }

  // Создание модального окна программно
  createModal(id, content, options = {}) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.innerHTML = content;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Добавляем обработчики событий
    this.setupModalEvents(modal, options);

    return modal;
  }

  // Настройка событий для модального окна
  setupModalEvents(modal, options) {
    // Обработка клика по кнопке закрытия
    const closeButtons = modal.querySelectorAll('[data-modal-close]');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.closeModal(modal.id);
      });
    });

    // Обработка клика по фону
    if (options.closeOnBackdrop !== false) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    }
  }

  // Эмиссия событий модального окна
  emitModalEvent(eventType, modalId, data = {}) {
    const event = new CustomEvent(`modal${eventType}`, {
      detail: {
        modalId,
        ...data
      }
    });
    document.dispatchEvent(event);
  }

  // Получение статистики модальных окон
  getModalStats() {
    return {
      activeModals: this.activeModals.size,
      modalStack: this.modalStack.length,
      activeModalIds: [...this.activeModals],
      stackOrder: [...this.modalStack]
    };
  }

  // Анимация открытия модального окна
  animateModal(modal, animationType = 'fadeIn') {
    const animations = {
      fadeIn: 'modal-fade-in',
      slideIn: 'modal-slide-in',
      scaleIn: 'modal-scale-in'
    };

    const animationClass = animations[animationType] || animations.fadeIn;
    
    modal.classList.add(animationClass);
    
    // Удаляем класс анимации после завершения
    modal.addEventListener('animationend', () => {
      modal.classList.remove(animationClass);
    }, { once: true });
  }

  // Очистка ресурсов
  cleanup() {
    this.closeAllModals();
    this.activeModals.clear();
    this.modalStack = [];
    this.previousActiveElement = null;
  }

  // Принудительное закрытие модального окна (без проверки состояния)
  forceCloseModal(modalId) {
    console.log(`Force closing modal: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
      console.log('Modal element found, closing...');
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      
      // Восстанавливаем скролл body (с счётчиком)
      this._unlockScroll();
      
      // Возвращаем фокус
      if (this.previousActiveElement) {
        this.previousActiveElement.focus();
      }
    } else {
      console.error(`Modal element not found: ${modalId}`);
    }
    
    // Очищаем состояние
    this.activeModals.delete(modalId);
    this.modalStack = this.modalStack.filter(id => id !== modalId);
    console.log(`Modal ${modalId} force closed`);
  }

  // Блокировка скролла с счётчиком
  _lockScroll() {
    if (this.config.enableScrollLockCounter) {
      this.scrollLockCounter++;
      if (this.scrollLockCounter === 1) {
        document.body.style.overflow = 'hidden';
      }
    } else {
      document.body.style.overflow = 'hidden';
    }
  }

  // Разблокировка скролла с счётчиком
  _unlockScroll() {
    if (this.config.enableScrollLockCounter) {
      this.scrollLockCounter = Math.max(0, this.scrollLockCounter - 1);
      if (this.scrollLockCounter === 0) {
        document.body.style.overflow = '';
      }
    } else {
      if (this.activeModals.size === 0) {
        document.body.style.overflow = '';
      }
    }
  }

  // Оптимизированная анимация модального окна
  _animateModal(modal, animationName = 'modalFadeIn') {
    if (this.config.enableOptimizedAnimations) {
      // Используем inline animationName для гибкости
      modal.style.animationName = animationName;
      modal.style.animationDuration = '0.3s';
      modal.style.animationFillMode = 'forwards';
    } else {
      // Стандартные CSS классы
      modal.classList.add('show');
    }
  }
}

export default ModalManager;
