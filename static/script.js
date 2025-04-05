document.addEventListener('DOMContentLoaded', () => {
    // ========== AOS Initialization ==========
    AOS.init({
        duration: 800, // Slightly faster
        once: true,
        easing: 'ease-out-cubic' // Smoother easing
    });

    // ========== Element Selectors ==========
    const bodyRoot = document.getElementById('root-body');
    const themeToggleCheckbox = document.getElementById('theme-toggle-btn');
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('uploaded-image');
    const fileChosen = document.getElementById('file-chosen');
    const resultContainer = document.getElementById('result');
    const submitBtn = document.querySelector('.analyze-button');
    const clearBtn = document.querySelector('.clear-button');
    const dropArea = document.getElementById('drag-and-drop-area');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');

    // ========== Translations ==========
    const translations = {
        en: { result: "Result", confidence: "Confidence", causes: "Causes", symptoms: "Symptoms", prevention: "Prevention", treatment: "Treatment Approaches", noData: "No specific information available.", fileNotChosen: "No file selected", submit: "Analyze Now", clear: "Clear", uploadError: "Please select an image file (JPG, PNG) up to 5MB.", processing: "Processing...", potentialCond: "Potential Condition", confScore: "Confidence Score", reportTitle: "Analysis Report", about: "About", important: "Important:", disclaimer: "This information is for general knowledge only. Consult a doctor for diagnosis and treatment.", readMore: "Read More:", viewProject: "View Project on GitHub", allRights: "All Rights Reserved.", home: "Home", analyze: "Analyze", featured: "Featured In", team: "Our Team", contact: "Contact Us", lang: "Language" },
        ru: { result: "Результат", confidence: "Уверенность", causes: "Причины", symptoms: "Симптомы", prevention: "Профилактика", treatment: "Методы лечения", noData: "Конкретная информация недоступна.", fileNotChosen: "Файл не выбран", submit: "Анализировать", clear: "Очистить", uploadError: "Пожалуйста, выберите файл изображения (JPG, PNG) до 5МБ.", processing: "Обработка...", potentialCond: "Возможное состояние", confScore: "Оценка уверенности", reportTitle: "Отчет об анализе", about: "О", important: "Важно:", disclaimer: "Эта информация предназначена только для общего ознакомления. Проконсультируйтесь с врачом для диагностики и лечения.", readMore: "Читать далее:", viewProject: "Просмотреть проект на GitHub", allRights: "Все права защищены.", home: "Главная", analyze: "Анализ", featured: "Публикации", team: "Команда", contact: "Контакты", lang: "Язык" },
        kk: { result: "Нәтиже", confidence: "Сенімділік", causes: "Себептер", symptoms: "Симптомдар", prevention: "Алдын алу", treatment: "Емдеу әдістері", noData: "Нақты ақпарат жоқ.", fileNotChosen: "Файл таңдалмады", submit: "Талдау", clear: "Тазалау", uploadError: "Сурет файлын (JPG, PNG) 5МБ дейін таңдаңыз.", processing: "Өңделуде...", potentialCond: "Ықтимал жағдай", confScore: "Сенімділік деңгейі", reportTitle: "Талдау есебі", about: "Турал", important: "Маңызды:", disclaimer: "Бұл ақпарат тек жалпы білім беруге арналған. Диагностика және емдеу үшін дәрігермен кеңесіңіз.", readMore: "Толығырақ:", viewProject: "Жобаны GitHub-та қарау", allRights: "Барлық құқықтар қорғалған.", home: "Басты бет", analyze: "Талдау", featured: "Басылымдар", team: "Команда", contact: "Байланыс", lang: "Тіл" }
    };

    // Determine current language
    let currentLang = new URLSearchParams(window.location.search).get('lang') || 'en';
    if (!translations[currentLang]) currentLang = 'en';

    // Function to get translation
    const _ = (key) => translations[currentLang][key] || key;

    // ========== Theme Handling ==========
    function setTheme(isDark) {
        bodyRoot.classList.toggle('dark-theme', isDark);
        bodyRoot.classList.toggle('light-theme', !isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light'); // Save theme preference
    }

    // Check local storage for saved theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialIsDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    themeToggleCheckbox.checked = initialIsDark;
    setTheme(initialIsDark);

    themeToggleCheckbox.addEventListener('change', () => {
        setTheme(themeToggleCheckbox.checked);
    });

    // ========== Drag and Drop Area ==========
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'));
        });

        dropArea.addEventListener('drop', handleDrop);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            handleFiles(files);
        }
    }

    function handleFiles(files) {
         // Validate file type and size if needed here before assigning
        fileInput.files = files;
        updateFileInfo(); // Update display
    }

    // ========== Mobile Menu ==========
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
        });
        // Close menu when a link is clicked
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                 mobileNav.classList.remove('active');
                 mobileMenuBtn.querySelector('i').classList.add('fa-bars');
                 mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            });
        });
    }


    // ========== File Input Handling ==========
    if (fileInput) {
        fileInput.addEventListener('change', updateFileInfo);
    }

    function updateFileInfo() {
        fileChosen.textContent = fileInput.files.length ? fileInput.files[0].name : _('fileNotChosen');
    }

     // ========== Language Switcher Initialization ==========
     function initLanguageSwitcher() {
        const langDropdown = document.querySelector('.lang-dropdown');
        if(!langDropdown) return;

        const currentLangLink = langDropdown.querySelector(`.lang-link[href*="lang=${currentLang}"]`);
        if (currentLangLink) {
            // Optionally highlight current language or update button text
        }

        // Add click listeners for language change
        langDropdown.querySelectorAll('.lang-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = new URL(link.href).searchParams.get('lang');
                if (lang && lang !== currentLang) {
                    window.location.href = `?lang=${lang}`; // Reload with new language
                }
            });
        });
    }

    // ========== Form Submission ==========
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!fileInput.files.length) {
                showNotification(_('uploadError'), 'error');
                return;
            }

            // Validate file size (example: 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (fileInput.files[0].size > maxSize) {
                 showNotification(`File is too large. Max size is 5MB.`, 'error');
                 return;
            }

             // Validate file type
            const allowedTypes = ['image/jpeg', 'image/png'];
            if (!allowedTypes.includes(fileInput.files[0].type)) {
                 showNotification(`Invalid file type. Please upload JPG or PNG.`, 'error');
                 return;
            }


            // Show loading state
            submitBtn.innerHTML = `${_('processing')} <span class="loader"></span>`;
            submitBtn.disabled = true;
            clearBtn.disabled = true; // Disable clear during processing

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('lang', currentLang); // Send current language

            try {
                const res = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: 'Server error occurred.' }));
                    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                displayPrediction(data); // Display results directly

            } catch (err) {
                console.error("Upload Error:", err);
                resultContainer.innerHTML = `<p class="error-message">${_('uploadError')}: ${err.message}</p>`;
                showNotification(`${_('uploadError')}: ${err.message}`, 'error');
            } finally {
                // Restore button state
                submitBtn.innerHTML = `<i class="fas fa-microscope"></i> ${_('submit')} <span class="button-arrow"><i class="fas fa-arrow-right"></i></span>`;
                submitBtn.disabled = false;
                clearBtn.disabled = false; // Re-enable clear button
            }
        });
    }

    // ========== Clear Button ==========
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            fileInput.value = ''; // Clear file input
            updateFileInfo(); // Update displayed file name
            resultContainer.innerHTML = ''; // Clear results area
             // Optionally clear server-side session/data if needed via a fetch call
             // fetch('/clear', { method: 'POST' });
            showNotification(_('clearData') + ' - UI Cleared.', 'info');
        });
    }


    // ========== Display Prediction Results ==========
    function displayPrediction(data) {
        resultContainer.innerHTML = ''; // Clear previous results

        if (data.error) {
             resultContainer.innerHTML = `<p class="error-message">${data.error}</p>`;
             return;
        }

        const resultWrapper = document.createElement('div');

        // Image Preview
        if (data.image_url) {
            resultWrapper.innerHTML += `
                <div class="image-preview" data-aos="zoom-in">
                    <img src="${data.image_url}?t=${new Date().getTime()}" class="uploaded-image" alt="Uploaded analysis image">
                </div>
            `; // Added timestamp to try and avoid cache issues
        }

        // Diagnosis Report
        const { prediction, confidence, info } = data;
        if (prediction && confidence !== undefined) {
            const confidenceFormatted = parseFloat(confidence).toFixed(2); // Format confidence
            resultWrapper.innerHTML += `
                <div class="diagnosis-report" data-aos="fade-up">
                    <h3 class="report-title"><i class="fas fa-notes-medical"></i> ${_('reportTitle')}</h3>
                    <div class="report-item prediction-item">
                        <span class="report-label">${_('potentialCond')}:</span>
                        <span class="report-value prediction-value">${prediction}</span>
                    </div>
                    <div class="report-item confidence-item">
                        <span class="report-label">${_('confScore')}:</span>
                        <div class="confidence-bar-container">
                            <div class="confidence-bar" style="width: ${confidenceFormatted}%;"></div>
                        </div>
                        <span class="report-value confidence-value">${confidenceFormatted}%</span>
                    </div>
                    ${generateInfoSections(info, prediction)}
                </div>
            `;
        } else {
             resultWrapper.innerHTML += `<p class="info-notice">Could not retrieve prediction details.</p>`;
        }

        resultContainer.appendChild(resultWrapper);
        AOS.refresh(); // Refresh AOS to animate new elements
    }

    // ========== Generate Disease Info Sections ==========
    function generateInfoSections(info, predictionName) {
        if (!info || (!info.Symptoms && !info.Causes && !info.Prevention && !info.Treatment)) {
            return `<p class="info-notice">${_('noData')}</p>`; // Show if no info object or all fields are empty
        }

        let infoHTML = `
            <div class="disease-info-wrapper">
                 <h4 class="disease-info-title">${_('about')} ${predictionName}</h4>
                 <div class="disease-info">
        `;

        infoHTML += createSection('symptoms', 'fa-head-side-cough', info.Symptoms);
        infoHTML += createSection('causes', 'fa-virus', info.Causes);
        infoHTML += createSection('prevention', 'fa-shield-alt', info.Prevention); // Use shield-alt
        infoHTML += createTreatmentSection(info.Treatment);

        infoHTML += `
                    <p class="disclaimer-note"><i class="fas fa-exclamation-triangle"></i> <strong>${_('important')}</strong> ${_('disclaimer')}</p>
                 </div>
              </div>
        `;
        return infoHTML;
    }

    function createSection(key, icon, items) {
        if (!items || items.length === 0) return '';
        return `
            <div class="info-section ${key}-section" data-aos="fade-up">
                <h5><i class="fas ${icon}"></i> ${_(key)}</h5>
                <ul>
                    ${items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    function createTreatmentSection(treatment) {
        if (!treatment) return '';
        return `
            <div class="info-section treatment-section" data-aos="fade-up">
                <h5><i class="fas fa-briefcase-medical"></i> ${_('treatment')}</h5>
                <p>${treatment}</p>
            </div>
        `;
    }


    // ========== Utility: Show Notification ==========
    function showNotification(message, type = 'info') { // Default to 'info'
        const container = document.getElementById('notification-container') || createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`; // e.g., notification-error

        let iconClass = 'fa-info-circle'; // Default icon
        if (type === 'success') iconClass = 'fa-check-circle';
        if (type === 'error') iconClass = 'fa-times-circle';
        if (type === 'warning') iconClass = 'fa-exclamation-triangle';

        notification.innerHTML = `<i class="fas ${iconClass}"></i> ${message}`;

        container.appendChild(notification);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
             // Remove after fade out
            setTimeout(() => notification.remove(), 300);
        }, 5000);

         // Allow manual dismissal
         notification.addEventListener('click', () => {
             notification.style.opacity = '0';
             notification.style.transform = 'translateY(-20px)';
             setTimeout(() => notification.remove(), 300);
         });
    }

    function createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        // Basic styling for the container (add to CSS for better control)
        container.style.position = 'fixed';
        container.style.top = '80px'; // Below header
        container.style.right = '20px';
        container.style.zIndex = '1050';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
        return container;
    }

    // Initial setup calls
    updateFileInfo();
    initLanguageSwitcher();

}); // End DOMContentLoaded