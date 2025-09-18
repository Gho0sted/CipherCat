// Основная логика приложения
class CoderDecoderApp {
  constructor() {
    this.currentAlgorithm = "caesar";
    this.isDarkTheme = false;
    this.multiStepMode = false; // Режим многоэтапного шифрования
    this.encryptionSteps = []; // Шаги шифрования
    this.stepHistory = []; // История выполненных этапов
    this.activeNotifications = new Set(); // Активные уведомления
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateKeyInfo();
    this.updateCharCounts();
    this.loadTheme();

    // Убеждаемся, что поле ввода ключа доступно при инициализации
    const keyInput = document.getElementById("keyInput");
    if (keyInput) {
      keyInput.disabled = false;
    }
  }

  bindEvents() {
    // Выбор алгоритма
    document.querySelectorAll(".algorithm-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        this.selectAlgorithm(e.currentTarget.dataset.algorithm);
      });
    });

    // Генерация ключа
    document.getElementById("generateKeyBtn").addEventListener("click", () => {
      this.generateKey();
    });

    // Ввод ключа
    document.getElementById("keyInput").addEventListener("input", (e) => {
      console.log(
        "Key input changed:",
        e.target.value,
        "Disabled:",
        e.target.disabled
      );
      this.updateKeyInfo();
    });

    // Дополнительная проверка для поля ввода ключа
    document.getElementById("keyInput").addEventListener("focus", (e) => {
      console.log("Key input focused, disabled:", e.target.disabled);
    });

    document.getElementById("keyInput").addEventListener("click", (e) => {
      console.log("Key input clicked, disabled:", e.target.disabled);
      if (e.target.disabled) {
        console.log("Key input is disabled, trying to enable...");
        e.target.disabled = false;
      }
    });

    // Обработка текста
    document.getElementById("encryptBtn").addEventListener("click", () => {
      this.processText("encrypt");
    });

    document.getElementById("decryptBtn").addEventListener("click", () => {
      this.processText("decrypt");
    });

    // События текстовых областей
    document.getElementById("inputText").addEventListener("input", () => {
      this.updateCharCounts();
    });

    document.getElementById("outputText").addEventListener("input", () => {
      this.updateCharCounts();
    });

    // Операции с файлами
    document.getElementById("loadFileBtn").addEventListener("click", () => {
      this.loadFile();
    });

    document.getElementById("saveFileBtn").addEventListener("click", () => {
      this.saveFile();
    });

    // Кнопки очистки
    document.getElementById("clearInputBtn").addEventListener("click", () => {
      this.clearInput();
    });

    document.getElementById("copyResultBtn").addEventListener("click", () => {
      this.copyResult();
    });

    // Обмен текстом между полями
    document.getElementById("swapTextBtn").addEventListener("click", () => {
      this.swapText();
    });

    // Переключение темы
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.toggleTheme();
    });

    // Модальное окно "О программе"
    document.getElementById("aboutBtn").addEventListener("click", () => {
      this.showAboutModal();
    });

    document.getElementById("closeAboutModal").addEventListener("click", () => {
      this.hideAboutModal();
    });

    // Закрытие модального окна по клику вне его
    document.getElementById("aboutModal").addEventListener("click", (e) => {
      if (e.target.id === "aboutModal") {
        this.hideAboutModal();
      }
    });

    // Многоэтапное шифрование
    document.getElementById("addStepBtn").addEventListener("click", () => {
      this.addEncryptionStep();
    });

    document.getElementById("clearStepsBtn").addEventListener("click", () => {
      this.clearEncryptionSteps();
    });

    document.getElementById("clearHistoryBtn").addEventListener("click", () => {
      this.clearStepHistory();
    });

    // Горячие клавиши
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "e":
            e.preventDefault();
            this.processText("encrypt");
            break;
          case "d":
            e.preventDefault();
            this.processText("decrypt");
            break;
          case "s":
            e.preventDefault();
            this.saveFile();
            break;
          case "o":
            e.preventDefault();
            this.loadFile();
            break;
        }
      }
    });
  }

  selectAlgorithm(algorithm) {
    // Обновление визуального выбора
    document.querySelectorAll(".algorithm-card").forEach((card) => {
      card.classList.remove("active");
    });
    document
      .querySelector(`[data-algorithm="${algorithm}"]`)
      .classList.add("active");

    this.currentAlgorithm = algorithm;
    this.multiStepMode = algorithm === "multi";

    // Показываем/скрываем соответствующие секции
    this.updateUIForAlgorithm();
    this.updateKeyInfo();

    // Убеждаемся, что поле ввода доступно для редактирования
    const keyInput = document.getElementById("keyInput");
    if (algorithm !== "base64" && algorithm !== "multi") {
      keyInput.disabled = false;
      keyInput.focus();
    }

    if (algorithm !== "multi") {
      this.generateKey(); // Автоматическая генерация подходящего ключа
    }
  }

  updateUIForAlgorithm() {
    const keySection = document.getElementById("keySection");
    const multiStepSection = document.getElementById("multiStepSection");
    const stepsHistory = document.getElementById("stepsHistory");

    if (this.multiStepMode) {
      keySection.style.display = "none";
      multiStepSection.style.display = "block";
      stepsHistory.style.display =
        this.stepHistory.length > 0 ? "block" : "none";
    } else {
      keySection.style.display = "block";
      multiStepSection.style.display = "none";
      stepsHistory.style.display = "none";
    }
  }

  updateKeyInfo() {
    const keyInfo = document.getElementById("keyInfo");
    const keyInput = document.getElementById("keyInput");
    const algorithm = this.currentAlgorithm;

    // Обновление подсказки и информационного текста
    const info = CryptoUtils.getKeyInfo(algorithm);
    keyInfo.querySelector("span").textContent = info;

    // Обновление placeholder для ввода
    switch (algorithm) {
      case "caesar":
        keyInput.placeholder = "Введите число от 1 до 33...";
        keyInput.type = "number";
        keyInput.min = "1";
        keyInput.max = "33";
        keyInput.disabled = false;
        break;
      case "vigenere":
      case "aes":
        keyInput.placeholder = "Введите ключ...";
        keyInput.type = "text";
        keyInput.removeAttribute("min");
        keyInput.removeAttribute("max");
        keyInput.disabled = false;
        break;
      case "base64":
        keyInput.placeholder = "Base64 не требует ключа";
        keyInput.type = "text";
        keyInput.disabled = true;
        keyInput.value = "";
        break;
    }

    // Показать/скрыть секцию ключа для base64
    const keySection = document.getElementById("keySection");
    if (algorithm === "base64") {
      keySection.style.display = "none";
    } else {
      keySection.style.display = "block";
    }
  }

  generateKey() {
    const keyInput = document.getElementById("keyInput");
    const algorithm = this.currentAlgorithm;

    // Убеждаемся, что поле ввода активно
    keyInput.disabled = false;
    keyInput.focus();

    switch (algorithm) {
      case "caesar":
        keyInput.value = CryptoUtils.generateRandomShift();
        break;
      case "vigenere":
      case "aes":
        keyInput.value = CryptoUtils.generateRandomKey(16);
        break;
      case "base64":
        keyInput.value = "";
        keyInput.disabled = true;
        break;
    }

    this.updateKeyInfo();
  }

  async processText(operation) {
    const inputText = document.getElementById("inputText").value;
    const outputText = document.getElementById("outputText");

    if (!inputText.trim()) {
      this.showNotification("Введите текст для обработки", "warning");
      return;
    }

    // Показать состояние загрузки
    const button =
      operation === "encrypt"
        ? document.getElementById("encryptBtn")
        : document.getElementById("decryptBtn");

    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div> Обработка...';
    button.disabled = true;

    try {
      let result;
      let log = [];

      if (this.multiStepMode) {
        // Многоэтапное шифрование
        if (this.encryptionSteps.length === 0) {
          this.showNotification(
            "Добавьте хотя бы один этап шифрования",
            "warning"
          );
          return;
        }

        // Валидация всех этапов
        for (const step of this.encryptionSteps) {
          if (step.algorithm !== "base64" && !step.key.trim()) {
            this.showNotification(
              `Введите ключ для этапа ${step.algorithm}`,
              "warning"
            );
            return;
          }
          if (!CryptoUtils.validateKey(step.algorithm, step.key)) {
            this.showNotification(
              `Неверный формат ключа для этапа ${step.algorithm}`,
              "error"
            );
            return;
          }
        }

        const enableLogging = document.getElementById("enableLogging").checked;
        const steps = this.encryptionSteps.map((s) => ({
          algorithm: s.algorithm,
          key: s.key,
        }));

        if (operation === "encrypt") {
          const resultObj = await CryptoUtils.multiStepEncrypt(
            inputText,
            steps,
            enableLogging
          );
          result = resultObj.result;
          log = resultObj.log;
        } else {
          const resultObj = await CryptoUtils.multiStepDecrypt(
            inputText,
            steps,
            enableLogging
          );
          result = resultObj.result;
          log = resultObj.log;
        }

        // Сохраняем логи в историю
        if (enableLogging && log.length > 0) {
          this.stepHistory = [...this.stepHistory, ...log];
          this.updateStepHistoryDisplay();
        }
      } else {
        // Обычное шифрование
        const key = document.getElementById("keyInput").value;

        if (this.currentAlgorithm !== "base64" && !key.trim()) {
          this.showNotification("Введите ключ шифрования", "warning");
          return;
        }

        // Валидация ключа
        if (!CryptoUtils.validateKey(this.currentAlgorithm, key)) {
          this.showNotification("Неверный формат ключа", "error");
          return;
        }

        if (operation === "encrypt") {
          result = await CryptoUtils.encrypt(
            inputText,
            this.currentAlgorithm,
            key
          );
        } else {
          result = await CryptoUtils.decrypt(
            inputText,
            this.currentAlgorithm,
            key
          );
        }
      }

      outputText.value = result;
      this.updateCharCounts();

      if (result) {
        const message = this.multiStepMode
          ? `Текст успешно ${
              operation === "encrypt" ? "зашифрован" : "расшифрован"
            } в ${this.encryptionSteps.length} этапов`
          : `Текст успешно ${
              operation === "encrypt" ? "зашифрован" : "расшифрован"
            }`;

        this.showNotification(message, "success");
      } else {
        this.showNotification("Ошибка при обработке текста", "error");
      }
    } catch (error) {
      console.error("Ошибка обработки:", error);
      this.showNotification(
        `Ошибка при обработке текста: ${error.message}`,
        "error"
      );
    } finally {
      // Восстановление состояния кнопки
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  updateCharCounts() {
    const inputText = document.getElementById("inputText").value;
    const outputText = document.getElementById("outputText").value;

    document.getElementById("inputCharCount").textContent = inputText.length;
    document.getElementById("outputCharCount").textContent = outputText.length;
  }

  clearInput() {
    document.getElementById("inputText").value = "";
    document.getElementById("outputText").value = "";
    this.updateCharCounts();
    this.showNotification("Текст очищен", "success");
  }

  swapText() {
    const inputText = document.getElementById("inputText");
    const outputText = document.getElementById("outputText");

    // Меняем местами содержимое полей
    const tempText = inputText.value;
    inputText.value = outputText.value;
    outputText.value = tempText;

    // Обновляем счетчики символов
    this.updateCharCounts();

    this.showNotification("Текст поменялся местами", "success");
  }

  async copyResult() {
    const outputText = document.getElementById("outputText");

    if (!outputText.value.trim()) {
      this.showNotification("Нет результата для копирования", "warning");
      return;
    }

    try {
      await navigator.clipboard.writeText(outputText.value);
      this.showNotification("Результат скопирован в буфер обмена", "success");
    } catch (error) {
      console.error("Ошибка копирования:", error);
      this.showNotification("Ошибка при копировании", "error");
    }
  }

  async loadFile() {
    try {
      if (typeof window.electronAPI === "undefined") {
        throw new Error("Electron API недоступен");
      }

      const result = await window.electronAPI.openFile();

      if (result.success) {
        document.getElementById("inputText").value = result.content;
        this.updateCharCounts();
        this.showNotification("Файл загружен", "success");
      } else if (result.error !== "Open cancelled") {
        this.showNotification(`Ошибка загрузки: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Ошибка загрузки файла:", error);
      this.showNotification("Ошибка при загрузке файла", "error");
    }
  }

  async saveFile() {
    const outputText = document.getElementById("outputText");

    if (!outputText.value.trim()) {
      this.showNotification("Нет результата для сохранения", "warning");
      return;
    }

    try {
      if (typeof window.electronAPI === "undefined") {
        throw new Error("Electron API недоступен");
      }

      let contentToSave = outputText.value;

      // Проверяем, нужно ли сохранять метаданные
      const saveMetadata = document.getElementById("saveMetadata")?.checked;

      if (
        saveMetadata &&
        this.multiStepMode &&
        this.encryptionSteps.length > 0
      ) {
        // Создаем метаданные для многоэтапного шифрования
        const metadata = CryptoUtils.createMetadata(
          this.encryptionSteps.map((s) => ({
            algorithm: s.algorithm,
            key: s.key,
          })),
          this.stepHistory,
          document.getElementById("inputText").value,
          outputText.value
        );

        // Формируем содержимое файла с метаданными
        contentToSave = `=== МЕТАДАННЫЕ ШИФРОВАНИЯ ===
Версия: ${metadata.version}
Дата: ${new Date(metadata.timestamp).toLocaleString()}
Количество этапов: ${metadata.statistics.stepsCount}
Исходная длина: ${metadata.statistics.originalLength} символов
Итоговая длина: ${metadata.statistics.finalLength} символов

=== ЭТАПЫ ШИФРОВАНИЯ ===
${metadata.steps
  .map(
    (step) =>
      `Этап ${step.step}: ${step.algorithmName} (${step.keyType}: ${step.key})`
  )
  .join("\n")}

=== ИСТОРИЯ ВЫПОЛНЕНИЯ ===
${metadata.log
  .map(
    (log) =>
      `Этап ${log.step}: ${log.algorithmName} - ${
        log.operation === "encrypt" ? "Шифрование" : "Расшифровка"
      } (${log.inputLength} → ${log.outputLength} символов)`
  )
  .join("\n")}

=== ЗАШИФРОВАННЫЙ ТЕКСТ ===
${outputText.value}`;
      }

      const result = await window.electronAPI.saveFile(contentToSave);

      if (result.success) {
        const message =
          saveMetadata && this.multiStepMode
            ? "Файл с метаданными сохранен"
            : "Файл сохранен";
        this.showNotification(message, "success");
      } else {
        this.showNotification(`Ошибка сохранения: ${result.error}`, "error");
      }
    } catch (error) {
      console.error("Ошибка сохранения файла:", error);
      this.showNotification("Ошибка при сохранении файла", "error");
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.documentElement.setAttribute(
      "data-theme",
      this.isDarkTheme ? "dark" : "light"
    );

    const themeIcon = document.querySelector("#themeToggle i");
    themeIcon.className = this.isDarkTheme ? "fas fa-sun" : "fas fa-moon";

    localStorage.setItem("theme", this.isDarkTheme ? "dark" : "light");

    // Показываем уведомление только один раз, без накопления
    this.showNotification(
      `Переключено на ${this.isDarkTheme ? "темную" : "светлую"} тему`,
      "info"
    );
  }

  loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      this.isDarkTheme = true;
      document.documentElement.setAttribute("data-theme", "dark");
      document.querySelector("#themeToggle i").className = "fas fa-sun";
    }
  }

  showAboutModal() {
    document.getElementById("aboutModal").classList.add("show");
  }

  hideAboutModal() {
    document.getElementById("aboutModal").classList.remove("show");
  }

  showNotification(message, type = "info") {
    // Удаляем все существующие уведомления того же типа
    this.clearNotificationsByType(type);

    // Создание элемента уведомления
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

    // Добавляем обработчик клика для закрытия
    const closeButton = notification.querySelector(".notification-close");
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeNotification(notification);
    });

    // Добавляем обработчик клика на само уведомление для закрытия
    notification.addEventListener("click", () => {
      this.removeNotification(notification);
    });

    // Вычисляем позицию для избежания наложения
    const topOffset = 20 + this.activeNotifications.size * 70;

    // Добавление стилей
    notification.style.cssText = `
            position: fixed;
            top: ${topOffset}px;
            right: 20px;
            background: var(--surface-color);
            color: var(--text-primary);
            padding: 1rem 1.5rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid var(--${
              type === "error"
                ? "error"
                : type === "warning"
                ? "warning"
                : type === "success"
                ? "success"
                : "primary"
            }-color);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            z-index: 1001;
            animation: slideInRight 0.3s ease-out;
            max-width: 400px;
        `;

    document.body.appendChild(notification);
    this.activeNotifications.add(notification);

    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
      this.removeNotification(notification);
    }, 3000);
  }

  // Удаление конкретного уведомления
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.animation = "slideOutRight 0.3s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.activeNotifications.delete(notification);
        // Обновляем позиции оставшихся уведомлений
        this.updateNotificationPositions();
      }, 300);
    }
  }

  // Обновление позиций всех активных уведомлений
  updateNotificationPositions() {
    let index = 0;
    this.activeNotifications.forEach((notification) => {
      if (notification && notification.parentNode) {
        const topOffset = 20 + index * 70;
        notification.style.transition = "top 0.3s ease-out";
        notification.style.top = `${topOffset}px`;
        index++;
      }
    });
  }

  // Очистка уведомлений определенного типа
  clearNotificationsByType(type) {
    this.activeNotifications.forEach((notification) => {
      if (notification.classList.contains(`notification-${type}`)) {
        this.removeNotification(notification);
      }
    });
  }

  // Очистка всех уведомлений
  clearAllNotifications() {
    this.activeNotifications.forEach((notification) => {
      this.removeNotification(notification);
    });
  }

  getNotificationIcon(type) {
    switch (type) {
      case "success":
        return "check-circle";
      case "error":
        return "exclamation-circle";
      case "warning":
        return "exclamation-triangle";
      default:
        return "info-circle";
    }
  }

  // Методы для многоэтапного шифрования
  addEncryptionStep() {
    const stepNumber = this.encryptionSteps.length + 1;
    const stepId = `step-${stepNumber}`;

    const stepElement = document.createElement("div");
    stepElement.className = "step-item";
    stepElement.id = stepId;
    stepElement.innerHTML = `
      <div class="step-number">${stepNumber}</div>
      <div class="step-content">
        <select class="step-algorithm" data-step-algorithm>
          <option value="caesar">Шифр Цезаря</option>
          <option value="vigenere">Шифр Виженера</option>
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

    document.getElementById("stepsContainer").appendChild(stepElement);

    // Добавляем обработчики событий для нового этапа
    this.bindStepEvents(stepElement);

    // Добавляем этап в массив
    this.encryptionSteps.push({
      id: stepId,
      algorithm: "caesar",
      key: "",
    });

    this.showNotification(`Добавлен этап ${stepNumber}`, "success");
  }

  bindStepEvents(stepElement) {
    const algorithmSelect = stepElement.querySelector("[data-step-algorithm]");
    const keyInput = stepElement.querySelector("[data-step-key]");
    const generateBtn = stepElement.querySelector("[data-generate-step-key]");
    const removeBtn = stepElement.querySelector("[data-remove-step]");

    algorithmSelect.addEventListener("change", (e) => {
      const stepId = stepElement.id;
      const stepIndex = this.encryptionSteps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        this.encryptionSteps[stepIndex].algorithm = e.target.value;
        this.updateStepKeyPlaceholder(keyInput, e.target.value);
      }
    });

    keyInput.addEventListener("input", (e) => {
      const stepId = stepElement.id;
      const stepIndex = this.encryptionSteps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        this.encryptionSteps[stepIndex].key = e.target.value;
      }
    });

    generateBtn.addEventListener("click", () => {
      const algorithm = algorithmSelect.value;
      const generatedKey = this.generateKeyForAlgorithm(algorithm);
      keyInput.value = generatedKey;

      const stepId = stepElement.id;
      const stepIndex = this.encryptionSteps.findIndex((s) => s.id === stepId);
      if (stepIndex !== -1) {
        this.encryptionSteps[stepIndex].key = generatedKey;
      }
    });

    removeBtn.addEventListener("click", () => {
      this.removeEncryptionStep(stepElement);
    });

    // Инициализируем placeholder
    this.updateStepKeyPlaceholder(keyInput, algorithmSelect.value);
  }

  updateStepKeyPlaceholder(keyInput, algorithm) {
    const placeholders = {
      caesar: "Введите число от 1 до 33...",
      vigenere: "Введите ключевое слово...",
      base64: "Base64 не требует ключа",
      aes: "Введите пароль...",
    };

    keyInput.placeholder = placeholders[algorithm] || "Введите ключ...";
    keyInput.disabled = algorithm === "base64";
  }

  generateKeyForAlgorithm(algorithm) {
    switch (algorithm) {
      case "caesar":
        return CryptoUtils.generateRandomShift().toString();
      case "vigenere":
      case "aes":
        return CryptoUtils.generateRandomKey(16);
      case "base64":
        return "";
      default:
        return "";
    }
  }

  removeEncryptionStep(stepElement) {
    const stepId = stepElement.id;
    const stepIndex = this.encryptionSteps.findIndex((s) => s.id === stepId);

    if (stepIndex !== -1) {
      this.encryptionSteps.splice(stepIndex, 1);
      stepElement.remove();

      // Обновляем номера этапов
      this.updateStepNumbers();
      this.showNotification("Этап удален", "success");
    }
  }

  updateStepNumbers() {
    const stepElements = document.querySelectorAll(".step-item");
    stepElements.forEach((element, index) => {
      const stepNumber = element.querySelector(".step-number");
      stepNumber.textContent = index + 1;
    });
  }

  clearEncryptionSteps() {
    this.encryptionSteps = [];
    document.getElementById("stepsContainer").innerHTML = "";
    this.showNotification("Все этапы очищены", "success");
  }

  clearStepHistory() {
    this.stepHistory = [];
    this.updateStepHistoryDisplay();
    this.showNotification("История этапов очищена", "success");
  }

  updateStepHistoryDisplay() {
    const historyContent = document.getElementById("historyContent");
    const stepsHistory = document.getElementById("stepsHistory");

    if (this.stepHistory.length === 0) {
      historyContent.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary);">История этапов пуста</p>';
      stepsHistory.style.display = "none";
      return;
    }

    stepsHistory.style.display = "block";

    historyContent.innerHTML = this.stepHistory
      .map(
        (log) => `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-step-info">
            <div class="history-step-number">${log.step}</div>
            <div class="history-algorithm">${log.algorithmName}</div>
            <div class="history-key">Ключ: ${log.key}</div>
          </div>
          <div class="history-timestamp">${new Date(
            log.timestamp
          ).toLocaleString()}</div>
        </div>
        <div class="history-stats">
          <span><i class="fas fa-arrow-right"></i> ${log.inputLength} → ${
          log.outputLength
        } символов</span>
          <span><i class="fas fa-${
            log.operation === "encrypt" ? "lock" : "unlock"
          }"></i> ${
          log.operation === "encrypt" ? "Шифрование" : "Расшифровка"
        }</span>
        </div>
      </div>
    `
      )
      .join("");
  }
}

// Добавление анимаций уведомлений в CSS
const style = document.createElement("style");
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
document.addEventListener("DOMContentLoaded", () => {
  new CoderDecoderApp();
});
