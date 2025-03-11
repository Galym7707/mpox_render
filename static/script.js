document.addEventListener('DOMContentLoaded', () => {
  const bodyRoot = document.getElementById('root-body');
  const themeToggleCheckbox = document.getElementById('theme-toggle-btn'); // Это <input type="checkbox">
  
  // 1) Создаём объект переводов (теперь добавляем nightMode).
  const translations = {
    en: {
      home: "Home",
      ourTeam: "Our Team",
      contactUs: "Contact Us",
      language: "Language",
      nightMode: "Night Mode",           // <--- новый ключ
      aiExplanation: "AI Explanation",
      askAI: "Ask AI",
      typeQuestion: "Type your question here...",
      result: "Prediction",
      confidence: "Confidence",
      causes: "Causes",
      symptoms: "Symptoms",
      prevention: "Prevention",
      treatment: "Treatment",
      noData: "No data available",
      fileNotChosen: "No file chosen",
      uploadImage: "Upload an Image",
      submit: "Submit",
      clearData: "Clear Data",
      selectFile: "Choose file",
      error: "Error",
      uploadError: "Failed to upload the image.",
      processing: "Processing..."
    },
    ru: {
      home: "Главная",
      ourTeam: "Наша команда",
      contactUs: "Контакты",
      language: "Язык",
      nightMode: "Ночной режим",         // <--- новый ключ
      aiExplanation: "AI Пояснение",
      askAI: "Спросить AI",
      typeQuestion: "Введите ваш вопрос...",
      result: "Предсказание",
      confidence: "Уверенность",
      causes: "Причины",
      symptoms: "Симптомы",
      prevention: "Профилактика",
      treatment: "Лечение",
      noData: "Нет данных",
      fileNotChosen: "Файл не выбран",
      uploadImage: "Загрузите изображение",
      submit: "Отправить",
      clearData: "Очистить данные",
      selectFile: "Выберите файл",
      error: "Ошибка",
      uploadError: "Ошибка загрузки изображения.",
      processing: "Обработка..."
    },
    kk: {
      home: "Басты бет",
      ourTeam: "Біздің команда",
      contactUs: "Байланыс",
      language: "Тілі",
      nightMode: "Түнгі режим",          // <--- новый ключ
      aiExplanation: "AI Түсініктеме",
      askAI: "AI-дан сұрау",
      typeQuestion: "Сұрағыңызды осында жазыңыз...",
      result: "Болжам",
      confidence: "Сенімділік",
      causes: "Себептер",
      symptoms: "Симптомдар",
      prevention: "Алдын алу",
      treatment: "Емдеу",
      noData: "Мәлімет жоқ",
      fileNotChosen: "Файл таңдалмаған",
      uploadImage: "Суретті жүктеп салу",
      submit: "Жіберу",
      clearData: "Деректерді тазалау",
      selectFile: "Файлды таңдаңыз",
      error: "Қате",
      uploadError: "Кескінді жүктеу қатесі.",
      processing: "Өңдеуде..."
    }
  };

  // 2) Определяем язык из ?lang=..
  let currentLanguage = new URLSearchParams(window.location.search).get('lang') || 'en';
  if (!translations[currentLanguage]) {
    currentLanguage = 'en';
  }

  // Элементы, с которыми будем работать
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('uploaded-image');
  const dragAndDropArea = document.getElementById('drag-and-drop-area');
  const fileLabel = document.getElementById('file-label');
  const fileChosen = document.getElementById('file-chosen');
  const resultContainer = document.getElementById('result');
  const submitBtn = document.getElementById('button-submit');
  const clearBtn = document.getElementById('button-clear');
  const aiAskBtn = document.getElementById('ai-ask-btn');
  const aiQuestion = document.getElementById('ai-question');
  const aiAnswer = document.getElementById('ai-answer');
  
  const homeLink = document.querySelector('a[href=\"#hero-section\"]');
  const teamLink = document.querySelector('a[href=\"#team-section\"]');
  const contactLink = document.querySelector('a[href=\"#contact-section\"]');
  const fileInputLabel = document.querySelector("label[for='uploaded-image']");
  
  const aiTitle = document.querySelector('.ai-container h2');

  // Лейбл Night Mode
  const nightModeLabel = document.getElementById('night-mode-label');

  // 3) Функция для применения переводов
  function applyTranslations() {
    const t = translations[currentLanguage];
    if (!t) return;

    // Заполняем
    if (fileLabel) fileLabel.textContent = t.uploadImage;
    if (fileChosen && !fileInput.files.length) {
      fileChosen.textContent = t.fileNotChosen;
    }
    if (submitBtn) submitBtn.textContent = t.submit;
    if (clearBtn) clearBtn.textContent = t.clearData;

    if (homeLink) homeLink.textContent = t.home;
    if (teamLink) teamLink.textContent = t.ourTeam;
    if (contactLink) contactLink.textContent = t.contactUs;
    if (fileInputLabel) fileInputLabel.textContent = t.selectFile;

    // Night Mode label
    if (nightModeLabel) nightModeLabel.textContent = t.nightMode;

    // Результат: заменить на локализованные "Prediction:", "Confidence:", ...
    const resultHeaders = resultContainer.querySelectorAll('.disease-info h2, .disease-info h4');
    resultHeaders.forEach(header => {
      if (header.textContent.includes('Prediction:')) {
        header.textContent = header.textContent.replace('Prediction', t.result);
      }
      if (header.textContent.includes('Confidence:')) {
        header.textContent = header.textContent.replace('Confidence', t.confidence);
      }
      if (header.textContent.includes('Causes:')) {
        header.textContent = header.textContent.replace('Causes', t.causes);
      }
      if (header.textContent.includes('Symptoms:')) {
        header.textContent = header.textContent.replace('Symptoms', t.symptoms);
      }
      if (header.textContent.includes('Prevention:')) {
        header.textContent = header.textContent.replace('Prevention', t.prevention);
      }
      if (header.textContent.includes('Treatment:')) {
        header.textContent = header.textContent.replace('Treatment', t.treatment);
      }
    });

    // Если текст 'No data available'
    const noDataEl = resultContainer.querySelectorAll('.disease-info p');
    noDataEl.forEach(p => {
      if (p.textContent.includes('No data available')) {
        p.textContent = t.noData;
      }
    });

    // AI блок
    if (aiTitle) aiTitle.textContent = t.aiExplanation;
    if (aiQuestion) aiQuestion.placeholder = t.typeQuestion;
    if (aiAskBtn) aiAskBtn.textContent = t.askAI;
  }

  // 4) Инициируем переводы
  applyTranslations();

  // 5) Тумблер смены темы (checkbox). 
  // ✅ Исправлено: теперь используется правильная переменная themeToggleCheckbox
  if (themeToggleCheckbox) {
    
    // Проверяем состояние чекбокса при загрузке страницы
    function setTheme(isDark) {
      if (isDark) {
        bodyRoot.classList.add('dark-theme');
        bodyRoot.classList.remove('light-theme');
      } else {
        bodyRoot.classList.add('light-theme');
        bodyRoot.classList.remove('dark-theme');
      }
    }

    // Изначально устанавливаем тему на основе состояния чекбокса
    setTheme(themeToggleCheckbox.checked);

    // При изменении чекбокса переключаем тему
    themeToggleCheckbox.addEventListener('change', (event) => {
      setTheme(event.target.checked);
    });
  }

  // 6) Кнопка Очистки
  clearBtn.addEventListener('click', () => {
    fileInput.value = '';
    if (fileChosen) fileChosen.textContent = 'No file chosen';
    if (resultContainer) resultContainer.innerHTML = '';
  });

  // 7) Обновление текста при выборе файла
  fileInput.addEventListener('change', () => {
    fileChosen.textContent = fileInput.files.length > 0
      ? fileInput.files[0].name
      : 'No file chosen';
  });

  // 8) Drag & Drop
  dragAndDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragAndDropArea.classList.add('dragover');
  });
  dragAndDropArea.addEventListener('dragleave', () => {
    dragAndDropArea.classList.remove('dragover');
  });
  dragAndDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragAndDropArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      fileChosen.textContent = files[0].name;
    }
  });

  // 9) Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fileInput.files.length) {
      alert('Please select a file');
      return;
    }
    resultContainer.innerHTML = '<p>Processing...</p>';
  
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
  
    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData
      });
  
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        throw new Error(`Failed to parse JSON. Response was: ${text}`);
      }
  
      if (!response.ok) {
        resultContainer.innerHTML = `<p style="color:red;">Error: ${data.error || 'Something went wrong'}</p>`;
        return;
      }
  
      displayPrediction(data);
    } catch (err) {
      console.error(err);
      resultContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  });  

  // 10) Отображение результата
  function displayPrediction(data) {
      resultContainer.innerHTML = '';

      if (data.image_url) {
          const uploadedImage = document.createElement('img');
          uploadedImage.src = data.image_url;
          uploadedImage.className = 'uploaded-image';
          resultContainer.appendChild(uploadedImage);
      }

      const { prediction, confidence, info, translated_prediction } = data;
      const diseaseInfo = document.createElement('div');
      diseaseInfo.className = 'disease-info';

      const t = translations[currentLanguage];

      diseaseInfo.innerHTML = `
        <h2>${t.result}: ${translated_prediction}</h2>
        <p><strong>${t.confidence}:</strong> ${confidence}%</p>
      `;

      if (info) {
        if (info.Symptoms) diseaseInfo.innerHTML += formatList(info.Symptoms, t.symptoms);
        if (info.Causes) diseaseInfo.innerHTML += formatList(info.Causes, t.causes);
        if (info.Prevention) diseaseInfo.innerHTML += formatList(info.Prevention, t.prevention);
        if (info.Treatment) diseaseInfo.innerHTML += `<p><strong>${t.treatment}:</strong> ${info.Treatment}</p>`;
      }

      resultContainer.appendChild(diseaseInfo);
      applyTranslations();
  }

  // 11) Хелпер для списков
  function formatList(items, title) {
    if (Array.isArray(items) && items.length > 0) {
      return `<h4>${title}:</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
    }
    return `<h4>${title}:</h4><p>No data available.</p>`;
  }

  // Если нужно AI-логика
  if (aiAskBtn) {
    aiAskBtn.addEventListener('click', () => {
      const question = aiQuestion.value.trim();
      if (!question) {
        aiAnswer.innerHTML = '<p style=\"color:red;\">Please enter question</p>';
        return;
      }
      // demo
      aiAnswer.innerHTML = `<p>AI answer (demo) for: ${question}</p>`;
    });
  }
});
