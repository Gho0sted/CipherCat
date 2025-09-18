// Утилиты для различных алгоритмов шифрования
class CryptoUtils {
    // Алфавиты для разных языков
    static ALPHABETS = {
        russian: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ',
        russianLower: 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя',
        english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        englishLower: 'abcdefghijklmnopqrstuvwxyz'
    };

    // Безопасный модуль для корректной работы с отрицательными числами
    static safeMod(a, b) {
        return ((a % b) + b) % b;
    }

    // Сдвиг символа в алфавите
    static shiftChar(char, shift, alphabet) {
        const index = alphabet.indexOf(char);
        if (index === -1) return char;
        
        const newIndex = this.safeMod(index + shift, alphabet.length);
        return alphabet[newIndex];
    }

    // Получение алфавита для символа
    static getAlphabetForChar(char) {
        const code = char.charCodeAt(0);
        
        // Русские заглавные буквы (включая Ё)
        if (code >= 1040 && code <= 1071) {
            return this.ALPHABETS.russian;
        }
        // Русские строчные буквы (включая ё)
        else if (code >= 1072 && code <= 1103) {
            return this.ALPHABETS.russianLower;
        }
        // Английские заглавные буквы
        else if (code >= 65 && code <= 90) {
            return this.ALPHABETS.english;
        }
        // Английские строчные буквы
        else if (code >= 97 && code <= 122) {
            return this.ALPHABETS.englishLower;
        }
        
        return null;
    }

    // Шифр Цезаря
    static caesarEncrypt(text, shift) {
        if (!text || typeof shift !== 'number') return '';
        
        return text.split('').map(char => {
            const alphabet = this.getAlphabetForChar(char);
            if (!alphabet) return char;
            
            return this.shiftChar(char, shift, alphabet);
        }).join('');
    }

    static caesarDecrypt(text, shift) {
        return this.caesarEncrypt(text, -shift);
    }

    // Шифр Виженера
    static vigenereEncrypt(text, key) {
        if (!text || !key) return '';
        
        // Нормализуем ключ - оставляем только буквы
        const normalizedKey = key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '');
        if (!normalizedKey) return text;
        
        let keyIndex = 0;
        
