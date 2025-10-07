const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isDevMode = process.argv.includes('--dev') || !app.isPackaged;

// Конфигурация производительности и безопасности
const PerformanceConfig = {
  // Базовые настройки безопасности
  disableHardwareAcceleration: false, // По умолчанию включено для лучшей производительности
  
  // Флаги для проблемных систем (включаются только при необходимости)
  problemFlags: [
    '--disable-gpu',
    '--disable-gpu-sandbox',
    '--disable-software-rasterizer',
    '--disable-gpu-compositing',
    '--use-angle=swiftshader',
    '--disable-features=CanvasOopRasterization,WebGL'
  ],
  
  // Проверка необходимости отключения GPU
  shouldDisableGPU: () => {
    // Проверяем переменные окружения или аргументы командной строки
    return process.argv.includes('--disable-gpu') || 
           process.env.ELECTRON_DISABLE_GPU === 'true' ||
           process.platform === 'linux' || // На некоторых Linux системах могут быть проблемы
           (process.platform === 'win32' && process.arch === 'ia32'); // 32-bit Windows
  },

  // Проверка необходимости включения GPU
  shouldEnableGPU: () => {
    return process.argv.includes('--enable-gpu') || 
           process.env.ELECTRON_ENABLE_GPU === 'true';
  }
};

// Применение настроек производительности
function applyPerformanceSettings() {
  if (PerformanceConfig.shouldEnableGPU()) {
    console.log('GPU acceleration explicitly enabled');
    // GPU уже включен по умолчанию
  } else if (PerformanceConfig.shouldDisableGPU()) {
    console.log('GPU acceleration disabled due to system requirements');
    app.disableHardwareAcceleration();
    PerformanceConfig.problemFlags.forEach(flag => {
      const [key, value] = flag.includes('=') ? flag.split('=') : [flag, ''];
      if (value) {
        app.commandLine.appendSwitch(key, value);
      } else {
        app.commandLine.appendSwitch(key);
      }
    });
  } else {
    console.log('GPU acceleration enabled for optimal performance');
  }
}

// Устанавливаем AppUserModelID для корректной иконки в таскбаре
app.setAppUserModelId('com.ciphercat.app');

// Применяем настройки производительности
applyPerformanceSettings();

// Безопасная конфигурация webPreferences
const getWebPreferences = () => ({
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  enableRemoteModule: false,
  enableWebSQL: false, // Отключение WebSQL для улучшения безопасности
  webviewTag: false, // Отключение webview для безопасности
  allowRunningInsecureContent: false,
  experimentalFeatures: false,
  webSecurity: true,
  preload: path.join(__dirname, 'preload.js')
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: getWebPreferences(),
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    // Дополнительные настройки безопасности
    title: 'CipherCat - Secure Text Encryption',
    autoHideMenuBar: true,
    fullscreenable: true,
    maximizable: true,
    minimizable: true,
    resizable: true
  });

  // Удаляем меню для безопасности
  mainWindow.removeMenu();

  // Улучшенная блокировка внешней навигации с поддержкой внешних ссылок
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Открываем внешние ссылки в браузере по умолчанию
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  // Блокируем навигацию на внешние сайты
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      console.warn('Blocked navigation to external URL:', url);
    }
  });

  // Безопасная загрузка файла
  try {
    mainWindow.loadFile('index.html');
  } catch (error) {
    console.error('Error loading index.html:', error);
    app.quit();
    return;
  }

  // Показываем окно после загрузки
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Фокусируемся на окне
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  // Улучшенная обработка закрытия окна
  mainWindow.on('closed', () => {
    try {
      mainWindow = null;
    } catch (error) {
      console.error('Ошибка при закрытии окна:', error);
    }
  });

  // Обработка ошибок загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, errorDescription);
  });

  // Открытие DevTools только в режиме разработки
  if (isDevMode) {
    console.log('Development mode: DevTools enabled');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Обработка обновлений (для будущего использования)
  mainWindow.webContents.on('update-available', () => {
    console.log('Update available');
  });
}

// Безопасная инициализация приложения
app.whenReady().then(() => {
  try {
    createWindow();
  } catch (error) {
    console.error('Failed to create window:', error);
    app.quit();
  }
});

// Обработка закрытия всех окон
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка активации приложения (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Обработка ошибок приложения
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render process crashed:', details);
  if (details.reason === 'crashed') {
    dialog.showErrorBox('Ошибка приложения', 'Приложение неожиданно завершило работу. Перезапустите приложение.');
  }
});

