// Модуль для управления историей с фильтрацией и поиском
class HistoryManager {
  constructor(options = {}) {
    this.history = [];
    this.filters = {
      algorithm: null,
      operation: null,
      dateFrom: null,
      dateTo: null,
      keyLength: null
    };
    this.searchQuery = '';
    this.sortBy = 'timestamp';
    this.sortOrder = 'desc';
    
    // Конфигурация
    this.config = {
      maxHistorySize: options.maxHistorySize || 1000, // Лимит истории
      enableSortingCache: options.enableSortingCache !== false, // Кэширование сортировки
      enableOptimizedSearch: options.enableOptimizedSearch !== false // Оптимизированный поиск
    };
    
    // Кэш для сортировки
    this.sortingCache = new Map();
    this.lastSortingKey = null;
  }

  // Добавить запись в историю (с лимитом)
  addEntry(entry) {
    const historyEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...entry
    };

    this.history.unshift(historyEntry); // Добавляем в начало
    
    // Применяем лимит истории
    if (this.history.length > this.config.maxHistorySize) {
      const removed = this.history.splice(this.config.maxHistorySize);
      this.emitHistoryTrimmed(removed);
    }
    
    // Инвалидируем кэш сортировки
    this.invalidateSortingCache();
    
    this.emitHistoryUpdated();
    
