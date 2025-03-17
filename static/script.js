document.addEventListener('DOMContentLoaded', () => {
    const bodyRoot = document.getElementById('root-body');
    const themeToggleCheckbox = document.getElementById('theme-toggle-btn');
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('uploaded-image');
    const fileChosen = document.getElementById('file-chosen');
    const resultContainer = document.getElementById('result');
    const submitBtn = document.getElementById('button-submit');
    const clearBtn = document.getElementById('button-clear');
    const infoLanguageSelect = document.getElementById('info-language');

    const translations = {
        en: { result: "Prediction", confidence: "Confidence", causes: "Causes", symptoms: "Symptoms", prevention: "Prevention", treatment: "Treatment", noData: "No data available", fileNotChosen: "No file chosen", submit: "Submit", clearData: "Clear Data", uploadError: "Failed to upload the image.", processing: "Processing..." },
        ru: { result: "Предсказание", confidence: "Уверенность", causes: "Причины", symptoms: "Симптомы", prevention: "Профилактика", treatment: "Лечение", noData: "Нет данных", fileNotChosen: "Файл не выбран", submit: "Отправить", clearData: "Очистить данные", uploadError: "Ошибка загрузки изображения.", processing: "Обработка..." },
        kk: { result: "Болжам", confidence: "Сенімділік", causes: "Себептер", symptoms: "Симптомдар", prevention: "Алдын алу", treatment: "Емдеу", noData: "Мәлімет жоқ", fileNotChosen: "Файл таңдалмаған", submit: "Жіберу", clearData: "Деректерді тазалау", uploadError: "Кескінді жүктеу қатесі.", processing: "Өңдеуде..." }
    };

    let lang = new URLSearchParams(window.location.search).get('lang') || 'en';
    if (!translations[lang]) lang = 'en';

    // Устанавливаем тему по умолчанию
    themeToggleCheckbox.checked = true;
    bodyRoot.classList.add('dark-theme');

    themeToggleCheckbox.addEventListener('change', () => {
        bodyRoot.classList.toggle('dark-theme', themeToggleCheckbox.checked);
        bodyRoot.classList.toggle('light-theme', !themeToggleCheckbox.checked);
    });

    clearBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/clear', { method: 'POST' });
            const data = await response.json();
    
            if (data.error) {
                alert("Error: " + data.error);
                return;
            }
    
            // Обновляем UI после очистки
            fileInput.value = '';
            fileChosen.textContent = translations[lang].fileNotChosen;
            resultContainer.innerHTML = '';
    
            alert(translations[lang].clearData + " - " + data.message);
            location.reload(); // Перезагружаем страницу
        } catch (err) {
            alert("Error: " + err.message);
        }
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

        try {
            const res = await fetch('/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) {
                resultContainer.innerHTML = `<p style="color:red;">${data.error}</p>`;
                return;
            }

            displayPrediction(data);
            fetchPredictionWithLanguage(infoLanguageSelect?.value || lang);

        } catch (err) {
            resultContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        }
    });

    if (infoLanguageSelect) {
        infoLanguageSelect.addEventListener('change', () => {
            fetchPredictionWithLanguage(infoLanguageSelect.value);
        });
    }

    async function fetchPredictionWithLanguage(selectedLang) {
        const response = await fetch(`/get_info?lang=${selectedLang}`);
        const data = await response.json();

        if (data.error) {
            resultContainer.innerHTML = `<p style="color:red;">${data.error}</p>`;
            return;
        }

        displayPrediction(data);
    }

    function displayPrediction(data) {
        resultContainer.innerHTML = ''; 

        if (data.image_url) {
            const uploadedImage = document.createElement('img');
            uploadedImage.src = data.image_url;
            uploadedImage.className = 'uploaded-image';
            resultContainer.appendChild(uploadedImage);
        }

        const { prediction, confidence, info } = data;

        const diseaseInfoContainer = document.createElement('div');
        diseaseInfoContainer.className = "disease-info";

        let diseaseInfoHTML = `
            <h2>${translations[lang].result}: ${prediction}</h2>
            <p><strong>${translations[lang].confidence}:</strong> ${confidence}%</p>
            ${formatList(info?.Symptoms || [], translations[lang].symptoms)}
            ${formatList(info?.Causes || [], translations[lang].causes)}
            ${formatList(info?.Prevention || [], translations[lang].prevention)}
            <p><strong>${translations[lang].treatment}:</strong> ${info?.Treatment || translations[lang].noData}</p>
        `;

        diseaseInfoContainer.innerHTML = diseaseInfoHTML;
        resultContainer.appendChild(diseaseInfoContainer);
    }

    function formatList(items, title) {
        if (items.length > 0) {
            return `<h4>${title}:</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
        }
        return `<h4>${title}:</h4><p>${translations[lang].noData}</p>`;
    }

    function updateContactInfo() {
        const contactContainer = document.querySelector(".contact-list");
        if (!contactContainer) return;

        contactContainer.innerHTML = `
            <li>
                <img src="/static/img/email-icon.png" alt="Email" class="contact-icon">
                <strong>Email (Galym):</strong> galymtashtek@gmail.com
            </li>
            <li>
                <img src="/static/img/email-icon.png" alt="Email" class="contact-icon">
                <strong>Email (Artyom):</strong> mpoxdetection@gmail.com
            </li>
            <li>
                <img src="/static/img/Telephone-icon.png" alt="Phone" class="contact-icon">
                <img src="/static/img/WhatsApp-icon.png" alt="WhatsApp" class="contact-icon">
                <strong>Phone (Galym):</strong> <a href="tel:+77075673195">+7 707 567 3195</a>
            </li>
            <li>
                <img src="/static/img/Telephone-icon.png" alt="Phone" class="contact-icon">
                <img src="/static/img/WhatsApp-icon.png" alt="WhatsApp" class="contact-icon">
                <strong>Phone (Artyom):</strong> <a href="tel:+77757831321">+7 775 783 1321</a>
            </li>
            <li>
                <img src="/static/img/instagram-icon.png" alt="Instagram" class="contact-icon">
                <strong>Instagram (Galym):</strong> 
                <a href="https://www.instagram.com/edigeev_07/" target="_blank">@edigeev_07</a>
            </li>
        `;
    }

    updateContactInfo();
});
