// Визуализация алгоритмов шифрования: подстроки входа (фиолетовый) и результата (зелёный)
// Неблокирующий рендер с деградацией для длинных строк

(function () {
  class Visualization {
    constructor() {
      this.container = document.getElementById("visualizationContainer");
      this.titleEl = document.getElementById("visualizationTitle");
      this.bodyEl = document.getElementById("visualizationBody");
      this.sectionEl = document.querySelector('.visualization-section');
    }

    clear() {
      if (!this.bodyEl) return;
      this.bodyEl.innerHTML =
        '<p style="text-align: center; color: var(--text-secondary);">Нет данных для визуализации</p>';
      if (this.titleEl) this.titleEl.textContent = "Визуализация";
      this.hide();
    }

    // Главная точка входа
    render(algorithm, operation, input, key, output) {
      if (!this.bodyEl || !this.titleEl) return;
      this.show();

      const algoNames = {
        caesar: "Шифр Цезаря",
        vigenere: "Шифр Виженера",
        base64: "Base64",
        aes: "AES-256",
        multi: "Многоэтапное"
      };
      this.titleEl.textContent = `${algoNames[algorithm] || algorithm} — ${
        operation === "encrypt" ? "Шифрование" : "Расшифровка"
      }`;

      // Деградация при очень длинных строках
      const MAX_LEN = 3000; // жёсткий лимит, чтобы не подвесить UI
      const PREVIEW = 400; // показываем только начало/конец
      let truncated = false;
      let inText = input ?? "";
      let outText = output ?? "";
      if (inText.length > MAX_LEN || outText.length > MAX_LEN) {
        inText = this.buildPreview(inText, PREVIEW);
        outText = this.buildPreview(outText, PREVIEW);
        truncated = true;
      }

      switch (algorithm) {
        case "caesar":
          this.renderCaesar(inText, outText, key ? `Сдвиг: ${key}` : "");
          break;
        case "vigenere":
          this.renderVigenere(inText, outText, key || "");
          break;
        case "base64":
          this.renderBase64(inText, outText);
          break;
        case "aes":
          this.renderAES(inText, outText);
          break;
        case "multi":
          this.renderSimple(inText, outText, "Многоэтапный режим");
          break;
        default:
          this.renderSimple(inText, outText, key ? `Ключ: ${key}` : "");
      }

      if (truncated) {
        const note = document.createElement("div");
        note.style.cssText = "margin-top: 0.5rem; color: var(--text-secondary); font-size: 0.85rem;";
        note.textContent = "Показана укороченная визуализация для длинного текста.";
        this.bodyEl.appendChild(note);
      }
    }

    show() {
      if (this.sectionEl) this.sectionEl.classList.add('show');
    }

    hide() {
      if (this.sectionEl) this.sectionEl.classList.remove('show');
    }

    buildPreview(text, preview) {
      if (text.length <= preview * 2 + 10) return text;
      return text.slice(0, preview) + "\n…\n" + text.slice(-preview);
    }

    renderSimple(input, output, subtitle) {
      this.bodyEl.innerHTML = "";
      if (subtitle) this.appendSubtitle(subtitle);
      this.bodyEl.appendChild(this.buildBlock("Вход", input, "violet"));
      this.bodyEl.appendChild(this.buildArrow());
      this.bodyEl.appendChild(this.buildBlock("Результат", output, "green"));
    }

    renderSummary(input, output, subtitle) {
      this.bodyEl.innerHTML = "";
      if (subtitle) this.appendSubtitle(subtitle);
      const stats = document.createElement("div");
      stats.className = "viz-stats";
      stats.innerHTML = `
        <div><span>Длина входа:</span> ${input.length}</div>
        <div><span>Длина результата:</span> ${output.length}</div>
      `;
      this.bodyEl.appendChild(stats);
      this.bodyEl.appendChild(this.buildBlock("Вход (превью)", input, "violet"));
      this.bodyEl.appendChild(this.buildArrow());
      this.bodyEl.appendChild(this.buildBlock("Результат (превью)", output, "green"));
    }

    renderCharMapping(input, output, subtitle, showKeyStream = false) {
      this.bodyEl.innerHTML = "";
      if (subtitle) this.appendSubtitle(subtitle);

      const wrapper = document.createElement("div");
      wrapper.className = "viz-mapping";

      const inLine = document.createElement("div");
      inLine.className = "viz-line viz-input";
      inLine.appendChild(this.buildInlineChars(input, "violet"));

      const outLine = document.createElement("div");
      outLine.className = "viz-line viz-output";
      outLine.appendChild(this.buildInlineChars(output, "green"));

      wrapper.appendChild(inLine);
      wrapper.appendChild(this.buildArrow());
      wrapper.appendChild(outLine);

      if (showKeyStream) {
        const hint = document.createElement("div");
        hint.className = "viz-hint";
        hint.textContent = "Соответствие посимвольно (небуквенные символы не меняются)";
        wrapper.appendChild(hint);
      }

      this.bodyEl.appendChild(wrapper);
    }

    // Caesar: отображаем верх/низ алфавита и сдвиг
    renderCaesar(input, output, subtitle) {
      this.bodyEl.innerHTML = "";
      if (subtitle) this.appendSubtitle(subtitle);
      // Таблица соответствия вход→выход
      this.renderCharMapping(input, output);

      const table = document.createElement('table');
      table.className = 'viz-table';
      table.innerHTML = `
        <thead>
          <tr><th>Символ (вход)</th><th>→</th><th>Символ (выход)</th></tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');
      const len = Math.min(input.length, output.length, 50);
      for (let i = 0; i < len; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="viz-violet viz-badge">${this.escape(input[i])}</td><td>→</td><td class="viz-green viz-badge">${this.escape(output[i])}</td>`;
        tbody.appendChild(tr);
      }
      this.bodyEl.appendChild(table);
    }

    // Vigenere: показываем поток ключа
    renderVigenere(input, output, key) {
      this.bodyEl.innerHTML = "";
      if (key) this.appendSubtitle(`Ключ: ${key}`);

      const mappingWrapper = document.createElement('div');
      mappingWrapper.className = 'viz-mapping';

      // Строка входа
      const inLine = document.createElement('div');
      inLine.className = 'viz-line viz-input';
      inLine.appendChild(this.buildInlineChars(input, 'violet'));

      // Строка ключа (повтор ключа до длины входа, для визуала)
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

    repeatKey(key, length) {
      if (!key) return '';
      let res = '';
      for (let i = 0; i < length; i++) res += key[i % key.length];
      return res;
    }

    // Base64: визуализация 3 байта → 4 символа
    renderBase64(input, output) {
      this.bodyEl.innerHTML = '';
      const kv = document.createElement('div');
      kv.className = 'viz-kv';
      kv.innerHTML = `
        <div>Длина входа</div><div>${input.length} символов</div>
        <div>Длина результата</div><div>${output.length} символов</div>
        <div>Соотношение</div><div>~ 4 / 3</div>
      `;
      this.bodyEl.appendChild(kv);
      this.renderSimple(input, output);
    }

    // AES: сводка
    renderAES(input, output) {
      this.renderSummary(input, output, 'AES-256 (превью)');
    }

    escape(ch) {
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      if (ch === '&') return '&amp;';
      return ch;
    }

    appendSubtitle(text) {
      const el = document.createElement("div");
      el.className = "viz-subtitle";
      el.textContent = text;
      this.bodyEl.appendChild(el);
    }

    buildBlock(title, text, color) {
      const block = document.createElement("div");
      block.className = "viz-block";
      const header = document.createElement("div");
      header.className = "viz-block-title";
      header.textContent = title;
      const content = document.createElement("pre");
      content.className = `viz-pre viz-${color}`;
      content.textContent = text ?? "";
      block.appendChild(header);
      block.appendChild(content);
      return block;
    }

    buildInlineChars(text, color) {
      const frag = document.createDocumentFragment();
      const MAX_CHARS = 1000; // ограничим количество спанов для производительности
      const slice = text.slice(0, MAX_CHARS);
      for (let i = 0; i < slice.length; i++) {
        const span = document.createElement("span");
        span.className = `viz-ch viz-${color}`;
        span.textContent = slice[i];
        frag.appendChild(span);
      }
      if (text.length > MAX_CHARS) {
        const dots = document.createElement("span");
        dots.textContent = "…";
        frag.appendChild(dots);
      }
      return frag;
    }

    buildArrow() {
      const el = document.createElement("div");
      el.className = "viz-arrow";
      el.innerHTML = '<i class="fas fa-arrow-right"></i>';
      return el;
    }
  }

  // Инициализация единственного экземпляра
  function ensureInstance() {
    if (!window.visualization) {
      window.visualization = new Visualization();
      window.visualization.clear();
    }
    return window.visualization;
  }

  // Публичное API
  window.VisualizationAPI = {
    render(algorithm, operation, input, key, output) {
      ensureInstance().render(algorithm, operation, input, key, output);
    },
    clear() {
      ensureInstance().clear();
    }
  };
})();


