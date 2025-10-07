const { contextBridge, ipcRenderer } = require('electron');

// Конфигурация безопасности
const SecurityConfig = {
  // Уровни логирования
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },
  
  // Проверка режима разработки
  isDevelopment: () => {
    try {
      return process.env.NODE_ENV === 'development' || 
             process.argv.includes('--dev') ||
             !process.env.NODE_ENV;
    } catch (error) {
      return false;
    }
  },
  
  // Ограничения безопасности
  RESTRICTED_OBJECTS: [
    'require', 'exports', 'module', '__dirname', '__filename',
    'process', 'global', 'Buffer', 'setImmediate', 'clearImmediate',
    'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'
  ],
  
  // Дополнительные ограничения для продакшн
  PRODUCTION_RESTRICTIONS: [
    'localStorage', 'sessionStorage', 'indexedDB', 'webkitStorageInfo',
    'webkitRequestFileSystem', 'webkitResolveLocalFileSystemURL'
  ]
};

// Система логирования
class LoggingSystem {
  constructor() {
    this.isDev = SecurityConfig.isDevelopment();
    this.logLevel = this.isDev ? SecurityConfig.LOG_LEVELS.DEBUG : SecurityConfig.LOG_LEVELS.ERROR;
  }

  log(level, message, data = null) {
    const levels = SecurityConfig.LOG_LEVELS;
    const levelPriority = {
      [levels.ERROR]: 0,
      [levels.WARN]: 1,
      [levels.INFO]: 2,
      [levels.DEBUG]: 3
    };

    const currentPriority = levelPriority[this.logLevel] || 0;
    const messagePriority = levelPriority[level] || 0;

    if (messagePriority <= currentPriority) {
      if (this.isDev) {
        console[level](`[CipherCat] ${message}`, data || '');
      } else {
        this.sendToLoggingService(level, message, data);
      }
    }
  }

  error(message, data = null) {
    this.log(SecurityConfig.LOG_LEVELS.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(SecurityConfig.LOG_LEVELS.WARN, message, data);
  }

  info(message, data = null) {
    this.log(SecurityConfig.LOG_LEVELS.INFO, message, data);
  }

  debug(message, data = null) {
    this.log(SecurityConfig.LOG_LEVELS.DEBUG, message, data);
  }

  sendToLoggingService(level, message) {
    // В продакшн режиме можно отправлять логи на сервер
    // или сохранять в файл для анализа
    try {
      // Пример отправки на сервер (закомментировано для безопасности)
      // fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ level, message, data, timestamp: Date.now() })
      // });
      
      // Пока просто логируем в консоль с ограниченной информацией
      if (level === SecurityConfig.LOG_LEVELS.ERROR) {
        console.error(`[CipherCat] ${message}`);
      }
    } catch (error) {
      // Не логируем ошибки логирования, чтобы избежать рекурсии
    }
  }
}

// Инициализация системы логирования
const logger = new LoggingSystem();

// Обработчик ошибок IPC
class IPCErrorHandler {
  static async handleIPC(callName, ipcCall, ...args) {
    try {
      logger.debug(`IPC call: ${callName}`, { args: args.length });
      const result = await ipcCall(...args);
      logger.debug(`IPC success: ${callName}`, { success: result?.success });
      return result;
    } catch (error) {
      logger.error(`IPC error: ${callName}`, {
        error: error.message,
        stack: error.stack,
        args: args.length
      });
      
      return {
        success: false,
        error: error.message || 'Unknown IPC error',
        details: SecurityConfig.isDevelopment() ? error.stack : undefined
      };
    }
  }
}

// Централизованный API
class ElectronAPI {
  constructor() {
    this.logger = logger;
    this.errorHandler = IPCErrorHandler;
  }

  // Файловые операции
  async saveFile(content, defaultPath = null) {
    return await this.errorHandler.handleIPC(
      'saveFile',
      (content, defaultPath) => ipcRenderer.invoke('save-file', content, defaultPath),
      content,
      defaultPath
    );
  }

  async openFile() {
    return await this.errorHandler.handleIPC(
      'openFile',
      () => ipcRenderer.invoke('open-file')
    );
  }

  // Информация о приложении
  async getAppInfo() {
    return await this.errorHandler.handleIPC(
      'getAppInfo',
      () => ipcRenderer.invoke('get-app-info')
    );
  }

  // Диалоги
  async showMessageBox(options) {
    return await this.errorHandler.handleIPC(
      'showMessageBox',
      (options) => ipcRenderer.invoke('show-message-box', options),
      options
    );
  }

  async showErrorBox(title, content) {
    return await this.errorHandler.handleIPC(
      'showErrorBox',
      (title, content) => ipcRenderer.invoke('show-error-box', title, content),
      title,
      content
    );
  }

