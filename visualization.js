/**
 * Визуализация алгоритмов шифрования: подстроки входа (фиолетовый) и результата (зелёный)
 * Неблокирующий рендер с деградацией для длинных строк
 * 
 * @author Ghosted (@Gho0sted)
 * @project CipherCat (https://github.com/Gho0sted/CipherCat)
 */

(function () {
  'use strict';

  /**
   * Конфигурация визуализации
   */
  const VisualizationConfig = {
    // Лимиты для производительности
    MAX_LEN: 3000, // Жёсткий лимит для предотвращения блокировки UI
    PREVIEW: 400, // Размер превью для длинных строк
    MAX_CHARS: 1000, // Максимальное количество символов для inline отображения
    VIRTUAL_THRESHOLD: 500, // Порог для включения виртуализации
    
    // Настройки пагинации
    PAGE_SIZE: 100, // Размер страницы для ленивой загрузки
    RENDER_DELAY: 16, // Задержка между рендерами (60fps)
    
    // Названия алгоритмов
    ALGORITHM_NAMES: {
      caesar: 'Шифр Цезаря',
      vigenere: 'Шифр Виженера', 
      base64: 'Base64',
      aes: 'AES-256',
      multi: 'Многоэтапное',
      custom: 'Пользовательский'
    },
    
    // Операции
    OPERATIONS: {
      encrypt: 'Шифрование',
      decrypt: 'Расшифровка'
    }
  };

  /**
   * Система обработки ошибок
   */
  class ErrorHandler {
    static handle(error, context = '') {
      console.error(`[Visualization] ${context}:`, error);
      return {
        message: error.message || 'Неизвестная ошибка',
        context,
        timestamp: Date.now()
      };
    }

    static createErrorElement(error, context = '') {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'visualization-error';
      // Стили применяются через CSS класс
      errorDiv.innerHTML = `
        <h4>Ошибка визуализации</h4>
        <p>${error.message}</p>
        ${context ? `<small>Контекст: ${context}</small>` : ''}
      `;
      return errorDiv;
    }
  }

  /**
   * Система шаблонов с оптимизированным рендером
   */
  class TemplateEngine {
    static createTableRow(inputChar, outputChar) {
      return `
        <tr>
          <td class="viz-violet viz-badge">${this.escape(inputChar)}</td>
          <td>→</td>
          <td class="viz-green viz-badge">${this.escape(outputChar)}</td>
        </tr>
      `;
    }

    static createTableRowElement(inputChar, outputChar) {
      const row = document.createElement('tr');
      
      const inputCell = document.createElement('td');
      inputCell.className = 'viz-violet viz-badge';
      inputCell.textContent = inputChar;
      
      const arrowCell = document.createElement('td');
      arrowCell.textContent = '→';
      
      const outputCell = document.createElement('td');
      outputCell.className = 'viz-green viz-badge';
      outputCell.textContent = outputChar;
      
      row.appendChild(inputCell);
      row.appendChild(arrowCell);
      row.appendChild(outputCell);
      
      return row;
    }

    static createStatsRow(label, value) {
      return `
        <div><span>${label}:</span> ${value}</div>
      `;
    }

    static createKeyValueRow(key, value) {
      return `
        <div>${key}</div><div>${value}</div>
      `;
    }

    static escape(text) {
      if (typeof text !== 'string') {return text;}
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
  }

  /**
   * Система асинхронного рендера
   */
  class AsyncRenderer {
    constructor() {
      this.isRendering = false;
      this.renderQueue = [];
      this.chunkSize = 50;
      this.renderDelay = 16; // 60fps
    }

    async renderChunks(data, renderCallback, container) {
      if (this.isRendering) {
        this.renderQueue.push({ data, renderCallback, container });
        return;
      }

      this.isRendering = true;
      
      try {
        const chunks = this.chunkData(data, this.chunkSize);
        const fragment = document.createDocumentFragment();
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkFragment = renderCallback(chunk, i * this.chunkSize);
          fragment.appendChild(chunkFragment);
          
          // Даем браузеру время на рендер
          if (i < chunks.length - 1) {
            await this.delay(this.renderDelay);
          }
        }
        
        container.appendChild(fragment);
        
        // Обрабатываем очередь
        if (this.renderQueue.length > 0) {
          const next = this.renderQueue.shift();
          this.renderChunks(next.data, next.renderCallback, next.container);
        }
      } finally {
        this.isRendering = false;
      }
    }

    chunkData(data, chunkSize) {
      const chunks = [];
      for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
      }
      return chunks;
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset() {
      this.isRendering = false;
      this.renderQueue = [];
    }
  }

  /**
   * Система виртуализации для больших данных с оптимизированным рендером
   */
  class VirtualRenderer {
    constructor(container, itemHeight = 20) {
      this.container = container;
      this.itemHeight = itemHeight;
      this.visibleStart = 0;
      this.visibleEnd = 0;
      this.totalItems = 0;
      this.data = [];
      this.renderedElements = new Map();
      this.scrollContainer = null;
      this.scrollHandler = null;
      this.resizeObserver = null;
    }

    setData(data) {
      this.data = data;
      this.totalItems = data.length;
      this.renderedElements.clear();
      this.setupScrollContainer();
      this.render();
    }

    setupScrollContainer() {
      if (this.scrollContainer) return;

      this.scrollContainer = document.createElement('div');
      this.scrollContainer.className = 'virtual-scroll-container';
      this.scrollContainer.style.height = '300px';
      this.scrollContainer.style.overflow = 'auto';
      
      const viewport = document.createElement('div');
      viewport.className = 'virtual-viewport';
      viewport.style.height = `${this.totalItems * this.itemHeight}px`;
      viewport.style.position = 'relative';
      
      const content = document.createElement('div');
      content.className = 'virtual-content';
      content.style.position = 'absolute';
      content.style.top = '0';
      content.style.left = '0';
      content.style.right = '0';
      
      this.scrollContainer.appendChild(viewport);
      viewport.appendChild(content);
      this.container.appendChild(this.scrollContainer);
      
      this.contentContainer = content;
      this.setupEventListeners();
    }

    setupEventListeners() {
      this.scrollHandler = this.throttle(() => this.handleScroll(), 16);
      this.scrollContainer.addEventListener('scroll', this.scrollHandler);
      
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.scrollContainer);
    }

    handleScroll() {
      const scrollTop = this.scrollContainer.scrollTop;
      const containerHeight = this.scrollContainer.clientHeight;
      
      this.visibleStart = Math.floor(scrollTop / this.itemHeight);
      this.visibleEnd = Math.min(
        this.totalItems, 
        this.visibleStart + Math.ceil(containerHeight / this.itemHeight) + 5
      );
      
      this.render();
    }

    handleResize() {
      this.handleScroll();
    }

    render() {
      if (this.totalItems === 0 || !this.contentContainer) return;

      // Удаляем невидимые элементы
      for (const [index, element] of this.renderedElements) {
        if (index < this.visibleStart || index >= this.visibleEnd) {
          element.remove();
          this.renderedElements.delete(index);
        }
      }

      // Добавляем новые видимые элементы
      const fragment = document.createDocumentFragment();
      for (let i = this.visibleStart; i < this.visibleEnd; i++) {
        if (!this.renderedElements.has(i)) {
          const element = this.createItem(this.data[i], i);
          this.renderedElements.set(i, element);
          fragment.appendChild(element);
        }
      }
      
      if (fragment.children.length > 0) {
        this.contentContainer.appendChild(fragment);
      }

      // Обновляем позицию контента
      this.contentContainer.style.transform = `translateY(${this.visibleStart * this.itemHeight}px)`;
    }

    createItem(data, index) {
      const item = document.createElement('div');
      item.className = 'virtual-item';
      item.style.position = 'absolute';
      item.style.top = '0';
      item.style.left = '0';
      item.style.right = '0';
      item.style.height = `${this.itemHeight}px`;
      item.style.transform = `translateY(${index * this.itemHeight}px)`;
      item.setAttribute('data-index', index);
      
      if (typeof data === 'string') {
        item.textContent = data;
      } else if (data instanceof HTMLElement) {
        item.appendChild(data.cloneNode(true));
      } else {
        item.innerHTML = data;
      }
      
      return item;
    }

    scrollTo(index) {
      if (!this.scrollContainer) return;
      
      const targetScrollTop = index * this.itemHeight;
      this.scrollContainer.scrollTop = targetScrollTop;
    }

    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }

    destroy() {
      if (this.scrollHandler) {
        this.scrollContainer?.removeEventListener('scroll', this.scrollHandler);
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      this.renderedElements.clear();
    }
  }

  /**
   * Система ленивой загрузки с прогрессивным рендером
   */
  class LazyLoader {
    constructor(container, pageSize = VisualizationConfig.PAGE_SIZE) {
      this.container = container;
      this.pageSize = pageSize;
      this.currentPage = 0;
      this.isLoading = false;
      this.hasMore = true;
      this.data = [];
      this.renderedItems = 0;
      this.loadButton = null;
      this.progressBar = null;
    }

    setData(data) {
      this.data = data;
      this.currentPage = 0;
      this.renderedItems = 0;
      this.hasMore = data.length > 0;
      this.container.innerHTML = '';
      this.createProgressIndicator();
    }

    createProgressIndicator() {
      if (this.data.length <= this.pageSize) return;

      const progressContainer = document.createElement('div');
      progressContainer.className = 'lazy-progress';
      
      this.progressBar = document.createElement('div');
      this.progressBar.className = 'lazy-progress-bar';
      
      const progressText = document.createElement('div');
      progressText.className = 'lazy-progress-text';
      
      this.loadButton = document.createElement('button');
      this.loadButton.className = 'lazy-load-btn';
      this.loadButton.textContent = 'Загрузить больше';
      this.loadButton.addEventListener('click', () => this.loadNext());
      
      progressContainer.appendChild(this.progressBar);
      progressContainer.appendChild(progressText);
      progressContainer.appendChild(this.loadButton);
      
      this.container.appendChild(progressContainer);
      this.updateProgress();
    }

    updateProgress() {
      if (!this.progressBar) return;
      
      const progress = Math.min(100, (this.renderedItems / this.data.length) * 100);
      this.progressBar.style.width = `${progress}%`;
      
      const progressText = this.progressBar.parentElement.querySelector('.lazy-progress-text');
      if (progressText) {
        progressText.textContent = `Показано ${this.renderedItems} из ${this.data.length} элементов`;
      }
      
      if (this.loadButton) {
        this.loadButton.disabled = !this.hasMore || this.isLoading;
        this.loadButton.textContent = this.isLoading ? 'Загрузка...' : 
                                     this.hasMore ? 'Загрузить больше' : 'Все загружено';
      }
    }

    async loadNext() {
      if (this.isLoading || !this.hasMore) return;

      this.isLoading = true;
      this.updateProgress();

      try {
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.data.length);
        const pageData = this.data.slice(startIndex, endIndex);

        await this.renderPage(pageData, startIndex);
        
        this.renderedItems = endIndex;
        this.currentPage++;
        this.hasMore = endIndex < this.data.length;
        
        this.updateProgress();
      } catch (error) {
        ErrorHandler.handle(error, 'LazyLoader.loadNext');
      } finally {
        this.isLoading = false;
      }
    }

    async renderPage(pageData, startIndex) {
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          const fragment = document.createDocumentFragment();
          
          pageData.forEach((item, index) => {
            const element = this.createItem(item, startIndex + index);
            fragment.appendChild(element);
          });
          
          this.container.appendChild(fragment);
          resolve();
        });
      });
    }

    createItem(data, index) {
      const item = document.createElement('div');
      item.className = 'lazy-item';
      item.setAttribute('data-index', index);
      item.textContent = data;
      return item;
    }

    reset() {
      this.currentPage = 0;
      this.isLoading = false;
      this.hasMore = true;
      this.renderedItems = 0;
      this.data = [];
      this.container.innerHTML = '';
    }
  }

  /**
   * Основной класс визуализации с оптимизациями
   */
  class Visualization {
    constructor() {
      this.container = document.getElementById('visualizationContainer');
      this.titleEl = document.getElementById('visualizationContainerTitle');
      this.bodyEl = document.getElementById('visualizationBody');
      this.sectionEl = document.querySelector('.visualization-section');
      
      // Системы
      this.errorHandler = ErrorHandler;
      this.templateEngine = TemplateEngine;
      this.asyncRenderer = new AsyncRenderer();
      this.virtualRenderer = null;
      this.lazyLoader = null;
      
      // Регистр алгоритмов
      this.algorithmRegistry = new Map();
      this.registerDefaultAlgorithms();
      
      // Состояние
      this.isRendering = false;
      this.currentData = null;
      this.themeConfig = this.getDefaultThemeConfig();
    }

    /**
     * Получение конфигурации темы по умолчанию
     */
    getDefaultThemeConfig() {
      return {
        colors: {
          input: 'violet',
          output: 'green',
          key: 'blue',
          arrow: 'gray'
        },
        classes: {
          input: 'viz-violet',
          output: 'viz-green',
          key: 'viz-blue',
          arrow: 'viz-arrow'
        }
      };
    }

    /**
     * Установка кастомной темы
     */
    setTheme(themeConfig) {
      this.themeConfig = { ...this.getDefaultThemeConfig(), ...themeConfig };
    }

    /**
     * Регистрация алгоритмов по умолчанию
     */
    registerDefaultAlgorithms() {
      this.registerAlgorithm('caesar', this.renderCaesar.bind(this));
      this.registerAlgorithm('vigenere', this.renderVigenere.bind(this));
      this.registerAlgorithm('base64', this.renderBase64.bind(this));
      this.registerAlgorithm('aes', this.renderAES.bind(this));
      this.registerAlgorithm('multi', this.renderMulti.bind(this));
    }

    /**
     * Регистрация нового алгоритма
     * @param {string} name - Название алгоритма
     * @param {Function} renderFunction - Функция рендеринга
     */
    registerAlgorithm(name, renderFunction) {
      this.algorithmRegistry.set(name, renderFunction);
    }

    /**
     * Очистка визуализации с оптимизированным удалением DOM элементов
     */
    clear() {
      try {
        if (!this.bodyEl) {return;}
        
        // Оптимизированная очистка DOM
        this.clearContainer(this.bodyEl);
        this.bodyEl.innerHTML = '<p class="visualization-empty">Нет данных для визуализации</p>';
        
        if (this.titleEl) {this.titleEl.textContent = 'Визуализация';}
        this.hide();
        this.currentData = null;
        
        // Очищаем системы
        this.asyncRenderer.reset();
        if (this.virtualRenderer) {
          this.virtualRenderer.destroy();
          this.virtualRenderer = null;
        }
        if (this.lazyLoader) {
          this.lazyLoader.reset();
        }
      } catch (error) {
        this.errorHandler.handle(error, 'clear');
      }
    }

    /**
     * Оптимизированная очистка контейнера
     */
    clearContainer(container) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }

    /**
     * Главная точка входа для рендеринга с оптимизациями
     * @param {string} algorithm - Название алгоритма
     * @param {string} operation - Операция (encrypt/decrypt)
     * @param {string} input - Входной текст
     * @param {string} key - Ключ
     * @param {string} output - Результат
     */
    render(algorithm, operation, input, key, output) {
      try {
        if (this.isRendering) {return;}
        this.isRendering = true;

        if (!this.bodyEl || !this.titleEl) {
          throw new Error('Не удается найти элементы для визуализации');
        }

        this.show();
        this.currentData = { algorithm, operation, input, key, output };

        // Установка заголовка
        const algoName = VisualizationConfig.ALGORITHM_NAMES[algorithm] || algorithm;
        const operationName = VisualizationConfig.OPERATIONS[operation] || operation;
        this.titleEl.textContent = `${algoName} — ${operationName}`;

        // Уведомляем о начале рендеринга
        this.announceUpdate(`Начинается визуализация ${algoName} ${operationName}`);

        // Обработка длинных строк
        const { inText, outText, truncated } = this.processLongStrings(input, output);

        // Асинхронный рендеринг для больших данных
        if (this.shouldUseAsyncRender(inText, outText)) {
          this.renderAsync(algorithm, inText, outText, key);
        } else {
          this.renderAlgorithm(algorithm, inText, outText, key);
        }

        // Добавление уведомления о сокращении
        if (truncated) {
          this.addTruncationNote();
        }

        // Уведомляем о завершении рендеринга
        this.announceUpdate(`Визуализация ${algoName} завершена`);

      } catch (error) {
        const errorInfo = this.errorHandler.handle(error, 'render');
        this.clearContainer(this.bodyEl);
        this.bodyEl.appendChild(this.errorHandler.createErrorElement(errorInfo, 'render'));
        this.announceUpdate('Ошибка при визуализации');
      } finally {
        this.isRendering = false;
      }
    }

    /**
     * Проверка необходимости асинхронного рендеринга
     */
    shouldUseAsyncRender(input, output) {
      const totalLength = (input?.length || 0) + (output?.length || 0);
      return totalLength > VisualizationConfig.VIRTUAL_THRESHOLD;
    }

    /**
     * Асинхронный рендеринг для больших данных
     */
    async renderAsync(algorithm, input, output, key) {
      const renderFunction = this.algorithmRegistry.get(algorithm);
      
      if (renderFunction) {
        // Для больших данных используем асинхронный рендер
        await this.asyncRenderer.renderChunks(
          { input, output, key },
          (chunk) => this.renderChunk(algorithm, chunk),
          this.bodyEl
        );
      } else {
        this.renderSimple(input, output, key ? `Ключ: ${key}` : '');
      }
    }

    /**
     * Рендеринг чанка данных
     */
    renderChunk(algorithm, chunk) {
      const fragment = document.createDocumentFragment();
      // Здесь можно добавить логику для рендеринга частей данных
      return fragment;
    }

    /**
     * Обработка длинных строк
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @returns {Object} Обработанные тексты и флаг сокращения
     */
    processLongStrings(input, output) {
      let inText = input ?? '';
      let outText = output ?? '';
      let truncated = false;

      if (inText.length > VisualizationConfig.MAX_LEN || outText.length > VisualizationConfig.MAX_LEN) {
        inText = this.buildPreview(inText, VisualizationConfig.PREVIEW);
        outText = this.buildPreview(outText, VisualizationConfig.PREVIEW);
        truncated = true;
      }

      return { inText, outText, truncated };
    }

    /**
     * Рендеринг алгоритма
     * @param {string} algorithm - Название алгоритма
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} key - Ключ
     */
    renderAlgorithm(algorithm, input, output, key) {
      const renderFunction = this.algorithmRegistry.get(algorithm);
      
      if (renderFunction) {
        renderFunction(input, output, key);
      } else {
        // Fallback для неизвестных алгоритмов
        this.renderSimple(input, output, key ? `Ключ: ${key}` : '');
      }
    }

    /**
     * Показать секцию визуализации с улучшенной доступностью
     */
    show() {
      if (this.sectionEl) {
        this.sectionEl.classList.add('show');
        this.sectionEl.setAttribute('aria-hidden', 'false');
        
        // Добавляем live region для обновлений
        this.setupLiveRegion();
      }
    }

    /**
     * Скрыть секцию визуализации
     */
    hide() {
      if (this.sectionEl) {
        this.sectionEl.classList.remove('show');
        this.sectionEl.setAttribute('aria-hidden', 'true');
      }
    }

    /**
     * Настройка live region для уведомлений об обновлениях
     */
    setupLiveRegion() {
      if (this.liveRegion) return;
      
      this.liveRegion = document.createElement('div');
      this.liveRegion.setAttribute('aria-live', 'polite');
      this.liveRegion.setAttribute('aria-atomic', 'true');
      this.liveRegion.className = 'sr-only';
      this.liveRegion.style.position = 'absolute';
      this.liveRegion.style.left = '-10000px';
      this.liveRegion.style.width = '1px';
      this.liveRegion.style.height = '1px';
      this.liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(this.liveRegion);
    }

    /**
     * Уведомление об обновлении визуализации
     */
    announceUpdate(message) {
      if (this.liveRegion) {
        this.liveRegion.textContent = message;
      }
    }

    /**
     * Создание превью для длинного текста
     * @param {string} text - Исходный текст
     * @param {number} preview - Размер превью
     * @returns {string} Сокращенный текст
     */
    buildPreview(text, preview) {
      if (text.length <= preview * 2 + 10) {return text;}
      return text.slice(0, preview) + '\n…\n' + text.slice(-preview);
    }

    /**
     * Добавление уведомления о сокращении
     */
    addTruncationNote() {
      const note = document.createElement('div');
      note.className = 'visualization-note';
      note.textContent = 'Показана укороченная визуализация для длинного текста.';
      this.bodyEl.appendChild(note);
    }

    /**
     * Простая визуализация
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} subtitle - Подзаголовок
     */
    renderSimple(input, output, subtitle) {
      this.bodyEl.innerHTML = '';
      if (subtitle) {this.appendSubtitle(subtitle);}
      this.bodyEl.appendChild(this.buildBlock('Вход', input, 'violet'));
      this.bodyEl.appendChild(this.buildArrow());
      this.bodyEl.appendChild(this.buildBlock('Результат', output, 'green'));
    }

    /**
     * Визуализация с краткой сводкой
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} subtitle - Подзаголовок
     */
    renderSummary(input, output, subtitle) {
      this.bodyEl.innerHTML = '';
      if (subtitle) {this.appendSubtitle(subtitle);}
      
      const stats = document.createElement('div');
      stats.className = 'viz-stats';
      stats.innerHTML = `
        ${this.templateEngine.createStatsRow('Длина входа', input.length)}
        ${this.templateEngine.createStatsRow('Длина результата', output.length)}
      `;
      this.bodyEl.appendChild(stats);
      this.bodyEl.appendChild(this.buildBlock('Вход (превью)', input, 'violet'));
      this.bodyEl.appendChild(this.buildArrow());
      this.bodyEl.appendChild(this.buildBlock('Результат (превью)', output, 'green'));
    }

    /**
     * Визуализация посимвольного соответствия
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} subtitle - Подзаголовок
     * @param {boolean} showKeyStream - Показывать поток ключа
     */
    renderCharMapping(input, output, subtitle, showKeyStream = false) {
      this.bodyEl.innerHTML = '';
      if (subtitle) {this.appendSubtitle(subtitle);}

      const wrapper = document.createElement('div');
      wrapper.className = 'viz-mapping';

      const inLine = document.createElement('div');
      inLine.className = 'viz-line viz-input';
      inLine.appendChild(this.buildInlineChars(input, 'violet'));

      const outLine = document.createElement('div');
      outLine.className = 'viz-line viz-output';
      outLine.appendChild(this.buildInlineChars(output, 'green'));

      wrapper.appendChild(inLine);
      wrapper.appendChild(this.buildArrow());
      wrapper.appendChild(outLine);

      if (showKeyStream) {
        const hint = document.createElement('div');
        hint.className = 'viz-hint';
        hint.textContent = 'Соответствие посимвольно (небуквенные символы не меняются)';
        wrapper.appendChild(hint);
      }

      this.bodyEl.appendChild(wrapper);
    }

    /**
     * Рендеринг шифра Цезаря с оптимизированными таблицами
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} subtitle - Подзаголовок
     */
    renderCaesar(input, output, subtitle) {
      this.clearContainer(this.bodyEl);
      if (subtitle) {this.appendSubtitle(subtitle);}

      const table = this.createOptimizedTable(input, output, 50);
      this.bodyEl.appendChild(table);
    }

    /**
     * Создание оптимизированной таблицы с DocumentFragment
     */
    createOptimizedTable(input, output, maxRows = 50) {
      const table = document.createElement('table');
      table.className = 'viz-table';
      table.setAttribute('role', 'table');
      table.setAttribute('aria-label', 'Таблица соответствия символов');
      
      // Создаем заголовок
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      
      const inputHeader = document.createElement('th');
      inputHeader.textContent = 'Символ (вход)';
      inputHeader.setAttribute('scope', 'col');
      
      const arrowHeader = document.createElement('th');
      arrowHeader.textContent = '→';
      arrowHeader.setAttribute('scope', 'col');
      
      const outputHeader = document.createElement('th');
      outputHeader.textContent = 'Символ (выход)';
      outputHeader.setAttribute('scope', 'col');
      
      headerRow.appendChild(inputHeader);
      headerRow.appendChild(arrowHeader);
      headerRow.appendChild(outputHeader);
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Создаем тело таблицы
      const tbody = document.createElement('tbody');
      const len = Math.min(input.length, output.length, maxRows);
      
      // Используем DocumentFragment для оптимизации
      const fragment = document.createDocumentFragment();
      
      for (let i = 0; i < len; i++) {
        const row = this.templateEngine.createTableRowElement(input[i], output[i]);
        row.setAttribute('data-index', i);
        fragment.appendChild(row);
      }
      
      tbody.appendChild(fragment);
      table.appendChild(tbody);
      
      return table;
    }

    /**
     * Рендеринг шифра Виженера
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} key - Ключ
     */
    renderVigenere(input, output, key) {
      this.bodyEl.innerHTML = '';
      if (key) {this.appendSubtitle(`Ключ: ${key}`);}

      const mappingWrapper = document.createElement('div');
      mappingWrapper.className = 'viz-mapping';

      // Строка входа
      const inLine = document.createElement('div');
      inLine.className = 'viz-line viz-input';
      inLine.appendChild(this.buildInlineChars(input, 'violet'));

      // Строка ключа (повтор ключа до длины входа)
      const keyLine = document.createElement('div');
      keyLine.className = 'viz-line';
      keyLine.appendChild(this.buildInlineChars(this.repeatKey(key, input.length), 'violet'));

      // Строка результата
      const outLine = document.createElement('div');
      outLine.className = 'viz-line viz-output';
      outLine.appendChild(this.buildInlineChars(output, 'green'));

      mappingWrapper.appendChild(inLine);
      mappingWrapper.appendChild(keyLine);
      mappingWrapper.appendChild(outLine);

      this.bodyEl.appendChild(mappingWrapper);
    }

    /**
     * Рендеринг Base64
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     */
    renderBase64(input, output) {
      this.bodyEl.innerHTML = '';
      
      const kv = document.createElement('div');
      kv.className = 'viz-kv';
      kv.innerHTML = `
        ${this.templateEngine.createKeyValueRow('Длина входа', `${input.length} символов`)}
        ${this.templateEngine.createKeyValueRow('Длина результата', `${output.length} символов`)}
        ${this.templateEngine.createKeyValueRow('Соотношение', '~ 4 / 3')}
      `;
      this.bodyEl.appendChild(kv);
      this.renderSimple(input, output);
    }

    /**
     * Рендеринг AES
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     */
    renderAES(input, output) {
      this.renderSummary(input, output, 'AES-256 (превью)');
    }

    /**
     * Рендеринг многоэтапного режима
     * @param {string} input - Входной текст
     * @param {string} output - Результат
     * @param {string} key - Ключ
     */
    renderMulti(input, output) {
      this.renderSimple(input, output, 'Многоэтапный режим');
    }

    /**
     * Повторение ключа до нужной длины
     * @param {string} key - Ключ
     * @param {number} length - Требуемая длина
     * @returns {string} Расширенный ключ
     */
    repeatKey(key, length) {
      if (!key) {return '';}
      let res = '';
      for (let i = 0; i < length; i++) {res += key[i % key.length];}
      return res;
    }

    /**
     * Добавление подзаголовка
     * @param {string} text - Текст подзаголовка
     */
    appendSubtitle(text) {
      const el = document.createElement('div');
      el.className = 'viz-subtitle';
      el.textContent = text;
      this.bodyEl.appendChild(el);
    }

    /**
     * Создание блока с текстом с улучшенной доступностью
     * @param {string} title - Заголовок блока
     * @param {string} text - Содержимое блока
     * @param {string} color - Цвет блока
     * @returns {HTMLElement} Созданный блок
     */
    buildBlock(title, text, color) {
      const block = document.createElement('div');
      block.className = 'viz-block';
      block.setAttribute('role', 'region');
      block.setAttribute('aria-labelledby', `block-title-${Date.now()}`);
      
      const header = document.createElement('div');
      header.className = 'viz-block-title';
      header.id = `block-title-${Date.now()}`;
      header.textContent = title;
      
      const content = document.createElement('pre');
      content.className = `viz-pre viz-${color}`;
      content.textContent = text ?? '';
      content.setAttribute('aria-label', `${title}: ${text?.substring(0, 100) || 'пустой блок'}`);
      
      block.appendChild(header);
      block.appendChild(content);
      return block;
    }

    /**
     * Создание inline символов с оптимизацией
     * @param {string} text - Текст для отображения
     * @param {string} color - Цвет символов
     * @returns {DocumentFragment} Фрагмент с символами
     */
    buildInlineChars(text, color) {
      const frag = document.createDocumentFragment();
      
      // Используем виртуализацию для больших текстов
      if (text.length > VisualizationConfig.VIRTUAL_THRESHOLD) {
        return this.buildVirtualChars(text, color);
      }
      
      const slice = text.slice(0, VisualizationConfig.MAX_CHARS);
      
      for (let i = 0; i < slice.length; i++) {
        const span = document.createElement('span');
        span.className = `viz-ch viz-${color}`;
        span.textContent = slice[i];
        frag.appendChild(span);
      }
      
      if (text.length > VisualizationConfig.MAX_CHARS) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        frag.appendChild(dots);
      }
      
      return frag;
    }

    /**
     * Создание виртуализированных символов
     * @param {string} text - Текст для отображения
     * @param {string} color - Цвет символов
     * @returns {DocumentFragment} Фрагмент с символами
     */
    buildVirtualChars(text, color) {
      const frag = document.createDocumentFragment();
      const container = document.createElement('div');
      container.className = 'virtual-chars-container';
      
      // Создаем виртуальный рендерер
      if (!this.virtualRenderer) {
        this.virtualRenderer = new VirtualRenderer(container);
      }
      
      // Подготавливаем данные для виртуализации
      const chars = Array.from(text).map(char => {
        const span = document.createElement('span');
        span.className = `viz-ch viz-${color}`;
        span.textContent = char;
        return span.outerHTML;
      });
      
      this.virtualRenderer.setData(chars);
      frag.appendChild(container);
      
      return frag;
    }

    /**
     * Создание стрелки
     * @returns {HTMLElement} Элемент стрелки
     */
    buildArrow() {
      const el = document.createElement('div');
      el.className = 'viz-arrow';
      el.innerHTML = '<i class="fas fa-arrow-right"></i>';
      return el;
    }

    /**
     * Получение информации о текущем состоянии
     * @returns {Object} Информация о состоянии
     */
    getState() {
      return {
        isRendering: this.isRendering,
        currentData: this.currentData,
        registeredAlgorithms: Array.from(this.algorithmRegistry.keys()),
        isVisible: this.sectionEl?.classList.contains('show') || false,
        themeConfig: this.themeConfig,
        asyncRenderer: {
          isRendering: this.asyncRenderer.isRendering,
          queueLength: this.asyncRenderer.renderQueue.length
        }
      };
    }

    /**
     * Применение кастомных CSS переменных для темы
     */
    applyTheme() {
      if (!this.sectionEl) return;
      
      const root = this.sectionEl;
      const colors = this.themeConfig.colors;
      
      // Применяем CSS переменные
      root.style.setProperty('--viz-input-color', colors.input);
      root.style.setProperty('--viz-output-color', colors.output);
      root.style.setProperty('--viz-key-color', colors.key);
      root.style.setProperty('--viz-arrow-color', colors.arrow);
    }

    /**
     * Обновление конфигурации визуализации
     */
    updateConfig(newConfig) {
      Object.assign(VisualizationConfig, newConfig);
    }
  }

  /**
   * Инициализация единственного экземпляра
   * @returns {Visualization} Экземпляр визуализации
   */
  function ensureInstance() {
    if (!window.visualization) {
      window.visualization = new Visualization();
      window.visualization.clear();
    }
    return window.visualization;
  }

  /**
   * Публичное API с расширенными возможностями
   */
  window.VisualizationAPI = {
    /**
     * Рендеринг визуализации
     * @param {string} algorithm - Название алгоритма
     * @param {string} operation - Операция
     * @param {string} input - Входной текст
     * @param {string} key - Ключ
     * @param {string} output - Результат
     */
    render(algorithm, operation, input, key, output) {
      ensureInstance().render(algorithm, operation, input, key, output);
    },

    /**
     * Очистка визуализации
     */
    clear() {
      ensureInstance().clear();
    },

    /**
     * Регистрация нового алгоритма
     * @param {string} name - Название алгоритма
     * @param {Function} renderFunction - Функция рендеринга
     */
    registerAlgorithm(name, renderFunction) {
      ensureInstance().registerAlgorithm(name, renderFunction);
    },

    /**
     * Получение состояния визуализации
     * @returns {Object} Состояние
     */
    getState() {
      return ensureInstance().getState();
    },

    /**
     * Получение конфигурации
     * @returns {Object} Конфигурация
     */
    getConfig() {
      return VisualizationConfig;
    },

    /**
     * Установка темы
     * @param {Object} themeConfig - Конфигурация темы
     */
    setTheme(themeConfig) {
      ensureInstance().setTheme(themeConfig);
      ensureInstance().applyTheme();
    },

    /**
     * Обновление конфигурации
     * @param {Object} newConfig - Новая конфигурация
     */
    updateConfig(newConfig) {
      ensureInstance().updateConfig(newConfig);
    },

    /**
     * Создание LazyLoader для больших данных
     * @param {HTMLElement} container - Контейнер
     * @param {number} pageSize - Размер страницы
     * @returns {LazyLoader} Экземпляр LazyLoader
     */
    createLazyLoader(container, pageSize) {
      return new LazyLoader(container, pageSize);
    },

    /**
     * Создание VirtualRenderer для виртуализации
     * @param {HTMLElement} container - Контейнер
     * @param {number} itemHeight - Высота элемента
     * @returns {VirtualRenderer} Экземпляр VirtualRenderer
     */
    createVirtualRenderer(container, itemHeight) {
      return new VirtualRenderer(container, itemHeight);
    },

    /**
     * Обновление алгоритма (для совместимости)
     * @param {string} algorithm - Название алгоритма
     * @param {Object} algorithmInfo - Информация об алгоритме
     */
    updateAlgorithm(algorithm, algorithmInfo) {
      // Метод для совместимости с существующим кодом
      console.log(`Обновление алгоритма: ${algorithm}`, algorithmInfo);
    },

    /**
     * Переключение видимости визуализации
     * @param {boolean} visible - Показать/скрыть
     */
    toggleVisibility(visible) {
      const instance = ensureInstance();
      if (visible) {
        instance.show();
      } else {
        instance.hide();
      }
    },

    /**
     * Проверка видимости визуализации
     * @returns {boolean} Видима ли визуализация
     */
    isVisible() {
      return ensureInstance().sectionEl?.classList.contains('show') || false;
    }
  };
})();
