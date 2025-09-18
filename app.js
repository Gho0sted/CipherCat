// Основная логика приложения
class CoderDecoderApp {
    constructor() {
        this.currentAlgorithm = 'caesar';
        this.isDarkTheme = false;
        this.multiStepMode = false; // Режим многоэтапного шифрования
        this.encryptionSteps = []; // Шаги шифрования
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateKeyInfo();
        this.updateCharCounts();
        this.loadTheme();
    }

    bindEvents() {
        // Выбор алгоритма
        document.querySelectorAll('.algorithm-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectAlgorithm(e.currentTarget.dataset.algorithm);
            });
        });

        // Генерация ключа
        document.getElementById('generateKeyBtn').addEventListener('click', () => {
            this.generateKey();
        });

        // Ввод ключа
        document.getElementById('keyInput').addEventListener('input', () => {
            this.updateKeyInfo();
        });

        // Обработка текста
        document.getElementById('encryptBtn').addEventListener('click', () => {
            this.processText('encrypt');
        });

        document.getElementById('decryptBtn').addEventListener('click', () => {
            this.processText('decrypt');
        });

        // События текстовых областей
        document.getElementById('inputText').addEventListener('input', () => {
            this.updateCharCounts();
        });

        document.getElementById('outputText').addEventListener('input', () => {
            this.updateCharCounts();
        });

        // Операции с файлами
        document.getElementById('loadFileBtn').addEventListener('click', () => {
            this.loadFile();
        });

        document.getElementById('saveFileBtn').addEventListener('click', () => {
            this.saveFile();
        });

        // Кнопки очистки
        document.getElementById('clearInputBtn').addEventListener('click', () => {
            this.clearInput();
        });

        document.getElementById('copyResultBtn').addEventListener('click', () => {
            this.copyResult();
        });

        // Переключение темы
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Модальное окно "О программе"
        document.getElementById('aboutBtn').addEventListener('click', () => {
            this.showAboutModal();
        });

        document.getElementById('closeAboutModal').addEventListener('click', () => {
            this.hideAboutModal();
        });

        // Закрытие модального окна по клику вне его
        document.getElementById('aboutModal').addEventListener('click', (e) => {
            if (e.target.id === 'aboutModal') {
                this.hideAboutModal();
            }
        });

        // Горячие клавиши
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

    selectAlgorithm(algorithm) {
        // Обновление визуального выбора
        document.querySelectorAll('.algorithm-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-algorithm="${algorithm}"]`).classList.add('active');

        this.currentAlgorithm = algorithm;
        this.updateKeyInfo();
        this.generateKey(); // Автоматическая генерация подходящего ключа
    }

    updateKeyInfo() {
        const keyInfo = document.getElementById('keyInfo');
        const keyInput = document.getElementById('keyInput');
        const algorithm = this.currentAlgorithm;

        // Обновление подсказки и информационного текста
        const info = CryptoUtils.getKeyInfo(algorithm);
        keyInfo.querySelector('span').textContent = info;

        // Обновление placeholder для ввода
        switch (algorithm) {
            case 'caesar':
                keyInput.placeholder = 'Введите число от 1 до 33...';
                keyInput.type = 'number';
                keyInput.min = '1';
                keyInput.max = '33';
                break;
            case 'vigenere':
            case 'aes':
                keyInput.placeholder = 'Введите ключ...';
                keyInput.type = 'text';
                keyInput.removeAttribute('min');
                keyInput.removeAttribute('max');
                break;
            case 'base64':
                keyInput.placeholder = 'Base64 не требует ключа';
                keyInput.type = 'text';
                keyInput.disabled = true;
                break;
        }

        // Показать/скрыть секцию ключа для base64
        const keySection = document.getElementById('keySection');
        if (algorithm === 'base64') {
            keySection.style.display = 'none';
        } else {
            keySection.style.display = 'block';
        }
    }

    generateKey() {
        const keyInput = document.getElementById('keyInput');
        const algorithm = this.currentAlgorithm;

        switch (algorithm) {
            case 'caesar':
                keyInput.value = CryptoUtils.generateRandomShift();
                break;
            case 'vigenere':
            case 'aes':
                keyInput.value = CryptoUtils.generateRandomKey(16);
                break;
            case 'base64':
                keyInput.value = '';
                break;
        }

        this.updateKeyInfo();
    }

    async processText(operation) {
        const inputText = document.getElementById('inputText').value;
        const key = document.getElementById('keyInput').value;
        const outputText = document.getElementById('outputText');

        if (!inputText.trim()) {
            this.showNotification('Введите текст для обработки', 'warning');
            return;
        }

        if (this.currentAlgorithm !== 'base64' && !key.trim()) {
            this.showNotification('Введите ключ шифрования', 'warning');
            return;
        }

        // Валидация ключа
        if (!CryptoUtils.validateKey(this.currentAlgorithm, key)) {
            this.showNotification('Неверный формат ключа', 'error');
            return;
        }

        // Показать состояние загрузки
        const button = operation === 'encrypt' ? 
            document.getElementById('encryptBtn') : 
            document.getElementById('decryptBtn');
        
        const originalText = button.innerHTML;
        button.innerHTML = '<div class="loading"></div> Обработка...';
        button.disabled = true;

        try {
            let result;
            if (operation === 'encrypt') {
                result = await CryptoUtils.encrypt(inputText, this.currentAlgorithm, key);
            } else {
                result = await CryptoUtils.decrypt(inputText, this.currentAlgorithm, key);
            }

            outputText.value = result;
            this.updateCharCounts();

            if (result) {
                this.showNotification(
                    `Текст успешно ${operation === 'encrypt' ? 'зашифрован' : 'расшифрован'}`, 
                    'success'
                );
            } else {
                this.showNotification('Ошибка при обработке текста', 'error');
            }
        } catch (error) {
            console.error('Ошибка обработки:', error);
            this.showNotification(`Ошибка при обработке текста: ${error.message}`, 'error');
        } finally {
            // Восстановление состояния кнопки
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    updateCharCounts() {
        const inputText = document.getElementById('inputText').value;
        const outputText = document.getElementById('outputText').value;

        document.getElementById('inputCharCount').textContent = inputText.length;
        document.getElementById('outputCharCount').textContent = outputText.length;
    }

    clearInput() {
        document.getElementById('inputText').value = '';
        document.getElementById('outputText').value = '';
        this.updateCharCounts();
        this.showNotification('Текст очищен', 'success');
    }

    async copyResult() {
        const outputText = document.getElementById('outputText');
        
        if (!outputText.value.trim()) {
            this.showNotification('Нет результата для копирования', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(outputText.value);
            this.showNotification('Результат скопирован в буфер обмена', 'success');
        } catch (error) {
            console.error('Ошибка копирования:', error);
            this.showNotification('Ошибка при копировании', 'error');
        }
    }

    async loadFile() {
        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('open-file');
            
            if (result.success) {
                document.getElementById('inputText').value = result.content;
                this.updateCharCounts();
                this.showNotification('Файл загружен', 'success');
            } else if (result.error !== 'Open cancelled') {
                this.showNotification(`Ошибка загрузки: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            this.showNotification('Ошибка при загрузке файла', 'error');
        }
    }

    async saveFile() {
        const outputText = document.getElementById('outputText');
        
        if (!outputText.value.trim()) {
            this.showNotification('Нет результата для сохранения', 'warning');
            return;
        }

        try {
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke('save-file', outputText.value);
            
            if (result.success) {
                this.showNotification('Файл сохранен', 'success');
            } else {
                this.showNotification(`Ошибка сохранения: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Ошибка сохранения файла:', error);
            this.showNotification('Ошибка при сохранении файла', 'error');
        }
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
        
        localStorage.setItem('theme', this.isDarkTheme ? 'dark' : 'light');
        this.showNotification(
            `Переключено на ${this.isDarkTheme ? 'темную' : 'светлую'} тему`, 
            'success'
        );
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.isDarkTheme = true;
            document.documentElement.setAttribute('data-theme', 'dark');
            document.querySelector('#themeToggle i').className = 'fas fa-sun';
        }
    }

    showAboutModal() {
        document.getElementById('aboutModal').classList.add('show');
    }

    hideAboutModal() {
        document.getElementById('aboutModal').classList.remove('show');
    }

    showNotification(message, type = 'info') {
        // Создание элемента уведомления
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;

        // Добавление стилей
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--surface-color);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid var(--${type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'primary'}-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// Добавление анимаций уведомлений в CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    new CoderDecoderApp();
});
