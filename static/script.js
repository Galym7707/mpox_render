document.addEventListener('DOMContentLoaded', () => {
  const bodyRoot = document.getElementById('root-body');
  const themeToggleCheckbox = document.getElementById('theme-toggle-btn');

  const translations = {
    en: { result: "Prediction", confidence: "Confidence", causes: "Causes", symptoms: "Symptoms", prevention: "Prevention", treatment: "Treatment", noData: "No data available", fileNotChosen: "No file chosen", submit: "Submit", clearData: "Clear Data", uploadError: "Failed to upload the image.", processing: "Processing..." },
    ru: { result: "Предсказание", confidence: "Уверенность", causes: "Причины", symptoms: "Симптомы", prevention: "Профилактика", treatment: "Лечение", noData: "Нет данных", fileNotChosen: "Файл не выбран", submit: "Отправить", clearData: "Очистить данные", uploadError: "Ошибка загрузки изображения.", processing: "Обработка..." },
    kk: { result: "Болжам", confidence: "Сенімділік", causes: "Себептер", symptoms: "Симптомдар", prevention: "Алдын алу", treatment: "Емдеу", noData: "Мәлімет жоқ", fileNotChosen: "Файл таңдалмаған", submit: "Жіберу", clearData: "Деректерді тазалау", uploadError: "Кескінді жүктеу қатесі.", processing: "Өңдеуде..." }
  };

  let lang = new URLSearchParams(window.location.search).get('lang') || 'en';

  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('uploaded-image');
  const fileChosen = document.getElementById('file-chosen');
  const resultContainer = document.getElementById('result');
  const clearBtn = document.getElementById('button-clear');

  clearBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileChosen.textContent = translations[lang].fileNotChosen;
    resultContainer.innerHTML = '';
  });

  fileInput.addEventListener('change', () => {
    fileChosen.textContent = fileInput.files.length ? fileInput.files[0].name : translations[lang].fileNotChosen;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileInput.files.length) {
      alert(translations[lang].uploadError);
      return;
    }

    resultContainer.innerHTML = `<p>${translations[lang].processing}</p>`;

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      resultContainer.innerHTML = `<p style="color:red;">${data.error}</p>`;
      return;
    }

    displayPrediction(data);
  });

  function displayPrediction(data) {
    resultContainer.innerHTML = `
      <img src="${data.image_url}" class="uploaded-image">
      <div class="disease-info">
        <h2>${translations[lang].result}: ${data.prediction}</h2>
        <p><strong>${translations[lang].confidence}:</strong> ${data.confidence}%</p>
        ${formatList(data.info.Symptoms, translations[lang].symptoms)}
        ${formatList(data.info.Causes, translations[lang].causes)}
        ${formatList(data.info.Prevention, translations[lang].prevention)}
        <p><strong>${translations[lang].treatment}:</strong> ${data.info.Treatment || translations[lang].noData}</p>
      </div>
    `;
  }

  function formatList(items, title) {
    if (items && items.length) {
      return `<h4>${title}:</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }
    return `<h4>${title}:</h4><p>${translations[lang].noData}</p>`;
  }

  // Dark mode по умолчанию
  themeToggleCheckbox.checked = true;
  bodyRoot.classList.add('dark-theme');
  themeToggleCheckbox.addEventListener('change', () => {
    bodyRoot.classList.toggle('dark-theme', themeToggleCheckbox.checked);
    bodyRoot.classList.toggle('light-theme', !themeToggleCheckbox.checked);
  });
});
