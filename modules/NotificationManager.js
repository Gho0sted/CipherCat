// Модуль для управления уведомлениями
class NotificationManager {
  constructor(options = {}) {
    this.activeNotifications = new Set();
    this.notificationQueue = [];
    
    // Конфигурация
    this.config = {
      maxNotifications: options.maxNotifications || 5,
      defaultTimeout: options.defaultTimeout || 3000,
      enableCallbacks: options.enableCallbacks !== false, // Коллбеки onShow/onClose
      enableCSSClasses: options.enableCSSClasses !== false, // CSS классы вместо inline стилей
      enableResponsiveDesign: options.enableResponsiveDesign !== false // Адаптивный дизайн
    };
    
    // Хранилище таймеров для уведомлений
    this.notificationTimers = new Map();
  }

  // Показать уведомление
  show(message, type = 'info', options = {}) {
    const notification = this.createNotification(message, type, options);
    
    if (this.activeNotifications.size >= this.config.maxNotifications) {
      // Если достигнут лимит, добавляем в очередь
      this.notificationQueue.push(notification);
      return notification;
    }

    this.displayNotification(notification, options);
    return notification;
  }

  // Создать элемент уведомления
  createNotification(message, type, options) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `;

    // Добавляем обработчики событий
    this.bindNotificationEvents(notification, options);

    // Устанавливаем стили
    this.applyNotificationStyles(notification, type);

    return notification;
  }

  // Привязать события к уведомлению
  bindNotificationEvents(notification, options) {
    const closeButton = notification.querySelector('.notification-close');
    
    // Закрытие по кнопке
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(notification);
    });

    // Закрытие по клику на уведомление
    notification.addEventListener('click', () => {
      if (options.clickToClose !== false) {
        this.remove(notification);
      }
    });

    // Автоматическое закрытие (с сохранением таймера)
    if (options.timeout !== 0) {
      const timeout = options.timeout || this.config.defaultTimeout;
      const timerId = setTimeout(() => {
        this.remove(notification);
      }, timeout);
      
      // Сохраняем ID таймера для возможности очистки
      this.notificationTimers.set(notification, timerId);
    }
  }

  // Применить стили к уведомлению (с поддержкой CSS классов)
  applyNotificationStyles(notification, type) {
    const topOffset = 20 + this.activeNotifications.size * 70;
    
    if (this.config.enableCSSClasses) {
      // Используем CSS классы
      notification.classList.add('notification-styled', `notification-${type}`);
      notification.style.top = `${topOffset}px`;
      notification.style.right = '20px';
      notification.style.zIndex = '1001';
      
      // Адаптивный дизайн
      if (this.config.enableResponsiveDesign) {
        this._applyResponsiveStyles(notification);
      }
    } else {
      // CSS классы вместо inline стилей
      notification.className = `notification notification-${type}`;
      notification.style.top = `${topOffset}px`;
      notification.style.zIndex = '1001';
    }
  }

  // Применение адаптивных стилей
  _applyResponsiveStyles(notification) {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    
    if (mediaQuery.matches) {
      // Мобильные устройства
      notification.style.maxWidth = 'calc(100vw - 40px)';
      notification.style.right = '20px';
      notification.style.left = '20px';
      notification.style.width = 'auto';
    } else {
      // Десктоп
      notification.style.maxWidth = '400px';
      notification.style.right = '20px';
      notification.style.left = 'auto';
    }
  }

  // Отобразить уведомление (с коллбеками)
  displayNotification(notification, options = {}) {
    document.body.appendChild(notification);
    this.activeNotifications.add(notification);
    this.updateNotificationPositions();
    
    // Вызываем коллбек onShow если включен
    if (this.config.enableCallbacks && options.onShow) {
      options.onShow(notification);
    }
  }

  // Удалить уведомление (с очисткой таймеров)
  remove(notification, options = {}) {
    if (!notification || !notification.parentNode) {
      return;
    }

    // Очищаем таймер автоудаления если он есть
    const timerId = this.notificationTimers.get(notification);
    if (timerId) {
      clearTimeout(timerId);
      this.notificationTimers.delete(notification);
    }

    // Вызываем коллбек onClose если включен
    if (this.config.enableCallbacks && options.onClose) {
      options.onClose(notification);
    }

    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.activeNotifications.delete(notification);
      this.updateNotificationPositions();
      this.processQueue();
    }, 300);
  }

  // Обновить позиции уведомлений
  updateNotificationPositions() {
    let index = 0;
    this.activeNotifications.forEach((notification) => {
      if (notification && notification.parentNode) {
        const topOffset = 20 + index * 70;
        notification.style.transition = 'top 0.3s ease-out';
        notification.style.top = `${topOffset}px`;
        index++;
      }
    });
  }

  // Обработать очередь уведомлений
  processQueue() {
    if (this.notificationQueue.length > 0 && this.activeNotifications.size < this.config.maxNotifications) {
      const notification = this.notificationQueue.shift();
      this.displayNotification(notification);
    }
  }

  // Получить иконку для типа уведомления
  getNotificationIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  // Получить цвет для типа уведомления
  getColorForType(type) {
    const colors = {
      success: 'success',
      error: 'error', 
      warning: 'warning',
      info: 'primary'
    };
    return colors[type] || 'primary';
  }

  // Уведомления по типам
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { timeout: 5000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', { timeout: 4000, ...options });
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Очистить все уведомления определенного типа
  clearByType(type) {
    this.activeNotifications.forEach((notification) => {
      if (notification.classList.contains(`notification-${type}`)) {
        this.remove(notification);
      }
    });
  }

  // Очистить все уведомления
  clearAll() {
    this.activeNotifications.forEach((notification) => {
      this.remove(notification);
    });
    this.notificationQueue = [];
  }

  // Получить количество активных уведомлений
  getActiveCount() {
    return this.activeNotifications.size;
  }

  // Получить количество уведомлений в очереди
  getQueueCount() {
    return this.notificationQueue.length;
  }

  // Очистить все таймеры
  clearAllTimers() {
    this.notificationTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.notificationTimers.clear();
  }

  // Очистка ресурсов
  cleanup() {
    this.clearAll();
    this.clearAllTimers();
  }
}

export default NotificationManager;
