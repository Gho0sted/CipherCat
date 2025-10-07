// Модуль для управления файлами с улучшенной проверкой Electron API
class FileManager {
  constructor(options = {}) {
    this.isElectronAvailable = false;
    this.config = {
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB по умолчанию
      enableEncodingCache: options.enableEncodingCache !== false
    };
    
    // Кэш для определения кодировки
    this.encodingCache = new Map();
    
    // Статические словари для алгоритмов
    this.algorithmNames = {
      caesar: 'Шифр Цезаря',
      vigenere: 'Шифр Виженера', 
      aes: 'AES-256',
      base64: 'Base64'
    };
    
    this.keyTypes = {
      caesar: 'Сдвиг',
      vigenere: 'Ключевое слово',
      aes: 'Пароль',
      base64: 'Не требуется'
    };
    
    this.checkElectronAvailability();
  }

  // Проверка доступности Electron API
  checkElectronAvailability() {
    this.isElectronAvailable = typeof window.electronAPI !== 'undefined';
    
    if (this.isElectronAvailable) {
      console.log('Electron API доступен');
    } else {
      console.warn('Electron API недоступен - работа в веб-режиме');
    }
  }

  // Общий обработчик ошибок
  _handleError(operation, error) {
    const errorMessage = `Ошибка ${operation}: ${error.message}`;
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }

