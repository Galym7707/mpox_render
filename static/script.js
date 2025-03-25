document.addEventListener('DOMContentLoaded', () => {
    // ========== Инициализация AOS ==========
    AOS.init({
        duration: 1000,
        once: true,
        easing: 'ease-in-out'
    });
    // ========== Параллакс эффект для частиц ==========
    const particles = document.querySelectorAll('.particle');
    const dropArea = document.getElementById('drag-and-drop-area');
    const contactForm = document.querySelector('.contact-form');
    
    
    
    const bodyRoot = document.getElementById('root-body');
    const themeToggleCheckbox = document.getElementById('theme-toggle-btn');
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('uploaded-image');
    const fileChosen = document.getElementById('file-chosen');
    const resultContainer = document.getElementById('result');
    const submitBtn = document.querySelector('.analyze-button');
    const clearBtn = document.querySelector('.clear-button');
    const infoLanguageSelect = document.getElementById('info-language');
    const langDropdownLinks = document.querySelectorAll(".lang-dropdown-content a");

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

     // ========== Обновленный обработчик темы ==========
     themeToggleCheckbox.addEventListener('change', () => {
        bodyRoot.classList.toggle('dark-theme', themeToggleCheckbox.checked);
        bodyRoot.classList.toggle('light-theme', !themeToggleCheckbox.checked);
        document.documentElement.setAttribute('data-theme', 
            themeToggleCheckbox.checked ? 'dark' : 'light'
        );
    });


    // Добавить эти обработчики
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('dragover');
        });
    });

    dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if(files.length) {
            fileInput.files = files;
            fileChosen.textContent = files[0].name;
        }
    });

    document.addEventListener('mousemove', (e) => {
        particles.forEach(particle => {
            const speed = particle.dataset.speed;
            const x = (window.innerWidth - e.clientX * speed) / 100;
            const y = (window.innerHeight - e.clientY * speed) / 100;
            particle.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
    // ========== Обработчик для контактной формы ==========
    document.querySelector('.contact-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const response = await fetch('/send-message', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            if(result.success) {
                showNotification('Message sent successfully!', 'success');
            } else {
                showNotification('Error sending message', 'error');
            }
        } catch (error) {
            showNotification('Network error', 'error');
        }
    });

    // Обработчики для языковых ссылок
    document.querySelectorAll('.lang-link').forEach(link => {
        link.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = new URL(link.href).searchParams.get('lang');
        window.location.href = `?lang=${lang}`;
        });
    });

    // Инициализация переключателя
    function initLanguage() {
        const currentLang = new URLSearchParams(window.location.search).get('lang') || 'en';
        document.querySelectorAll('.lang-link').forEach(link => {
        if (link.href.includes(`lang=${currentLang}`)) {
            link.style.background = 'rgba(102,255,255,0.1)';
        }
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

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
    
    
    langDropdownLinks.forEach(link => {
        link.addEventListener("click", () => {
            setTimeout(() => {
                location.reload(); // Перезагрузка страницы, чтобы обновился перевод названия заболевания
            }, 500);
        });
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

        // Показываем индикатор загрузки
        submitBtn.innerHTML = `${translations[lang].processing} <div class="loader"></div>`;
        submitBtn.disabled = true;

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);

        try {
            const res = await fetch('/upload', { 
                method: 'POST', 
                body: formData 
            });
            
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Unknown error');
            }

            // Обновляем страницу для отображения результатов
            location.reload();

        } catch (err) {
            resultContainer.innerHTML = `<p class="error-message">${err.message}</p>`;
        } finally {
            submitBtn.innerHTML = `${translations[lang].submit} <svg class="analyze-icon">...</svg>`;
            submitBtn.disabled = false;
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

        if(data.image_url) {
            const imagePreview = document.createElement('div');
            imagePreview.className = 'image-preview';
            imagePreview.innerHTML = `
                <img src="${data.image_url}" class="uploaded-image" data-aos="zoom-in">
            `;
            resultContainer.appendChild(imagePreview);
        }

        const {prediction, confidence, info} = data;
        
        const diagnosisReport = document.createElement('div');
        diagnosisReport.className = 'diagnosis-report';
        diagnosisReport.innerHTML = `
            <h3 data-aos="fade-up">${translations[lang].result}</h3>
            <div class="report-details" data-aos="fade-up">
                <div class="detail-item">
                    <span class="detail-label">${translations[lang].result}:</span>
                    <span class="detail-value">${prediction}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">${translations[lang].confidence}:</span>
                    <span class="detail-value">${confidence}%</span>
                </div>
                ${generateInfoSections(info)}
            </div>
        `;
        
        resultContainer.appendChild(diagnosisReport);
    }

    // ========== Новая функция генерации секций ==========
    function generateInfoSections(info) {
        return `
            <div class="disease-info">
                ${createSection('Symptoms', 'fa-thermometer-half', info.Symptoms)}
                ${createSection('Causes', 'fa-virus', info.Causes)}
                ${createSection('Prevention', 'fa-shield-virus', info.Prevention)}
                ${createTreatmentSection(info.Treatment)}
            </div>
        `;
    }

    function createSection(key, icon, items) {
        if(!items || items.length === 0) return '';
        return `
            <div class="info-section" data-aos="fade-up">
                <h4><i class="fas ${icon}"></i> ${translations[lang][key.toLowerCase()]}</h4>
                <ul class="info-list">
                    ${items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    function createTreatmentSection(treatment) {
        if(!treatment) return '';
        return `
            <div class="info-section" data-aos="fade-up">
                <h4><i class="fas fa-briefcase-medical"></i> ${translations[lang].treatment}</h4>
                <p class="treatment-text">${treatment}</p>
            </div>
        `;
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
    initLanguage();
});
