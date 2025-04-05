// C:\Users\galym\Desktop\monkeypox_final\static\script.js
document.addEventListener('DOMContentLoaded', () => {
    // ========== AOS Initialization ==========
    AOS.init({
        duration: 800,
        once: true,
        easing: 'ease-out-cubic'
    });

    // ========== Element Selectors ==========
    const bodyRoot = document.getElementById('root-body');
    const themeToggleCheckbox = document.getElementById('theme-toggle-btn');
    const form = document.getElementById('upload-form');
    const fileInput = document.getElementById('uploaded-image');
    const fileChosen = document.getElementById('file-chosen');
    const resultContainer = document.getElementById('result-container'); // Контейнер для динамических результатов
    const sessionResultContainer = document.getElementById('session-result-container'); // Контейнер для результатов из сессии
    const submitBtn = form.querySelector('.analyze-button'); // Ищем внутри формы
    const clearBtn = form.querySelector('.clear-button'); // Ищем внутри формы
    const dropArea = document.getElementById('drag-and-drop-area');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const errorMessageDiv = document.getElementById('error-message');
    const spinner = submitBtn.querySelector('.spinner'); // Находим спиннер внутри кнопки

    // ========== Translations ==========
    // Убедись, что все ключи, используемые в displayResults, здесь есть
    const translations = {
        en: { result: "Result", confidence: "Confidence", causes: "Causes", symptoms: "Symptoms", prevention: "Prevention", treatment: "Treatment Approaches", noData: "No specific information available.", fileNotChosen: "No file selected", submit: "Analyze Now", clear: "Clear", uploadError: "Please select an image file (JPG, PNG) up to 5MB.", processing: "Analyzing...", potentialCond: "Potential Condition", confScore: "Confidence Score", reportTitle: "Analysis Report", about: "About", important: "Important:", /* removed disclaimer */ readMore: "Read More:", viewProject: "View Project on GitHub", allRights: "All Rights Reserved.", home: "Home", analyze: "Analyze", featured: "Featured In", team: "Our Team", contact: "Contact Us", lang: "Language", errorOccurred: "An error occurred", fileTooLarge: "File is too large (Max 5MB)." },
        ru: { result: "Результат", confidence: "Уверенность", causes: "Причины", symptoms: "Симптомы", prevention: "Профилактика", treatment: "Методы лечения", noData: "Конкретная информация недоступна.", fileNotChosen: "Файл не выбран", submit: "Анализировать", clear: "Очистить", uploadError: "Пожалуйста, выберите файл изображения (JPG, PNG) до 5МБ.", processing: "Анализ...", potentialCond: "Возможное состояние", confScore: "Оценка уверенности", reportTitle: "Отчет об анализе", about: "О", important: "Важно:", /* removed disclaimer */ readMore: "Читать далее:", viewProject: "Просмотреть проект на GitHub", allRights: "Все права защищены.", home: "Главная", analyze: "Анализ", featured: "Публикации", team: "Команда", contact: "Контакты", lang: "Язык", errorOccurred: "Произошла ошибка", fileTooLarge: "Файл слишком большой (Макс 5МБ)." },
        kk: { result: "Нәтиже", confidence: "Сенімділік", causes: "Себептер", symptoms: "Симптомдар", prevention: "Алдын алу", treatment: "Емдеу әдістері", noData: "Нақты ақпарат жоқ.", fileNotChosen: "Файл таңдалмады", submit: "Талдау", clear: "Тазалау", uploadError: "Сурет файлын (JPG, PNG) 5МБ дейін таңдаңыз.", processing: "Талдау...", potentialCond: "Ықтимал жағдай", confScore: "Сенімділік деңгейі", reportTitle: "Талдау есебі", about: "Турал", important: "Маңызды:", /* removed disclaimer */ readMore: "Толығырақ:", viewProject: "Жобаны GitHub-та қарау", allRights: "Барлық құқықтар қорғалған.", home: "Басты бет", analyze: "Талдау", featured: "Басылымдар", team: "Команда", contact: "Байланыс", lang: "Тіл", errorOccurred: "Қате пайда болды", fileTooLarge: "Файл тым үлкен (Макс 5МБ)." }
    };

    // Determine current language
    let currentLang = new URLSearchParams(window.location.search).get('lang') || document.documentElement.lang || 'en';
    if (!translations[currentLang]) currentLang = 'en';

    // Function to get translation
    const _ = (key) => translations[currentLang]?.[key] || key; // Добавлена проверка на существование языка

    // ========== Theme Handling ==========
    function setTheme(isDark) {
        bodyRoot.classList.toggle('dark-theme', isDark);
        bodyRoot.classList.toggle('light-theme', !isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialIsDark = savedTheme ? savedTheme === 'dark' : prefersDark;

    if (themeToggleCheckbox) {
        themeToggleCheckbox.checked = initialIsDark;
        setTheme(initialIsDark);
        themeToggleCheckbox.addEventListener('change', () => {
            setTheme(themeToggleCheckbox.checked);
        });
    } else {
        // Если чекбокса нет, просто устанавливаем тему по умолчанию
        setTheme(initialIsDark);
    }


    // ========== File Input Handling ==========
    let selectedFile = null; // Store the selected file object

    function updateFileInfo(file) {
        if (file) {
            selectedFile = file; // Store the file object
             // Проверка размера файла (5MB)
            if (file.size > 5 * 1024 * 1024) {
                showError(_('fileTooLarge'));
                fileChosen.textContent = _('fileTooLarge');
                fileChosen.style.color = 'red'; // Indicate error
                submitBtn.disabled = true;
                clearBtn.disabled = false; // Allow clearing the invalid file
                selectedFile = null; // Reset selected file
                return; // Stop processing this file
            }
            fileChosen.textContent = file.name;
            fileChosen.style.color = ''; // Reset color
            submitBtn.disabled = false;
            clearBtn.disabled = false;
            hideError(); // Hide any previous errors
            // Скрываем результаты из сессии, если они были
            if (sessionResultContainer) sessionResultContainer.style.display = 'none';
            // Очищаем предыдущие динамические результаты
            clearResultContainer();
        } else {
            selectedFile = null; // Clear the stored file
            fileChosen.textContent = _('fileNotChosen');
            fileChosen.style.color = ''; // Reset color
            submitBtn.disabled = true;
            clearBtn.disabled = true;
            hideError();
            clearResultContainer(); // Clear results when file is cleared
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            updateFileInfo(e.target.files[0]);
        });
    }

    // ========== Drag and Drop Area ==========
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false); // Prevent browser default for whole page
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
        });

        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                const file = files[0];
                 // Check if the dropped file is an allowed image type
                const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                if (allowedTypes.includes(file.type)) {
                    fileInput.files = files; // Assign files to the input
                    updateFileInfo(file);   // Update UI
                } else {
                    showError(_('uploadError')); // Show error for invalid file type
                    updateFileInfo(null); // Reset file info
                }
            }
        }, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // ========== Form Submission (AJAX) ==========
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default page reload
            hideError(); // Hide previous errors

            if (!selectedFile) {
                showError(_('No file selected')); // Should not happen if button is disabled, but good practice
                return;
            }

            // Disable buttons and show spinner
            submitBtn.disabled = true;
            clearBtn.disabled = true;
            spinner.style.display = 'inline-block'; // Show spinner
            submitBtn.querySelector('.button-arrow').style.display = 'none'; // Hide arrow
            submitBtn.querySelector('.fa-microscope').style.display = 'none'; // Hide icon
             // Change button text to Processing
            const originalButtonText = submitBtn.childNodes[submitBtn.childNodes.length - 3].nodeValue.trim(); // Get text node
            submitBtn.childNodes[submitBtn.childNodes.length - 3].nodeValue = ` ${_('processing')} `;


            const formData = new FormData();
            formData.append('image', selectedFile); // Use the stored file object

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData,
                    // Headers are not usually needed for FormData with fetch,
                    // the browser sets Content-Type to multipart/form-data automatically
                });

                const data = await response.json(); // Always try to parse JSON

                if (!response.ok) {
                    // Handle HTTP errors (e.g., 400, 500)
                    throw new Error(data.error || `${_('errorOccurred')} (Status: ${response.status})`);
                }

                // Success! Display results
                displayResults(data);
                // Hide results loaded from session, if any
                if (sessionResultContainer) sessionResultContainer.style.display = 'none';


            } catch (error) {
                console.error('Upload Error:', error);
                // Display error message to the user
                showError(error.message || _('errorOccurred'));
                 // Clear results on error
                clearResultContainer();

            } finally {
                // Re-enable buttons and hide spinner regardless of success/failure
                submitBtn.disabled = false; // Re-enable submit
                clearBtn.disabled = false; // Re-enable clear
                spinner.style.display = 'none'; // Hide spinner
                submitBtn.querySelector('.button-arrow').style.display = 'inline-block'; // Show arrow
                submitBtn.querySelector('.fa-microscope').style.display = 'inline-block'; // Show icon
                // Restore original button text
                submitBtn.childNodes[submitBtn.childNodes.length - 3].nodeValue = ` ${originalButtonText} `;
            }
        });
    }

    // ========== Display Results ==========
    function displayResults(data) {
        if (!resultContainer) return; // Exit if container doesn't exist

        clearResultContainer(); // Clear previous results first

        // Create image preview
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        imagePreview.setAttribute('data-aos', 'zoom-in');
        const img = document.createElement('img');
        img.src = data.image_url;
        img.alt = 'Uploaded analysis image';
        img.className = 'uploaded-image';
        imagePreview.appendChild(img);
        resultContainer.appendChild(imagePreview);

        // Create diagnosis report section
        const reportDiv = document.createElement('div');
        reportDiv.className = 'diagnosis-report';
        reportDiv.setAttribute('data-aos', 'fade-up');

        // Report Title
        const reportTitle = document.createElement('h3');
        reportTitle.className = 'report-title';
        reportTitle.innerHTML = `<i class="fas fa-notes-medical"></i> ${_('reportTitle')}`;
        reportDiv.appendChild(reportTitle);

        // Prediction Item
        const predictionItem = document.createElement('div');
        predictionItem.className = 'report-item prediction-item';
        predictionItem.innerHTML = `
            <span class="report-label">${_('potentialCond')}</span>
            <span class="report-value prediction-value">${data.prediction_title || data.prediction_key}</span>
        `;
        reportDiv.appendChild(predictionItem);

        // Confidence Item
        const confidenceItem = document.createElement('div');
        confidenceItem.className = 'report-item confidence-item';
        confidenceItem.innerHTML = `
            <span class="report-label">${_('confScore')}</span>
            <div class="confidence-bar-container">
                <div class="confidence-bar" style="width: ${data.confidence || 0}%;"></div>
            </div>
            <span class="report-value confidence-value">${data.confidence || 0}%</span>
        `;
        reportDiv.appendChild(confidenceItem);

        // Disease Info Section (if info exists)
        if (data.info && (data.info.symptoms?.length || data.info.causes?.length || data.info.prevention?.length || data.info.treatment)) {
            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'disease-info-wrapper';

            const infoTitle = document.createElement('h4');
            infoTitle.className = 'disease-info-title';
            infoTitle.textContent = `${_('about')} ${data.prediction_title || data.prediction_key}`;
            infoWrapper.appendChild(infoTitle);

            const diseaseInfoDiv = document.createElement('div');
            diseaseInfoDiv.className = 'disease-info';

            // Symptoms
            if (data.info.symptoms && data.info.symptoms.length > 0) {
                diseaseInfoDiv.appendChild(createInfoSection(
                    'symptoms-section',
                    'fa-head-side-cough',
                    _('symptoms'),
                    data.info.symptoms
                ));
            }
            // Causes
            if (data.info.causes && data.info.causes.length > 0) {
                diseaseInfoDiv.appendChild(createInfoSection(
                    'causes-section',
                    'fa-virus',
                    _('causes'),
                    data.info.causes
                ));
            }
            // Prevention
            if (data.info.prevention && data.info.prevention.length > 0) {
                diseaseInfoDiv.appendChild(createInfoSection(
                    'prevention-section',
                    'fa-shield-alt', // Corrected icon class
                    _('prevention'),
                    data.info.prevention
                ));
            }
             // Treatment
             if (data.info.treatment) {
                 const treatmentSection = document.createElement('div');
                 treatmentSection.className = 'info-section treatment-section';
                 treatmentSection.innerHTML = `<h5><i class="fas fa-briefcase-medical"></i> ${_('treatment')}</h5>`;
                 const treatmentP = document.createElement('p');
                 treatmentP.textContent = data.info.treatment;
                 treatmentSection.appendChild(treatmentP);
                 diseaseInfoDiv.appendChild(treatmentSection);
             }

             // --- ДИСКЛЕЙМЕР УДАЛЕН ---
             // const disclaimer = document.createElement('p');
             // disclaimer.className = 'disclaimer-note';
             // disclaimer.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <strong>${_('important')}</strong> ${_('disclaimer')}`;
             // diseaseInfoDiv.appendChild(disclaimer); // Removed

            infoWrapper.appendChild(diseaseInfoDiv);
            reportDiv.appendChild(infoWrapper);
        } else if (data.prediction_key !== 'Healthy') { // Show 'no data' only if not healthy and no info
             const noInfo = document.createElement('p');
             noInfo.className = 'info-notice'; // Use a less alarming class than error
             noInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${_('noData')}`;
             reportDiv.appendChild(noInfo);
        }


        resultContainer.appendChild(reportDiv);
        resultContainer.style.display = 'block'; // Show the results container

        // Re-initialize AOS for newly added elements if needed, or trigger manually
        // AOS.refresh(); // Might be needed if animations don't trigger
        // OR target specific elements:
        // AOS.init({
        //     duration: 800,
        //     once: true, // Apply animation only once
        //     offset: 50, // Adjust offset as needed
        // });
         // Scroll to results smoothly
         resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Helper function to create info list sections
    function createInfoSection(className, iconClass, title, items) {
        const section = document.createElement('div');
        section.className = `info-section ${className}`;
        section.innerHTML = `<h5><i class="fas ${iconClass}"></i> ${title}</h5>`;
        const ul = document.createElement('ul');
        items.forEach(itemText => {
            const li = document.createElement('li');
            li.textContent = itemText;
            ul.appendChild(li);
        });
        section.appendChild(ul);
        return section;
    }

     // ========== Clear Button ==========
     if (clearBtn) {
         clearBtn.addEventListener('click', () => {
            if (fileInput) fileInput.value = null; // Clear the file input visually
            updateFileInfo(null); // Reset UI elements and selectedFile variable
            clearResultContainer(); // Clear dynamic results
            hideError(); // Hide any errors
             // Также скрываем контейнер с результатами из сессии
            if (sessionResultContainer) sessionResultContainer.style.display = 'none';


            // Optional: Send a request to the server to clear session/files
            // This prevents old results showing on page refresh after clearing
             fetch('/clear', { method: 'POST' })
                 .then(response => response.json())
                 .then(data => {
                     console.log('Clear response:', data.message || data.error);
                     // Optionally show a success message, but usually not needed
                 })
                 .catch(error => {
                     console.error('Error clearing session:', error);
                     // Optionally show an error message to the user
                 });
         });
     }

     // ========== Helper Functions ==========
     function clearResultContainer() {
         if (resultContainer) {
             resultContainer.innerHTML = ''; // Clear content
             resultContainer.style.display = 'none'; // Hide container
         }
     }

     function showError(message) {
         if (errorMessageDiv) {
             errorMessageDiv.textContent = message;
             errorMessageDiv.style.display = 'block';
         }
          // Scroll to the error message
         if(form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
     }

     function hideError() {
         if (errorMessageDiv) {
             errorMessageDiv.textContent = '';
             errorMessageDiv.style.display = 'none';
         }
     }


    // ========== Mobile Menu ==========
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-times'); // Change icon
        });

        // Close mobile menu when a link is clicked
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('active');
                mobileMenuBtn.querySelector('i').classList.add('fa-bars');
                mobileMenuBtn.querySelector('i').classList.remove('fa-times');
            });
        });
    }

     // ========== Language Dropdown ==========
    const langBtn = document.querySelector('.lang-btn');
    const langDropdown = document.querySelector('.lang-dropdown-content');

    if (langBtn && langDropdown) {
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from closing immediately
            langDropdown.classList.toggle('show');
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', (e) => {
            if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.classList.remove('show');
            }
        });
         // Set active language link style (optional)
         const currentLangLink = langDropdown.querySelector(`a[href="?lang=${currentLang}"]`);
         if (currentLangLink) {
             currentLangLink.classList.add('active-lang');
         }
    }

    // ========== Initial Check for Session Data ==========
    // If session data exists on page load, ensure the dynamic container is hidden
    // and the session container is visible.
    if (sessionResultContainer && sessionResultContainer.children.length > 0) {
        if(resultContainer) resultContainer.style.display = 'none'; // Hide dynamic if session exists
        sessionResultContainer.style.display = 'block'; // Show session results
        // Activate clear button if session results are shown
        if(clearBtn) clearBtn.disabled = false;
    }


}); // End DOMContentLoaded