# C:\Users\galym\Desktop\monkeypox_final\app.py
import os
# Убедись, что эта строка в самом начале, ДО импорта tensorflow
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from flask import Flask, request, jsonify, render_template, g, url_for, session, redirect, make_response
from flask_babel import Babel, _
from PIL import Image
import numpy as np
from tensorflow.keras.models import load_model # Импортируем здесь
import logging
import requests
from werkzeug.utils import secure_filename
from translations.disease_data import disease_info
import datetime # Импортируем datetime для года в футере

# Отключаем oneDNN (уже было выше, повтор не нужен, но оставим для ясности)
# os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = "mysecretkey" # В реальном приложении используй более безопасный ключ
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_SUPPORTED_LOCALES'] = ['en', 'ru', 'kk']
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

babel = Babel(app, locale_selector=lambda: g.get('locale', 'en'))

MODEL_PATH = os.path.join('models', 'simple_model.keras')
DROPBOX_LINK = "https://www.dropbox.com/scl/fi/m9a3rj98z7zcnxxkeqv4j/simple_model.keras?rlkey=fw291bkxrh38sr5swbnouosom&dl=1"

def download_model():
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if not os.path.exists(MODEL_PATH):
        print("🔴 Модель не найдена! Скачиваю с Dropbox...")
        try:
            response = requests.get(DROPBOX_LINK, stream=True, timeout=300) # Добавлен таймаут
            response.raise_for_status() # Проверка на ошибки HTTP
            with open(MODEL_PATH, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print("✅ Модель успешно скачана!")
        except requests.exceptions.RequestException as e:
            raise Exception(f"❌ Ошибка скачивания модели: {e}")
        except Exception as e:
             raise Exception(f"❌ Неизвестная ошибка при скачивании модели: {e}")


# Загрузка модели при старте приложения
try:
    download_model()
    model = load_model(MODEL_PATH)
    print("✅ Модель успешно загружена!")
except Exception as e:
    print(f"КРИТИЧЕСКАЯ ОШИБКА: Не удалось загрузить модель. {e}")
    # Можно добавить sys.exit(1) если без модели приложение бесполезно
    model = None # Установить модель в None, чтобы приложение не упало при попытке ее использовать

label_mapping = {
    0: 'Chickenpox',
    1: 'Cowpox',
    2: 'Hand, foot and mouth disease',
    3: 'Healthy',
    4: 'Measles',
    5: 'Monkeypox'
}

logging.basicConfig(level=logging.INFO) # INFO уровень для продакшена лучше, чем DEBUG

# --- ИЗМЕНЕНИЕ 1: Расширяем список поддерживаемых расширений ---
# Добавлены распространенные форматы, которые Pillow обычно может обработать.
# Для некоторых (например, HEIC, AVIF) могут потребоваться доп. системные библиотеки.
app.config['ALLOWED_EXTENSIONS'] = {
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp',
    'ppm', 'pgm', 'pbm', 'pnm', # Netpbm format
    'ico', 'jfif', 'jpe',
    # 'heic', 'heif', # Требуют libheif
    # 'avif', # Требует libavif
}

# --- ИЗМЕНЕНИЕ 2: Увеличиваем максимальный размер запроса (включая файл) ---
# ВАЖНО: Убедись, что твой веб-сервер (Nginx, Gunicorn и т.д.) и хостинг-платформа (Render)
# ТАКЖЕ настроены на прием таких больших файлов! Иначе Flask даже не получит запрос.
app.config['MAX_CONTENT_LENGTH'] = 250 * 1024 * 1024 # 250 MB

# --- ПРЕДУПРЕЖДЕНИЕ: Обработка больших файлов требует много RAM! ---
# Открытие и обработка изображения размером 250MB с помощью Pillow
# может потребовать ГИГАБАЙТЫ оперативной памяти на сервере.
# Убедись, что у твоего сервера достаточно ресурсов.

@app.before_request
def set_locale():
    lang = request.args.get('lang', session.get('lang', 'en'))
    g.locale = lang if lang in app.config['BABEL_SUPPORTED_LOCALES'] else 'en'
    session['lang'] = g.locale # Сохраняем язык в сессию при каждом запросе

def allowed_file(filename):
    """Проверяет, имеет ли файл допустимое расширение."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.context_processor
def inject_current_year():
    # Добавляем текущий год в контекст шаблонов для футера
    return {'current_year': datetime.datetime.now().year}

@app.route('/')
def index():
    # Эта функция теперь в основном отдает шаблон.
    # Данные из сессии будут использоваться, если пользователь перезагрузит страницу
    # после анализа, но основная логика отображения - в JS.
    prediction_key = session.get('prediction')
    image_url = session.get('image_url')
    confidence = session.get('confidence')
    disease_info_translated = {}
    translated_disease_name = None

    if prediction_key and g.locale: # Проверяем наличие языка в g
        disease_info_data = disease_info.get(prediction_key, {})
        # Используем 'en' как fallback, если для текущего языка нет данных
        disease_info_localized = disease_info_data.get(g.locale, disease_info_data.get('en', {}))

        translated_disease_name = disease_info_localized.get("title", prediction_key) # Fallback на ключ, если title нет

        disease_info_translated = {
            "Title": translated_disease_name, # Уже переведенное название
            "Symptoms": disease_info_localized.get("symptoms", []),
            "Causes": disease_info_localized.get("causes", []),
            "Prevention": disease_info_localized.get("prevention", []),
            "Treatment": disease_info_localized.get("treatment", "")
        }
    elif prediction_key:
        # Если g.locale не установлен (маловероятно из-за before_request),
        # можно показать сообщение об ошибке или использовать язык по умолчанию
        logging.warning(f"g.locale не установлен для prediction_key: {prediction_key}")
        # Используем английский как запасной вариант
        disease_info_data = disease_info.get(prediction_key, {})
        disease_info_localized = disease_info_data.get('en', {})
        translated_disease_name = disease_info_localized.get("title", prediction_key)
        disease_info_translated = {
             "Title": translated_disease_name,
             "Symptoms": disease_info_localized.get("symptoms", []),
             "Causes": disease_info_localized.get("causes", []),
             "Prevention": disease_info_localized.get("prevention", []),
             "Treatment": disease_info_localized.get("treatment", "")
         }


    return render_template(
        'index.html',
        # lang=g.locale, # lang передается автоматически через g
        prediction=translated_disease_name, # Используется при перезагрузке
        confidence=confidence,          # Используется при перезагрузке
        image_url=image_url,            # Используется при перезагрузке
        disease_info=disease_info_translated # Используется при перезагрузке
    )

@app.route('/upload', methods=['POST'])
def upload_file():
    if model is None:
         logging.error("Модель не загружена, анализ невозможен.")
         # Используем _() для перевода сообщения об ошибке
         return jsonify(error=_('Model is not available, cannot analyze.')), 503 # Service Unavailable

    if 'image' not in request.files:
        # Используем _() для перевода сообщения об ошибке
        return jsonify(error=_('No file part')), 400

    file = request.files['image']
    if file.filename == '':
        # Используем _() для перевода сообщения об ошибке
        return jsonify(error=_('No file selected')), 400

    # Проверка файла происходит здесь, ПОСЛЕ того как Flask (Werkzeug) уже принял его
    # Если файл был больше MAX_CONTENT_LENGTH, Flask вернет ошибку 413 до вызова этой функции
    if file and allowed_file(file.filename):
        file_path = None # Инициализируем file_path
        try:
            # Безопасное имя файла и сохранение
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            logging.info(f"Файл сохранен: {file_path}")

            # Обработка изображения и предсказание
            # ВАЖНО: .open() может потребовать много RAM для 250MB файлов!
            logging.info(f"Начинаю обработку изображения: {filename}")
            # Используем 'rb' для чтения, чтобы Pillow сам определил формат
            with Image.open(file_path) as image:
                # Конвертация в RGB нужна, т.к. модель ожидает 3 канала
                # Уменьшение размера ДО предсказания критично для больших файлов
                image = image.convert('RGB').resize((128, 128))
                logging.info(f"Изображение обработано и изменено в размере: {filename}")

                image_array = np.array(image, dtype=np.float32) / 255.0
                image_array = np.expand_dims(image_array, axis=0)

            logging.info(f"Начинаю предсказание для: {filename}")
            prediction = model.predict(image_array)
            logging.info(f"Предсказание завершено для: {filename}")

            predicted_class = int(np.argmax(prediction[0]))
            confidence = float(round(prediction[0][predicted_class] * 100, 2))
            disease_key = label_mapping.get(predicted_class, 'Unknown') # Fallback для неизвестного класса

            # Получаем данные о болезни на нужном языке
            disease_info_data = disease_info.get(disease_key, {})
            # Используем g.locale (установленный в before_request) и 'en' как fallback
            disease_info_localized = disease_info_data.get(g.locale, disease_info_data.get('en', {}))

            # Получаем переведенное название (если есть)
            translated_disease_name = disease_info_localized.get("title", disease_key)

            # Сохраняем в сессию для случая перезагрузки страницы
            image_url_for_session = url_for('static', filename=f'uploads/{filename}', _external=False) # Относительный URL для сессии
            session['image_url'] = image_url_for_session
            session['prediction'] = disease_key # Сохраняем ключ болезни
            session['confidence'] = confidence
            session['disease_info'] = disease_info_localized # Сохраняем локализованную инфу

            # Формируем JSON ответ для JavaScript
            return jsonify(
                image_url=url_for('static', filename=f'uploads/{filename}'), # URL для JS
                prediction_key=disease_key, # Отдаем ключ для JS
                prediction_title=translated_disease_name, # Отдаем переведенное название
                confidence=confidence,
                info=disease_info_localized # Отдаем всю локализованную информацию
            )

        except Image.UnidentifiedImageError:
             logging.warning(f"Не удалось распознать файл как изображение: {filename}")
             # Используем _() для перевода
             return jsonify(error=_('Cannot identify image file. Please upload a valid image.')), 400
        except Exception as e:
            logging.exception("Ошибка при предсказании")
            # Не отдаем детали ошибки пользователю в продакшене
            # Используем _() для перевода
            return jsonify(error=_('An error occurred during analysis.')), 500
        finally:
             # Попытка удалить файл после обработки (даже если была ошибка),
             # чтобы не засорять диск. Обернуто в try/except на случай проблем с удалением.
             if file_path and os.path.exists(file_path):
                 try:
                     os.remove(file_path)
                     logging.info(f"Временный файл удален: {file_path}")
                 except Exception as e_remove:
                     logging.error(f"Не удалось удалить временный файл {file_path}: {e_remove}")

    elif file: # Если файл есть, но расширение не разрешено
        # Используем _() для перевода
        return jsonify(error=_('Invalid file format. Allowed formats: {formats}').format(formats=', '.join(app.config['ALLOWED_EXTENSIONS']))), 400
    else: # Этот случай не должен произойти из-за проверок выше, но на всякий случай
        # Используем _() для перевода
        return jsonify(error=_('An unknown error occurred with the file upload.')), 400


@app.route('/clear', methods=['POST'])
def clear_session_route(): # Переименовал функцию для ясности
    try:
        # Очистка папки uploads НЕ делается здесь, т.к. файлы теперь удаляются сразу после обработки
        # Если нужно удалять старые "зависшие" файлы, нужен отдельный механизм

        # Очистка данных сессии
        session.pop('image_url', None)
        session.pop('prediction', None)
        session.pop('confidence', None)
        session.pop('disease_info', None) # Очищаем и инфо о болезни
        logging.info("Сессия очищена.")

        # Используем _() для перевода
        return jsonify(message=_("Data cleared successfully.")) # Вернуть просто сообщение

    except Exception as e:
        logging.exception("Ошибка при очистке данных")
        # Используем _() для перевода
        return jsonify(error=_('An error occurred while clearing data.')), 500

if __name__ == '__main__':
    # download_model() # Модель уже загружается выше, при старте приложения
    if model is None:
        print("Запуск сервера невозможен без модели.")
    else:
        port = int(os.environ.get('PORT', 8080))
        # debug=False для продакшена!
        # host='0.0.0.0' для доступности извне (важно для Render/Docker)
        app.run(host='0.0.0.0', port=port, debug=False)