  // Уведомления о безопасности
  showSecurityWarning(message, data = null) {
    this.logger.warn(`Security Warning: ${message}`, data);
  }

  // Проверка доступности API
  isElectron() {
    return true;
  }

  async isPackaged() {
    try {
      const info = await this.getAppInfo();
      return info?.isPackaged || false;
    } catch (error) {
      this.logger.error('Failed to check if packaged', error);
      return false;
    }
  }

  async isDev() {
    try {
      const info = await this.getAppInfo();
      return info?.isDev || false;
    } catch (error) {
      this.logger.error('Failed to check dev mode', error);
      return false;
    }
  }

  // Система логирования для фронтенда
  log(level, message, data = null) {
    this.logger.log(level, message, data);
  }

  // Получение конфигурации безопасности
  getSecurityConfig() {
    return {
      isDevelopment: SecurityConfig.isDevelopment(),
      logLevel: this.logger.logLevel,
      restrictedObjects: SecurityConfig.RESTRICTED_OBJECTS
    };
  }
}

// Функция для регистрации новых API
function registerAPI(apiName, apiObject) {
  try {
    contextBridge.exposeInMainWorld(apiName, apiObject);
    logger.info(`API registered: ${apiName}`);
  } catch (error) {
    logger.error(`Failed to register API: ${apiName}`, error);
  }
}

// Функция для расширения существующего API
function extendAPI(apiName, newMethods) {
  try {
    const existingAPI = window[apiName];
    if (existingAPI && typeof existingAPI === 'object') {
      Object.assign(existingAPI, newMethods);
      logger.info(`API extended: ${apiName}`, { methods: Object.keys(newMethods) });
    } else {
      logger.warn(`Cannot extend API: ${apiName} - not found`);
    }
  } catch (error) {
    logger.error(`Failed to extend API: ${apiName}`, error);
  }
}

// Инициализация API
const electronAPI = new ElectronAPI();

// Регистрация основного API
registerAPI('electronAPI', {
  // Файловые операции
  saveFile: electronAPI.saveFile.bind(electronAPI),
  openFile: electronAPI.openFile.bind(electronAPI),
  
  // Информация о приложении
  getAppInfo: electronAPI.getAppInfo.bind(electronAPI),
  
  // Диалоги
  showMessageBox: electronAPI.showMessageBox.bind(electronAPI),
  showErrorBox: electronAPI.showErrorBox.bind(electronAPI),
  
  // Утилиты
  isElectron: electronAPI.isElectron.bind(electronAPI),
  isPackaged: electronAPI.isPackaged.bind(electronAPI),
  isDev: electronAPI.isDev.bind(electronAPI),
  
  // Безопасность
  showSecurityWarning: electronAPI.showSecurityWarning.bind(electronAPI)
});

// Дополнительные утилиты для разработки
if (SecurityConfig.isDevelopment()) {
  registerAPI('devAPI', {
    // Утилиты для разработки
    getLogs: () => logger,
    getSecurityConfig: () => electronAPI.getSecurityConfig(),
    testIPC: async (callName, ...args) => {
      logger.debug(`Testing IPC: ${callName}`, args);
      return await electronAPI[callName](...args);
    },
    // Функция для регистрации новых API в runtime
    registerNewAPI: registerAPI,
    extendAPI: extendAPI
  });
}

// Блокируем доступ к опасным Node.js API
SecurityConfig.RESTRICTED_OBJECTS.forEach(obj => {
  try {
    delete window[obj];
    logger.debug(`Blocked access to: ${obj}`);
  } catch (error) {
    logger.warn(`Failed to block: ${obj}`, error);
  }
});

// Дополнительные ограничения для продакшн
if (!SecurityConfig.isDevelopment()) {
  SecurityConfig.PRODUCTION_RESTRICTIONS.forEach(obj => {
    try {
      delete window[obj];
      logger.debug(`Blocked production access to: ${obj}`);
    } catch (error) {
      logger.warn(`Failed to block production: ${obj}`, error);
    }
  });
}

// Дополнительная безопасность
try {
  Object.freeze(window.electronAPI);
  if (window.devAPI) {
    Object.freeze(window.devAPI);
  }
  logger.info('API objects frozen for security');
} catch (error) {
  logger.error('Failed to freeze API objects', error);
}

// Глобальная обработка ошибок
window.addEventListener('error', (event) => {
  logger.error('Global error caught', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  });
});

// Инициализация завершена
logger.info('Preload script initialized', {
  isDevelopment: SecurityConfig.isDevelopment(),
  logLevel: logger.logLevel,
  restrictedObjects: SecurityConfig.RESTRICTED_OBJECTS.length
});
