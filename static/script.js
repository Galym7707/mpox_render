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
    const resultContainer = document.getElementById('result-container');
    const sessionResultContainer = document.getElementById('session-result-container');
    const submitBtn = form.querySelector('.analyze-button');
    const clearBtn = form.querySelector('.clear-button');
    const dropArea = document.getElementById('drag-and-drop-area');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const errorMessageDiv = document.getElementById('error-message');
    const spinner = submitBtn.querySelector('.spinner');

    // !!! Қатты кодталған translations нысаны ЖОЙЫЛДЫ !!!
    // const translations = { ... };
    // !!! _ функциясы ЖОЙЫЛДЫ !!!
    // const _ = (key) => ...;
    // Енді аудармалар window.translations арқылы алынады

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
        setTheme(initialIsDark);
    }

    // ========== File Input Handling ==========
    let selectedFile = null;

    function updateFileInfo(file) {
        // window.translations бар-жоғын тексереміз (HTML-ден жүктелуі керек)
        if (!window.translations) {
            console.error("Translations object not found!");
            // Қате туралы хабарлама көрсетуге болады
            return;
        }

        if (file) {
            selectedFile = file;
            // Файл өлшемін тексеру (250MB)
            if (file.size > 250 * 1024 * 1024) {
                // Аударманы window.translations арқылы аламыз
                showError(window.translations.fileTooLarge || 'File is too large (Max 250MB).');
                fileChosen.textContent = window.translations.fileTooLarge || 'File is too large (Max 250MB).';
                fileChosen.style.color = 'var(--color-error)';
                submitBtn.disabled = true;
                clearBtn.disabled = false;
                selectedFile = null;
                return;
            }
            fileChosen.textContent = file.name;
            fileChosen.style.color = '';
            submitBtn.disabled = false;
            clearBtn.disabled = false;
            hideError();
            if (sessionResultContainer) sessionResultContainer.style.display = 'none';
            clearResultContainer();
        } else {
            selectedFile = null;
            // Аударманы window.translations арқылы аламыз
            fileChosen.textContent = window.translations.fileNotChosen || 'No file selected';
            fileChosen.style.color = '';
            submitBtn.disabled = true;
            clearBtn.disabled = true;
            hideError();
            clearResultContainer();
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
            document.body.addEventListener(eventName, preventDefaults, false);
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
                if (file.type.startsWith('image/')) {
                    fileInput.files = files;
                    updateFileInfo(file);
                } else {
                    // Аударманы window.translations арқылы аламыз
                    showError(window.translations.uploadError || 'Please select an image file.');
                    updateFileInfo(null);
                }
            }
        }, false);
    }
    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    // ========== Form Submission (AJAX) ==========
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideError();

            if (!selectedFile) {
                // Аударманы window.translations арқылы аламыз
                showError(window.translations.fileNotChosen || 'No file selected');
                return;
            }

            // Батырмаларды өшіру және спиннерді көрсету
            submitBtn.disabled = true;
            clearBtn.disabled = true;
            submitBtn.classList.add('loading'); // CSS арқылы басқару үшін класс қосу

            const formData = new FormData();
            formData.append('image', selectedFile);

            try {
                const response = await fetch('/upload', { method: 'POST', body: formData });
                const data = await response.json();

                if (!response.ok) {
                    // Аударманы window.translations арқылы аламыз
                    throw new Error(data.error || (window.translations.errorOccurred || 'An error occurred') + ` (Status: ${response.status})`);
                }
                displayResults(data);
                if (sessionResultContainer) sessionResultContainer.style.display = 'none';
            } catch (error) {
                console.error('Upload Error:', error);
                // Аударманы window.translations арқылы аламыз
                showError(error.message || (window.translations.errorOccurred || 'An error occurred'));
                clearResultContainer();
            } finally {
                submitBtn.disabled = false;
                clearBtn.disabled = false;
                submitBtn.classList.remove('loading'); // Жүктеу класын алып тастау
            }
        });
    }

    // ========== Display Results ==========
    function displayResults(data) {
        if (!resultContainer || !window.translations) return; // Егер контейнер немесе аудармалар болмаса, шығу
        clearResultContainer();

        // Суретті алдын ала қарау
        const imagePreview = document.createElement('div');
        imagePreview.className = 'image-preview';
        imagePreview.setAttribute('data-aos', 'zoom-in');
        const img = document.createElement('img');
        img.src = data.image_url;
        img.alt = window.translations.uploadedImageAlt || 'Uploaded analysis image'; // Alt тексті аударуға болады
        img.className = 'uploaded-image';
        img.onerror = () => {
             console.error("Image load error:", data.image_url);
             img.alt = window.translations.imageLoadError || 'Image load error';
        };
        imagePreview.appendChild(img);
        resultContainer.appendChild(imagePreview);

        // Диагноз есебі бөлімі
        const reportDiv = document.createElement('div');
        reportDiv.className = 'diagnosis-report';
        reportDiv.setAttribute('data-aos', 'fade-up');

        const reportTitle = document.createElement('h3');
        reportTitle.className = 'report-title';
        // Аударманы window.translations арқылы аламыз
        reportTitle.innerHTML = `<i class="fas fa-notes-medical"></i> ${window.translations.reportTitle || 'Analysis Report'}`;
        reportDiv.appendChild(reportTitle);

        const predictionItem = document.createElement('div');
        predictionItem.className = 'report-item prediction-item';
        // Аударманы window.translations арқылы аламыз
        predictionItem.innerHTML = `
            <span class="report-label">${window.translations.potentialCond || 'Potential Condition:'}</span>
            <span class="report-value prediction-value">${data.prediction_title || data.prediction_key}</span>`;
        reportDiv.appendChild(predictionItem);

        const confidenceItem = document.createElement('div');
        confidenceItem.className = 'report-item confidence-item';
        // Аударманы window.translations арқылы аламыз
        confidenceItem.innerHTML = `
            <span class="report-label">${window.translations.confScore || 'Confidence Score:'}</span>
            <div class="confidence-bar-container">
                <div class="confidence-bar" style="width: ${data.confidence || 0}%;"></div>
            </div>
            <span class="report-value confidence-value">${data.confidence || 0}%</span>`;
        reportDiv.appendChild(confidenceItem);

        // Ауру туралы ақпарат
        const isNotSkin = data.prediction_key === 'NotSkin'; // "NotSkin" класын тексеру (атауын өзгертуіңіз мүмкін)
        const hasInfo = data.info && (data.info.symptoms?.length || data.info.causes?.length || data.info.prevention?.length || data.info.treatment);

        if (isNotSkin) {
             const notSkinNotice = document.createElement('p');
             notSkinNotice.className = 'info-notice';
             // Аударманы window.translations арқылы аламыз
             notSkinNotice.innerHTML = `<i class="fas fa-image"></i> ${window.translations.notSkinMessage || 'Please upload an image of skin.'}`;
             reportDiv.appendChild(notSkinNotice);
        } else if (hasInfo) {
            const infoWrapper = document.createElement('div');
            infoWrapper.className = 'disease-info-wrapper';
            const infoTitle = document.createElement('h4');
            infoTitle.className = 'disease-info-title';
            // Аударманы window.translations арқылы аламыз
            infoTitle.textContent = `${window.translations.about || 'About'} ${data.prediction_title || data.prediction_key}`;
            infoWrapper.appendChild(infoTitle);
            const diseaseInfoDiv = document.createElement('div');
            diseaseInfoDiv.className = 'disease-info';
            // Аударманы window.translations арқылы аламыз
             if (data.info.symptoms?.length) diseaseInfoDiv.appendChild(createInfoSection('symptoms-section', 'fa-head-side-cough', window.translations.symptoms || 'Symptoms', data.info.symptoms));
             if (data.info.causes?.length) diseaseInfoDiv.appendChild(createInfoSection('causes-section', 'fa-virus', window.translations.causes || 'Causes', data.info.causes));
             if (data.info.prevention?.length) diseaseInfoDiv.appendChild(createInfoSection('prevention-section', 'fa-shield-alt', window.translations.prevention || 'Prevention', data.info.prevention));
             if (data.info.treatment) {
                 const treatmentSection = document.createElement('div');
                 treatmentSection.className = 'info-section treatment-section';
                 // Аударманы window.translations арқылы аламыз
                 treatmentSection.innerHTML = `<h5><i class="fas fa-briefcase-medical"></i> ${window.translations.treatment || 'Treatment Approaches'}</h5>`;
                 const treatmentP = document.createElement('p');
                 treatmentP.textContent = data.info.treatment;
                 treatmentSection.appendChild(treatmentP);
                 diseaseInfoDiv.appendChild(treatmentSection);
             }
            infoWrapper.appendChild(diseaseInfoDiv);
            reportDiv.appendChild(infoWrapper);
        } else if (data.prediction_key !== 'Healthy' && data.prediction_key !== 'Unknown') {
            const noInfo = document.createElement('p');
            noInfo.className = 'info-notice';
            // Аударманы window.translations арқылы аламыз
            noInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${window.translations.noData || 'No specific information available.'}`;
            reportDiv.appendChild(noInfo);
        }

        resultContainer.appendChild(reportDiv);
        resultContainer.style.display = 'flex';
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Ақпарат бөлімдерін құруға арналған көмекші функция
    function createInfoSection(className, iconClass, title, items) {
        const section = document.createElement('div');
        section.className = `info-section ${className}`;
        section.innerHTML = `<h5><i class="fas ${iconClass}"></i> ${title}</h5>`; // title енді аударылған
        const ul = document.createElement('ul');
        items.forEach(itemText => {
            const li = document.createElement('li');
            li.textContent = itemText; // Элементтердің өздері аударылмайды (олар серверден келеді)
            ul.appendChild(li);
        });
        section.appendChild(ul);
        return section;
    }

    // ========== Clear Button ==========
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (fileInput) fileInput.value = null;
            updateFileInfo(null);
            clearResultContainer();
            hideError();
            if (sessionResultContainer) sessionResultContainer.style.display = 'none';
            fetch('/clear', { method: 'POST' })
                .then(response => response.json())
                .then(data => console.log('Clear response:', data.message || data.error))
                .catch(error => console.error('Error clearing session:', error));
        });
    }

    // ========== Helper Functions ==========
    function clearResultContainer() { if (resultContainer) { resultContainer.innerHTML = ''; resultContainer.style.display = 'none'; } }
    function showError(message) {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            errorMessageDiv.style.color = 'var(--color-error-text, #f87171)';
            errorMessageDiv.style.background = 'var(--error-bg)';
            errorMessageDiv.style.borderColor = 'var(--error-border)';
        }
        if(form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function hideError() { if (errorMessageDiv) { errorMessageDiv.textContent = ''; errorMessageDiv.style.display = 'none'; } }

    // ========== Mobile Menu ==========
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('active');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
            mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
        });
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
        // Тілді анықтау үшін URL параметрін немесе html тегін пайдалану
        const currentUrlLang = new URLSearchParams(window.location.search).get('lang');
        const htmlLang = document.documentElement.lang;
        const currentLang = currentUrlLang || htmlLang || 'en'; // Ағымдағы тілді анықтау

        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (!langBtn.contains(e.target) && !langDropdown.contains(e.target)) {
                langDropdown.classList.remove('show');
            }
        });
        // Белсенді тіл сілтемесін стильдеу (міндетті емес)
        const currentLangLink = langDropdown.querySelector(`a[href="?lang=${currentLang}"]`);
        if (currentLangLink) {
            currentLangLink.classList.add('active-lang');
        } else {
             // Егер URL-де немесе HTML-де тіл көрсетілмесе, 'en' белсенді болады
             const enLink = langDropdown.querySelector(`a[href="?lang=en"]`);
             if (enLink) enLink.classList.add('active-lang');
        }
    }

    // ========== Initial Check for Session Data ==========
    if (sessionResultContainer && sessionResultContainer.offsetParent !== null) {
        if(resultContainer) resultContainer.style.display = 'none';
        if(clearBtn) clearBtn.disabled = false;
    }

    // Initialize file info display on page load
    // Аударманы window.translations арқылы аламыз
    if (fileChosen) {
        fileChosen.textContent = window.translations?.fileNotChosen || 'No file selected';
    }


}); // End DOMContentLoaded