    return historyEntry;
  }

  // Получить историю с применением фильтров
  getFilteredHistory() {
    let filtered = [...this.history];

    // Применяем фильтры
    filtered = this.applyFilters(filtered);

    // Применяем поиск
    if (this.searchQuery) {
      filtered = this.applySearch(filtered);
    }

    // Применяем сортировку
    filtered = this.applySorting(filtered);

    return filtered;
  }

  // Применить фильтры
  applyFilters(history) {
    return history.filter(entry => {
      // Фильтр по алгоритму
      if (this.filters.algorithm && entry.algorithm !== this.filters.algorithm) {
        return false;
      }

      // Фильтр по операции
      if (this.filters.operation && entry.operation !== this.filters.operation) {
        return false;
      }

      // Фильтр по дате "от"
      if (this.filters.dateFrom) {
        const entryDate = new Date(entry.timestamp);
        const fromDate = new Date(this.filters.dateFrom);
        if (entryDate < fromDate) {
          return false;
        }
      }

      // Фильтр по дате "до"
      if (this.filters.dateTo) {
        const entryDate = new Date(entry.timestamp);
        const toDate = new Date(this.filters.dateTo);
        if (entryDate > toDate) {
          return false;
        }
      }

      // Фильтр по длине ключа
      if (this.filters.keyLength) {
        const keyLength = entry.key ? entry.key.length : 0;
        if (keyLength !== this.filters.keyLength) {
          return false;
        }
      }

      return true;
    });
  }

  // Применить поиск (оптимизированный)
  applySearch(history) {
    const query = this.searchQuery.toLowerCase();
    
    if (!this.config.enableOptimizedSearch) {
      return this._applySearchBasic(history, query);
    }
    
    return history.filter(entry => {
      // Используем локальные переменные для избежания повторных вычислений
      const algorithmLower = entry.algorithm.toLowerCase();
      const operationLower = entry.operation.toLowerCase();
      
      return (
        algorithmLower.includes(query) ||
        operationLower.includes(query) ||
        (entry.key && entry.key.toLowerCase().includes(query)) ||
        (entry.algorithmName && entry.algorithmName.toLowerCase().includes(query))
      );
    });
  }

  // Базовый поиск (для совместимости)
  _applySearchBasic(history, query) {
    return history.filter(entry => {
      return (
        entry.algorithm.toLowerCase().includes(query) ||
        entry.operation.toLowerCase().includes(query) ||
        (entry.key && entry.key.toLowerCase().includes(query)) ||
        (entry.algorithmName && entry.algorithmName.toLowerCase().includes(query))
      );
    });
  }

  // Применить сортировку (с кэшированием)
  applySorting(history) {
    if (!this.config.enableSortingCache) {
      return this._applySortingBasic(history);
    }

    // Создаем ключ кэша
    const sortingKey = `${this.sortBy}_${this.sortOrder}_${history.length}`;
    
    // Проверяем кэш
    if (this.sortingCache.has(sortingKey) && this.lastSortingKey === sortingKey) {
      return this.sortingCache.get(sortingKey);
    }

    // Выполняем сортировку
    const sorted = this._applySortingBasic(history);
    
    // Сохраняем в кэш
    this.sortingCache.set(sortingKey, sorted);
    this.lastSortingKey = sortingKey;
    
    return sorted;
  }

  // Базовая сортировка
  _applySortingBasic(history) {
    return history.sort((a, b) => {
      let aValue, bValue;

      switch (this.sortBy) {
      case 'timestamp':
        aValue = new Date(a.timestamp);
        bValue = new Date(b.timestamp);
        break;
      case 'algorithm':
        aValue = a.algorithm.toLowerCase();
        bValue = b.algorithm.toLowerCase();
        break;
      case 'operation':
        aValue = a.operation.toLowerCase();
        bValue = b.operation.toLowerCase();
        break;
      case 'inputLength':
        aValue = a.inputLength || 0;
        bValue = b.inputLength || 0;
        break;
      case 'outputLength':
        aValue = a.outputLength || 0;
        bValue = b.outputLength || 0;
        break;
      default:
        aValue = new Date(a.timestamp);
        bValue = new Date(b.timestamp);
      }

      if (this.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });
  }

  // Установить фильтр
  setFilter(filterName, value) {
    if (filterName in this.filters) {
      this.filters[filterName] = value;
      this.emitFiltersChanged();
    }
  }

  // Очистить фильтры
  clearFilters() {
    this.filters = {
      algorithm: null,
      operation: null,
      dateFrom: null,
      dateTo: null,
      keyLength: null
    };
    this.emitFiltersChanged();
  }

  // Установить поисковый запрос
  setSearchQuery(query) {
    this.searchQuery = query;
    this.emitSearchChanged();
  }

  // Установить сортировку
  setSorting(sortBy, sortOrder = 'desc') {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.invalidateSortingCache();
    this.emitSortingChanged();
  }

  // Инвалидация кэша сортировки
  invalidateSortingCache() {
    this.sortingCache.clear();
    this.lastSortingKey = null;
  }

  // Получить статистику
  getStatistics() {
    const total = this.history.length;
    const algorithmCounts = {};
    const operationCounts = {};
    let totalInputLength = 0;
    let totalOutputLength = 0;

    this.history.forEach(entry => {
      // Подсчет алгоритмов
      algorithmCounts[entry.algorithm] = (algorithmCounts[entry.algorithm] || 0) + 1;
      
      // Подсчет операций
      operationCounts[entry.operation] = (operationCounts[entry.operation] || 0) + 1;
      
      // Подсчет длин
      totalInputLength += entry.inputLength || 0;
      totalOutputLength += entry.outputLength || 0;
    });

    return {
      total,
      algorithmCounts,
      operationCounts,
      totalInputLength,
      totalOutputLength,
      averageInputLength: total > 0 ? Math.round(totalInputLength / total) : 0,
      averageOutputLength: total > 0 ? Math.round(totalOutputLength / total) : 0,
      mostUsedAlgorithm: Object.keys(algorithmCounts).reduce((a, b) => 
        algorithmCounts[a] > algorithmCounts[b] ? a : b, 'caesar'),
      mostUsedOperation: Object.keys(operationCounts).reduce((a, b) => 
        operationCounts[a] > operationCounts[b] ? a : b, 'encrypt')
    };
  }

  // Получить уникальные значения для фильтров
  getFilterOptions() {
    const algorithms = [...new Set(this.history.map(entry => entry.algorithm))];
    const operations = [...new Set(this.history.map(entry => entry.operation))];
    const keyLengths = [...new Set(this.history.map(entry => entry.key ? entry.key.length : 0))].sort((a, b) => a - b);

    return {
      algorithms,
      operations,
      keyLengths
    };
  }

  // Экспорт истории
  exportHistory(format = 'json') {
    const data = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalEntries: this.history.length,
      entries: this.history
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.exportToCSV(data.entries);
    }

    return null;
  }

  // Экспорт в CSV (с экранированием)
  exportToCSV(entries) {
    const headers = ['Дата', 'Алгоритм', 'Операция', 'Длина ключа', 'Длина входа', 'Длина выхода'];
    const rows = entries.map(entry => [
      new Date(entry.timestamp).toLocaleString(),
      entry.algorithm,
      entry.operation,
      entry.key ? entry.key.length : 0,
      entry.inputLength || 0,
      entry.outputLength || 0
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => this._escapeCSVValue(cell)).join(','))
      .join('\n');

    return csvContent;
  }

  // Экранирование значений для CSV
  _escapeCSVValue(value) {
    const stringValue = String(value);
    
    // Если значение содержит кавычки, запятые или переносы строк
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
      // Экранируем кавычки и оборачиваем в кавычки
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  // Очистить историю
  clearHistory() {
    this.history = [];
    this.emitHistoryCleared();
  }

  // Удалить запись
  removeEntry(id) {
    const index = this.history.findIndex(entry => entry.id === id);
    if (index !== -1) {
      const removed = this.history.splice(index, 1)[0];
      this.emitEntryRemoved(removed);
      return removed;
    }
    return null;
  }

  // Генерация ID
  generateId() {
    return `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // События
  emitHistoryUpdated() {
    const event = new CustomEvent('historyUpdated', {
      detail: { history: this.history, filteredHistory: this.getFilteredHistory() }
    });
    document.dispatchEvent(event);
  }

  emitHistoryCleared() {
    const event = new CustomEvent('historyCleared', {
      detail: { history: this.history }
    });
    document.dispatchEvent(event);
  }

  emitFiltersChanged() {
    const event = new CustomEvent('historyFiltersChanged', {
      detail: { filters: this.filters, filteredHistory: this.getFilteredHistory() }
    });
    document.dispatchEvent(event);
  }

  emitSearchChanged() {
    const event = new CustomEvent('historySearchChanged', {
      detail: { searchQuery: this.searchQuery, filteredHistory: this.getFilteredHistory() }
    });
    document.dispatchEvent(event);
  }

  emitSortingChanged() {
    const event = new CustomEvent('historySortingChanged', {
      detail: { sortBy: this.sortBy, sortOrder: this.sortOrder, filteredHistory: this.getFilteredHistory() }
    });
    document.dispatchEvent(event);
  }

  emitEntryRemoved(entry) {
    const event = new CustomEvent('historyEntryRemoved', {
      detail: { entry, history: this.history }
    });
    document.dispatchEvent(event);
  }

  emitHistoryTrimmed(removedEntries) {
    const event = new CustomEvent('historyTrimmed', {
      detail: { removedEntries, history: this.history }
    });
    document.dispatchEvent(event);
  }
}

export default HistoryManager;