        return text.split('').map(char => {
            const alphabet = this.getAlphabetForChar(char);
            if (!alphabet) return char;
            
            // Получаем символ ключа для текущей позиции
            const keyChar = normalizedKey[keyIndex % normalizedKey.length];
            const keyAlphabet = this.getAlphabetForChar(keyChar);
            
            if (!keyAlphabet) return char;
            
            // Находим сдвиг в алфавите ключа
            const shift = keyAlphabet.indexOf(keyChar);
            if (shift === -1) return char;
            
            // Сдвигаем символ в его алфавите
            const result = this.shiftChar(char, shift, alphabet);
            
            // Переходим к следующему символу ключа только для букв
            keyIndex++;
            
            return result;
        }).join('');
    }

    static vigenereDecrypt(text, key) {
        if (!text || !key) return '';
        
        // Нормализуем ключ - оставляем только буквы
        const normalizedKey = key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '');
        if (!normalizedKey) return text;
        
        let keyIndex = 0;
        
        return text.split('').map(char => {
            const alphabet = this.getAlphabetForChar(char);
            if (!alphabet) return char;
            
            // Получаем символ ключа для текущей позиции
            const keyChar = normalizedKey[keyIndex % normalizedKey.length];
            const keyAlphabet = this.getAlphabetForChar(keyChar);
            
            if (!keyAlphabet) return char;
            
            // Находим сдвиг в алфавите ключа
            const shift = keyAlphabet.indexOf(keyChar);
            if (shift === -1) return char;
            
            // Сдвигаем символ в обратную сторону в его алфавите
            const result = this.shiftChar(char, -shift, alphabet);
            
            // Переходим к следующему символу ключа только для букв
            keyIndex++;
            
            return result;
        }).join('');
    }

    // Base64 кодирование/декодирование с поддержкой браузера и Node.js
    static base64Encode(text) {
        try {
            if (typeof window !== 'undefined' && window.btoa) {
                // Браузер
                return btoa(unescape(encodeURIComponent(text)));
            } else {
                // Node.js
                const Buffer = require('buffer').Buffer;
                return Buffer.from(text, 'utf8').toString('base64');
            }
        } catch (error) {
            console.error('Ошибка Base64 кодирования:', error);
            return '';
        }
    }

    static base64Decode(text) {
        try {
            if (typeof window !== 'undefined' && window.atob) {
                // Браузер
                return decodeURIComponent(escape(atob(text)));
            } else {
                // Node.js
                const Buffer = require('buffer').Buffer;
                return Buffer.from(text, 'base64').toString('utf8');
            }
        } catch (error) {
            console.error('Ошибка Base64 декодирования:', error);
            return '';
        }
    }

    // Константы для AES
    static AES_CONFIG = {
        VERSION: 0x01,
        SALT_LENGTH: 16,
        IV_LENGTH: 12,
        TAG_LENGTH: 16,
        PBKDF2_ITERATIONS: 200000, // Увеличено для безопасности
        KEY_LENGTH: 256
    };

    // AES-256-GCM шифрование с PBKDF2 (WebCrypto API)
    static async aesEncrypt(text, password) {
        try {
            if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
                throw new Error('WebCrypto API не поддерживается');
            }

            // Генерируем соль и IV
            const salt = window.crypto.getRandomValues(new Uint8Array(this.AES_CONFIG.SALT_LENGTH));
            const iv = window.crypto.getRandomValues(new Uint8Array(this.AES_CONFIG.IV_LENGTH));

            // Получаем ключ из пароля с помощью PBKDF2
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.AES_CONFIG.PBKDF2_ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: this.AES_CONFIG.KEY_LENGTH },
                false,
                ['encrypt']
            );

            // Шифруем текст
            const encrypted = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                new TextEncoder().encode(text)
            );

            // Формат пакета: version(1B) | salt(16B) | iv(12B) | ciphertext(n) | tag(16B)
            const result = new Uint8Array(1 + this.AES_CONFIG.SALT_LENGTH + this.AES_CONFIG.IV_LENGTH + encrypted.byteLength);
            let offset = 0;
            
            // Версия
            result[offset++] = this.AES_CONFIG.VERSION;
            
            // Соль
            result.set(salt, offset);
            offset += this.AES_CONFIG.SALT_LENGTH;
            
            // IV
            result.set(iv, offset);
            offset += this.AES_CONFIG.IV_LENGTH;
            
            // Зашифрованные данные (включая тег)
            result.set(new Uint8Array(encrypted), offset);

            // Возвращаем в Base64
            return this.arrayBufferToBase64(result);
        } catch (error) {
            console.error('Ошибка AES шифрования:', error);
            throw new Error('Ошибка шифрования: ' + error.message);
        }
    }

    static async aesDecrypt(encryptedData, password) {
        try {
            if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
                throw new Error('WebCrypto API не поддерживается');
            }

            // Декодируем из Base64
            const data = this.base64ToArrayBuffer(encryptedData);
            
            if (data.byteLength < 1 + this.AES_CONFIG.SALT_LENGTH + this.AES_CONFIG.IV_LENGTH) {
                throw new Error('Неверный формат зашифрованных данных');
            }

            let offset = 0;
            
            // Проверяем версию
            const version = data[offset++];
            if (version !== this.AES_CONFIG.VERSION) {
                throw new Error(`Неподдерживаемая версия формата: ${version}`);
            }
            
            // Извлекаем соль, IV и зашифрованные данные
            const salt = data.slice(offset, offset + this.AES_CONFIG.SALT_LENGTH);
            offset += this.AES_CONFIG.SALT_LENGTH;
            
            const iv = data.slice(offset, offset + this.AES_CONFIG.IV_LENGTH);
            offset += this.AES_CONFIG.IV_LENGTH;
            
            const encrypted = data.slice(offset);

            // Получаем ключ из пароля с помощью PBKDF2
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await window.crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.AES_CONFIG.PBKDF2_ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: this.AES_CONFIG.KEY_LENGTH },
                false,
                ['decrypt']
            );

            // Расшифровываем текст
            const decrypted = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encrypted
            );

            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('Ошибка AES расшифровки:', error);
            throw new Error('Ошибка расшифровки: ' + error.message);
        }
    }

    // Вспомогательные функции для работы с ArrayBuffer
    static arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    // Криптостойкая генерация случайных ключей
    static generateRandomKey(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
        let result = '';
        
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            // Используем криптостойкий RNG в браузере
            const randomValues = new Uint32Array(length);
            window.crypto.getRandomValues(randomValues);
            
            for (let i = 0; i < length; i++) {
                result += chars[randomValues[i] % chars.length];
            }
        } else {
            // Fallback для Node.js или старых браузеров
            const crypto = require('crypto');
            const randomBytes = crypto.randomBytes(length);
            for (let i = 0; i < length; i++) {
                result += chars[randomBytes[i] % chars.length];
            }
        }
        
        return result;
    }

    // Генерация случайного сдвига для шифра Цезаря
    static generateRandomShift() {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            // Используем криптостойкий RNG в браузере
            const randomValues = new Uint32Array(1);
            window.crypto.getRandomValues(randomValues);
            return (randomValues[0] % 25) + 1; // 1-25
        } else {
            // Fallback для Node.js
            const crypto = require('crypto');
            const randomBytes = crypto.randomBytes(1);
            return (randomBytes[0] % 25) + 1;
        }
    }

    // Валидация ключей для разных алгоритмов
    static validateKey(algorithm, key) {
        switch (algorithm) {
            case 'caesar':
                const num = parseInt(key);
                return !isNaN(num) && num >= 1 && num <= 33; // Поддержка кириллицы (33 символа)
            case 'vigenere':
                // Ключ должен содержать хотя бы одну букву
                return key && key.replace(/[^а-яёА-ЯЁa-zA-Z]/g, '').length > 0;
            case 'aes':
                // Минимальные требования к паролю
                return key && key.length >= 8 && this.hasPasswordComplexity(key);
            case 'base64':
                return true; // Base64 не требует ключа
            default:
                return false;
        }
    }

    // Проверка сложности пароля для AES
    static hasPasswordComplexity(password) {
        if (password.length < 12) return false; // Увеличено до 12 символов
        
        let hasLower = false;
        let hasUpper = false;
        let hasDigit = false;
        let hasSpecial = false;
        let hasCyrillic = false;
        
        for (const char of password) {
            if (char >= 'a' && char <= 'z') hasLower = true;
            else if (char >= 'A' && char <= 'Z') hasUpper = true;
            else if (char >= '0' && char <= '9') hasDigit = true;
            else if ('!@#$%^&*()_+-=[]{}|;:,.<>?'.includes(char)) hasSpecial = true;
            else if (char >= 'а' && char <= 'я') hasCyrillic = true;
            else if (char >= 'А' && char <= 'Я') hasCyrillic = true;
        }
        
        // Требуем минимум 3 из 5 критериев
        const criteria = [hasLower, hasUpper, hasDigit, hasSpecial, hasCyrillic].filter(Boolean).length;
        return criteria >= 3;
    }

    // Получение силы пароля (0-100)
    static getPasswordStrength(password) {
        if (!password) return 0;
        
        let score = 0;
        
        // Длина
        if (password.length >= 12) score += 20;
        else if (password.length >= 8) score += 10;
        
        // Разнообразие символов
        let hasLower = /[a-z]/.test(password);
        let hasUpper = /[A-Z]/.test(password);
        let hasDigit = /\d/.test(password);
        let hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
        let hasCyrillic = /[а-яА-Я]/.test(password);
        
        const charTypes = [hasLower, hasUpper, hasDigit, hasSpecial, hasCyrillic].filter(Boolean).length;
        score += charTypes * 15;
        
        // Дополнительные бонусы
        if (password.length >= 16) score += 10;
        if (password.length >= 20) score += 10;
        
        return Math.min(score, 100);
    }

    // Получение информации о ключах для разных алгоритмов
    static getKeyInfo(algorithm) {
        switch (algorithm) {
            case 'caesar':
                return 'Для шифра Цезаря введите число от 1 до 33 (сдвиг, учитывает кириллицу)';
            case 'vigenere':
                return 'Для шифра Виженера введите ключевое слово (минимум 1 буква)';
            case 'aes':
                return 'Для AES-256 введите пароль (минимум 8 символов, разнообразный)';
            case 'base64':
                return 'Base64 не требует ключа';
            default:
                return '';
        }
    }

    // Многоэтапное кодирование/декодирование
    static async multiStepEncrypt(text, steps) {
        if (!text || !Array.isArray(steps) || steps.length === 0) return text;
        
        let result = text;
        
        for (const step of steps) {
            const { algorithm, key } = step;
            if (!algorithm) continue;
            
            try {
                result = await this.encrypt(result, algorithm, key || '');
                if (!result) {
                    throw new Error(`Ошибка на шаге ${algorithm}`);
                }
            } catch (error) {
                console.error(`Ошибка многоэтапного шифрования на шаге ${algorithm}:`, error);
                return '';
            }
        }
        
        return result;
    }

    static async multiStepDecrypt(text, steps) {
        if (!text || !Array.isArray(steps) || steps.length === 0) return text;
        
        let result = text;
        
        // Выполняем шаги в обратном порядке
        for (let i = steps.length - 1; i >= 0; i--) {
            const step = steps[i];
            const { algorithm, key } = step;
            if (!algorithm) continue;
            
            try {
                result = await this.decrypt(result, algorithm, key || '');
                if (!result) {
                    throw new Error(`Ошибка на шаге ${algorithm}`);
                }
            } catch (error) {
                console.error(`Ошибка многоэтапного расшифровки на шаге ${algorithm}:`, error);
                return '';
            }
        }
        
        return result;
    }

    // Основной метод шифрования
    static async encrypt(text, algorithm, key) {
        if (!text) return '';
        
        try {
            switch (algorithm) {
                case 'caesar':
                    const shift = parseInt(key) || 1;
                    return this.caesarEncrypt(text, shift);
                case 'vigenere':
                    return this.vigenereEncrypt(text, key);
                case 'base64':
                    return this.base64Encode(text);
                case 'aes':
                    return await this.aesEncrypt(text, key);
                default:
                    throw new Error(`Неподдерживаемый алгоритм: ${algorithm}`);
            }
        } catch (error) {
            console.error(`Ошибка шифрования (${algorithm}):`, error);
            throw error;
        }
    }

    // Основной метод дешифрования
    static async decrypt(text, algorithm, key) {
        if (!text) return '';
        
        try {
            switch (algorithm) {
                case 'caesar':
                    const shift = parseInt(key) || 1;
                    return this.caesarDecrypt(text, shift);
                case 'vigenere':
                    return this.vigenereDecrypt(text, key);
                case 'base64':
                    return this.base64Decode(text);
                case 'aes':
                    return await this.aesDecrypt(text, key);
                default:
                    throw new Error(`Неподдерживаемый алгоритм: ${algorithm}`);
            }
        } catch (error) {
            console.error(`Ошибка дешифрования (${algorithm}):`, error);
            throw error;
        }
    }
}

// Экспорт для использования в основном приложении
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CryptoUtils;
}