  // Загрузка файла
  async loadFile() {
    if (!this.isElectronAvailable) {
      return this.loadFileWeb();
    }

    try {
      const result = await window.electronAPI.openFile();
      
      if (result.success) {
        return {
          success: true,
          content: result.content,
          filename: result.filename || 'unknown',
          size: result.content.length
        };
      } else if (result.error === 'Open cancelled') {
        return {
          success: false,
          cancelled: true
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (error.message.includes('отменено') || error.message.includes('cancelled')) {
        return {
          success: false,
          cancelled: true
        };
      }
      this._handleError('загрузки файла', error);
    }
  }

  // Загрузка файла в веб-режиме (исправленная)
  async loadFileWeb() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.md,.json';
      
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file || e.target.files.length === 0) {
          resolve({ success: false, cancelled: true });
          return;
        }

        // Проверяем размер файла
        try {
          this.validateFileSize(file.size);
        } catch (error) {
          reject(error);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            success: true,
            content: e.target.result,
            filename: file.name,
            size: file.size
          });
        };
        reader.onerror = () => {
          reject(new Error('Ошибка чтения файла'));
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }

  // Сохранение файла
  async saveFile(content, filename = 'encrypted_text.txt') {
    if (!this.isElectronAvailable) {
      return this.saveFileWeb(content, filename);
    }

    try {
      const result = await window.electronAPI.saveFile(content, filename || 'encrypted_text.txt');
      
      if (result.success) {
        return {
          success: true,
          filename: result.filename || filename
        };
      } else if (result.error === 'Save cancelled') {
        return {
          success: false,
          cancelled: true
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      if (error.message.includes('отменено') || error.message.includes('cancelled')) {
        return {
          success: false,
          cancelled: true
        };
      }
      this._handleError('сохранения файла', error);
    }
  }

  // Сохранение файла в веб-режиме
  async saveFileWeb(content, filename = 'encrypted_text.txt') {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: filename
      };
    } catch (error) {
      this._handleError('сохранения файла', error);
    }
  }

  // Создание метаданных для файла
  createMetadataFile(steps, history, originalText, encryptedText, options = {}) {
    const metadata = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      application: 'CipherCat',
      steps: steps.map((step, index) => ({
        step: index + 1,
        algorithm: step.algorithm,
        algorithmName: this.getAlgorithmName(step.algorithm),
        key: step.key,
        keyType: this.getKeyType(step.algorithm)
      })),
      log: history,
      statistics: {
        stepsCount: steps.length,
        originalLength: originalText.length,
        finalLength: encryptedText.length,
        compressionRatio: originalText.length > 0 
          ? (encryptedText.length / originalText.length).toFixed(2)
          : 'N/A'
      },
      options: options
    };

    const content = `=== МЕТАДАННЫЕ ШИФРОВАНИЯ ===
Версия: ${metadata.version}
Дата: ${new Date(metadata.timestamp).toLocaleString()}
Приложение: ${metadata.application}
Количество этапов: ${metadata.statistics.stepsCount}
Исходная длина: ${metadata.statistics.originalLength} символов
Итоговая длина: ${metadata.statistics.finalLength} символов
Коэффициент сжатия: ${metadata.statistics.compressionRatio}

=== ЭТАПЫ ШИФРОВАНИЯ ===
${metadata.steps
    .map(
      (step) =>
        `Этап ${step.step}: ${step.algorithmName} (${step.keyType}: ${step.key})`
    )
    .join('\n')}

=== ИСТОРИЯ ВЫПОЛНЕНИЯ ===
${metadata.log
    .map(
      (log) =>
        `Этап ${log.step}: ${log.algorithmName} - ${
          log.operation === 'encrypt' ? 'Шифрование' : 'Расшифровка'
        } (${log.inputLength} → ${log.outputLength} символов)`
    )
    .join('\n')}

=== ЗАШИФРОВАННЫЙ ТЕКСТ ===
${encryptedText}`;

    return content;
  }

  // Получить название алгоритма (оптимизированно)
  getAlgorithmName(algorithm) {
    return this.algorithmNames[algorithm] || algorithm;
  }

  // Получить тип ключа (оптимизированно)
  getKeyType(algorithm) {
    return this.keyTypes[algorithm] || 'Ключ';
  }

  // Экспорт конфигурации
  async exportConfiguration(data) {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      application: 'CipherCat',
      data: data
    };

    const content = JSON.stringify(config, null, 2);
    const filename = `ciphercat_config_${new Date().toISOString().split('T')[0]}.json`;
    
    return this.saveFile(content, filename);
  }

  // Импорт конфигурации
  async importConfiguration() {
    const result = await this.loadFile();
    
    if (!result.success) {
      return { success: false, cancelled: result.cancelled };
    }

    try {
      const config = JSON.parse(result.content);
      
      // Валидация конфигурации
      if (!config.version || !config.data) {
        throw new Error('Неверный формат конфигурации');
      }

      return {
        success: true,
        config: config,
        data: config.data
      };
    } catch (error) {
      throw new Error(`Ошибка импорта конфигурации: ${error.message}`);
    }
  }

  // Получить информацию о файле
  getFileInfo(content) {
    return {
      size: content.length,
      lines: content.split('\n').length,
      words: content.split(/\s+/).filter(word => word.length > 0).length,
      characters: content.length,
      encoding: this.detectEncoding(content)
    };
  }

  // Определение кодировки (с кэшированием)
  detectEncoding(content) {
    if (!this.config.enableEncodingCache) {
      return this._detectEncodingInternal(content);
    }

    // Создаем хэш содержимого для кэширования
    const contentHash = this._hashContent(content);
    
    if (this.encodingCache.has(contentHash)) {
      return this.encodingCache.get(contentHash);
    }

    const encoding = this._detectEncodingInternal(content);
    this.encodingCache.set(contentHash, encoding);
    
    return encoding;
  }

  // Внутренний метод определения кодировки
  _detectEncodingInternal(content) {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8');
      const encoded = encoder.encode(content);
      const decoded = decoder.decode(encoded);
      return content === decoded ? 'UTF-8' : 'Binary';
    } catch {
      return 'Unknown';
    }
  }

  // Простое хэширование содержимого
  _hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // Валидация размера файла (с настраиваемым лимитом)
  validateFileSize(size, maxSize = null) {
    const limit = maxSize || this.config.maxFileSize;
    if (size > limit) {
      throw new Error(`Файл слишком большой. Максимальный размер: ${limit / 1024 / 1024}MB`);
    }
    return true;
  }

  // Проверка доступности Electron
  isElectronAvailable() {
    return this.isElectronAvailable;
  }

  // Получить режим работы
  getMode() {
    return this.isElectronAvailable ? 'desktop' : 'web';
  }
}

export default FileManager;