// Улучшенная обработка работы с файлами
class FileManager {
  static async checkFileAccess(filePath, mode = fs.constants.R_OK) {
    try {
      fs.accessSync(filePath, mode);
      return true;
    } catch (error) {
      return false;
    }
  }

  static async saveFile(content, defaultPath = null) {
    const options = {
      filters: [
        { name: 'Текстовые файлы', extensions: ['txt'] },
        { name: 'JSON файлы', extensions: ['json'] },
        { name: 'Все файлы', extensions: ['*'] }
      ],
      defaultPath: defaultPath
    };

    const result = await dialog.showSaveDialog(mainWindow, options);

    if (!result.canceled && result.filePath) {
      try {
        // Проверяем доступность записи
        const dirPath = path.dirname(result.filePath);
        if (!await this.checkFileAccess(dirPath, fs.constants.W_OK)) {
          return { 
            success: false, 
            error: 'Нет прав доступа для записи в выбранную папку' 
          };
        }

        // Проверяем размер файла
        const contentSize = Buffer.byteLength(content, 'utf8');
        const maxSize = 50 * 1024 * 1024; // 50MB лимит
        
        if (contentSize > maxSize) {
          return { 
            success: false, 
            error: `Файл слишком большой (${Math.round(contentSize / 1024 / 1024)}MB). Максимальный размер: 50MB` 
          };
        }

        // Записываем файл
        fs.writeFileSync(result.filePath, content, 'utf8');
        
        return { 
          success: true, 
          path: result.filePath,
          size: contentSize,
          filename: path.basename(result.filePath)
        };
      } catch (error) {
        console.error('File save error:', error);
        return { 
          success: false, 
          error: `Ошибка сохранения: ${error.message}` 
        };
      }
    }
    
    return { success: false, error: 'Сохранение отменено' };
  }

  static async openFile() {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'Текстовые файлы', extensions: ['txt', 'md'] },
        { name: 'JSON файлы', extensions: ['json'] },
        { name: 'Все файлы', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      
      try {
        // Проверяем доступность чтения
        if (!await this.checkFileAccess(filePath, fs.constants.R_OK)) {
          return { 
            success: false, 
            error: 'Нет прав доступа для чтения выбранного файла' 
          };
        }

        // Проверяем размер файла
        let stats;
        try {
          stats = fs.statSync(filePath);
        } catch (statError) {
          return { 
            success: false, 
            error: `Ошибка получения информации о файле: ${statError.message}` 
          };
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB лимит
        if (stats.size > maxSize) {
          return { 
            success: false, 
            error: `Файл слишком большой (${Math.round(stats.size / 1024 / 1024)}MB). Максимальный размер: 10MB` 
          };
        }

        // Читаем файл
        let content;
        try {
          content = fs.readFileSync(filePath, 'utf8');
        } catch (readError) {
          return { 
            success: false, 
            error: `Ошибка чтения файла: ${readError.message}` 
          };
        }
        
        return { 
          success: true, 
          content, 
          path: filePath,
          filename: path.basename(filePath),
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        console.error('File open error:', error);
        return { 
          success: false, 
          error: `Ошибка открытия: ${error.message}` 
        };
      }
    }
    
    return { success: false, error: 'Открытие отменено' };
  }
}

// IPC обработчики для работы с файлами
ipcMain.handle('save-file', async (event, content, defaultPath) => {
  // Валидация типов
  if (typeof content !== 'string') {
    return { 
      success: false, 
      error: 'Содержимое файла должно быть строкой' 
    };
  }
  
  if (defaultPath && typeof defaultPath !== 'string') {
    return { 
      success: false, 
      error: 'Путь по умолчанию должен быть строкой' 
    };
  }
  
  return await FileManager.saveFile(content, defaultPath);
});

ipcMain.handle('open-file', async () => {
  return await FileManager.openFile();
});

// Дополнительные IPC обработчики для интеграции с приложением
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isDev: isDevMode,
    isPackaged: app.isPackaged,
    userData: app.getPath('userData')
  };
});

ipcMain.handle('show-message-box', async (event, options) => {
  try {
    const result = await dialog.showMessageBox(mainWindow, options);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-error-box', async (event, title, content) => {
  dialog.showErrorBox(title, content);
});

// Обработка закрытия приложения
app.on('before-quit', () => {
  // Можно добавить проверки на несохраненные данные
  console.log('Application is about to quit');
});

// Экспорт для тестирования (только в dev режиме)
if (isDevMode) {
  module.exports = {
    FileManager,
    PerformanceConfig,
    isDevMode
  };
}
