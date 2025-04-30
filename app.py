import os
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from flask import Flask, request, jsonify, render_template, g, url_for, session, redirect, make_response
from flask_babel import gettext
from flask_babel import Babel, _
from PIL import Image
import numpy as np
from tensorflow.keras.models import load_model

from tensorflow.keras.applications.resnet_v2 import preprocess_input 
import logging
from werkzeug.utils import secure_filename
from translations.disease_data import disease_info
import datetime
import json
import shutil
import requests
app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = "mysecretkey"
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_SUPPORTED_LOCALES'] = ['en', 'ru', 'kk']
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

DROPBOX_LINK = "https://www.dropbox.com/scl/fi/m9a3rj98z7zcnxxkeqv4j/simple_model.keras?rlkey=fw291bkxrh38sr5swbnouosom&dl=1"
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

babel = Babel(app, locale_selector=lambda: g.get('locale', 'en'))

# --- Загрузка модели и маппинга ---
MODEL_PATH = os.path.join('models', 'simple_model.keras') 
MAPPING_PATH = os.path.join('data', 'label_mapping.json')

model = None
int_to_label = None
label_mapping = None
num_classes = 0

# Улучшаем формат логов
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def download_model():
    if not os.path.exists(MODEL_PATH):
        print("📦 Модель не найдена. Скачиваю с Dropbox...")
        response = requests.get(DROPBOX_LINK, stream=True)
        if response.status_code == 200:
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print("✅ Модель успешно скачана!")
        else:
            raise Exception(f"Ошибка при скачивании модели: {response.status_code}")

try:
    download_model()  # ⬅️ Вызов скачивания с Dropbox

    logging.info(f"Попытка загрузки модели из: {MODEL_PATH}")
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
    else:
        logging.error(f"КРИТИЧЕСКАЯ ОШИБКА: Файл модели не найден: {MODEL_PATH}")

    logging.info(f"Попытка загрузки маппинга из: {MAPPING_PATH}")
    if os.path.exists(MAPPING_PATH):
         with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
            int_to_label_str_keys = json.load(f)
            int_to_label = {int(k): v for k, v in int_to_label_str_keys.items()}
         num_classes = len(int_to_label)
         logging.info(f"✅ Маппинг меток загружен ({num_classes} классов): {int_to_label}")
         label_mapping = {k: v for k, v in int_to_label.items()}
    else:
        logging.warning(f"Файл маппинга {MAPPING_PATH} не найден. Используется старый label_mapping.")
        label_mapping = {
             0: 'Chickenpox', 1: 'Cowpox', 2: 'Hand, foot and mouth disease',
             3: 'Healthy', 4: 'Measles', 5: 'Monkeypox'
        }
        int_to_label = {k: v for k, v in label_mapping.items()}
        num_classes = len(label_mapping)
        logging.info(f"Используется старый маппинг ({num_classes} классов).")

except Exception as e:
    logging.exception(f"КРИТИЧЕСКАЯ ОШИБКА при загрузке модели или маппинга: {e}")
    model = None
    int_to_label = None
    label_mapping = None

# --- Конфигурация Flask ---
app.config['ALLOWED_EXTENSIONS'] = {
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif', 'webp',
    'ppm', 'pgm', 'pbm', 'pnm', 'ico', 'jfif', 'jpe',
}
app.config['MAX_CONTENT_LENGTH'] = 250 * 1024 * 1024 # 250 MB

@app.before_request
def set_locale():
    lang = request.args.get('lang', session.get('lang', 'en'))
    g.locale = lang if lang in app.config['BABEL_SUPPORTED_LOCALES'] else 'en'
    session['lang'] = g.locale

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.context_processor
def inject_current_year():
    return {'current_year': datetime.datetime.now().year}

@app.route('/')
def index():
    prediction_key = session.get('prediction')
    image_url = session.get('image_url')
    confidence = session.get('confidence')
    disease_info_translated = {}
    translated_disease_name = None

    # Сбор переводов для JavaScript
    js_translations = {
        "fileTooLarge": gettext('File is too large (Max 250MB).'),
        "fileNotChosen": gettext('No file selected'),
        "uploadError": gettext('Please select an image file.'),
        "errorOccurred": gettext('An error occurred'),
        "uploadedImageAlt": gettext('Uploaded analysis image'),
        "imageLoadError": gettext('Image load error'),
        "reportTitle": gettext('Analysis Report'),
        "potentialCond": gettext('Potential Condition:'),
        "confScore": gettext('Confidence Score:'),
        "about": gettext('About'),
        "symptoms": gettext('Symptoms'),
        "causes": gettext('Causes'),
        "prevention": gettext('Prevention'),
        "treatment": gettext('Treatment Approaches'),
        "notSkinMessage": gettext('Please upload an image of skin.'), # Пример для NotSkin
        "noData": gettext('No specific information available.'),
        # Добавь сюда ЛЮБЫЕ другие ключи, которые ты используешь в script.js
    }
    translations_json = json.dumps(js_translations) # Преобразуем в JSON строку

    if prediction_key and g.locale:
        current_mapping_inv = {v: k for k, v in (int_to_label if int_to_label else label_mapping).items()}
        disease_info_data = disease_info.get(prediction_key, {})
        disease_info_localized = disease_info_data.get(g.locale, disease_info_data.get('en', {}))
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
        prediction=translated_disease_name,
        confidence=confidence,
        image_url=image_url,
        disease_info=disease_info_translated,
        translations_json=translations_json # Передаем JSON в шаблон
    )


@app.route('/upload', methods=['POST'])
def upload_file():
    logging.info("Получен запрос /upload")
    if model is None or (label_mapping is None and int_to_label is None):
        logging.error("Запрос отклонен: Модель или маппинг не загружены.")
        return jsonify(error=_('Model or mapping is not available, cannot analyze.')), 503

    if 'image' not in request.files:
        logging.warning("Запрос отклонен: 'image' отсутствует в request.files")
        return jsonify(error=_('No file part')), 400

    file = request.files['image']
    if file.filename == '':
        logging.warning("Запрос отклонен: Имя файла пустое")
        return jsonify(error=_('No file selected')), 400

    logging.info(f"Получен файл: {file.filename}, Тип: {file.content_type}, Размер: {request.content_length} байт") # Лог размера

    if file and allowed_file(file.filename):
        logging.info("Файл прошел проверку allowed_file.")

        # --- Очистка папки uploads ---
        try:
            logging.info(f"Попытка очистки папки {app.config['UPLOAD_FOLDER']}...")
            cleaned_count = 0
            for filename_to_delete in os.listdir(app.config['UPLOAD_FOLDER']):
                file_path_to_delete = os.path.join(app.config['UPLOAD_FOLDER'], filename_to_delete)
                try:
                    if os.path.isfile(file_path_to_delete) or os.path.islink(file_path_to_delete):
                        os.unlink(file_path_to_delete)
                        cleaned_count += 1
                except Exception as e_delete:
                    logging.error(f"Не удалось удалить {file_path_to_delete}. Ошибка: {e_delete}")
            logging.info(f"Очистка завершена. Удалено файлов: {cleaned_count}")
        except Exception as e_clear:
            logging.error(f"Ошибка при доступе/очистке папки uploads: {e_clear}")
        # -----------------------------

        file_path = None
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            logging.info(f"Попытка сохранения файла в: {file_path}")
            file.save(file_path)
            logging.info(f"Файл успешно сохранен: {file_path}")

            # --- Обработка изображения ---
            logging.info(f"Обработка изображения: {filename}")
            IMG_SIZE = 128 # !!! УБЕДИТЕСЬ, ЧТО ЭТО РАЗМЕР ВАШЕЙ МОДЕЛИ !!!
            image = Image.open(file_path).convert('RGB').resize((IMG_SIZE, IMG_SIZE))
            image_array = np.array(image, dtype=np.float32)

            # !!! ПРЕПРОЦЕССИНГ !!!
            image_array = image_array / 255.0 # Для старой модели
            # image_array = preprocess_input(image_array) # Для новой модели

            image_array = np.expand_dims(image_array, axis=0)
            # !!! ДОБАВЛЕН ЛОГ: Форма и тип данных перед предсказанием !!!
            logging.info(f"Подготовлен массив для модели. Shape: {image_array.shape}, Dtype: {image_array.dtype}")
            # -----------------------------

            logging.info(f"Начало предсказания для: {filename}")
            prediction = model.predict(image_array)
            logging.info(f"Предсказание завершено. Shape: {prediction.shape}")

            predicted_class_int = int(np.argmax(prediction[0]))
            confidence = float(round(prediction[0][predicted_class_int] * 100, 2))
            current_mapping = int_to_label if int_to_label else label_mapping
            disease_key = current_mapping.get(predicted_class_int, 'Unknown')

            logging.info(f"Предсказано: {disease_key} с уверенностью {confidence}%")

            disease_info_localized = {}
            translated_disease_name = disease_key
            if disease_key != 'NotSkin' and disease_key != 'Unknown':
                disease_info_data = disease_info.get(disease_key, {})
                disease_info_localized = disease_info_data.get(g.locale, disease_info_data.get('en', {}))
                translated_disease_name = disease_info_localized.get("title", disease_key)

            # !!! ДОБАВЛЕН ЛОГ: Генерируемый URL изображения !!!
            image_url_response = url_for('static', filename=f'uploads/{filename}')
            logging.info(f"URL изображения для ответа: {image_url_response}")
            # ------------------------------------------------

            image_url_for_session = url_for('static', filename=f'uploads/{filename}', _external=False)
            session['image_url'] = image_url_for_session
            session['prediction'] = disease_key
            session['confidence'] = confidence
            session['disease_info'] = disease_info_localized

            logging.info("Отправка JSON ответа клиенту.")
            return jsonify(
                image_url=image_url_response, # Используем переменную для логгирования
                prediction_key=disease_key,
                prediction_title=translated_disease_name,
                confidence=confidence,
                info=disease_info_localized
            )

        except Image.UnidentifiedImageError:
             logging.warning(f"Не удалось распознать файл как изображение: {filename}")
             return jsonify(error=_('Cannot identify image file. Please upload a valid image.')), 400
        except Exception as e:
            logging.exception("Неожиданная ошибка при обработке файла и предсказании")
            return jsonify(error=_('An error occurred during analysis.')), 500

    else:
        logging.warning(f"Запрос отклонен: Файл {file.filename} не прошел проверку allowed_file.")
        return jsonify(error=_('Invalid file format or file not allowed')), 400

# ... (остальной код app.py: /clear и запуск) ...
@app.route('/clear', methods=['POST'])
def clear_session_route():
    try:
        session.pop('image_url', None)
        session.pop('prediction', None)
        session.pop('confidence', None)
        session.pop('disease_info', None)
        logging.info("Сессия очищена.")
        return jsonify(message=_("Data cleared successfully."))
    except Exception as e:
        logging.exception("Ошибка при очистке данных")
        return jsonify(error=_('An error occurred while clearing data.')), 500


if __name__ == '__main__':
    if model is None:
        print("ЗАПУСК НЕВОЗМОЖЕН: Модель не загружена.")
        logging.critical("ЗАПУСК НЕВОЗМОЖЕН: Модель не загружена.") # Добавим в лог
    else:
        port = int(os.environ.get('PORT', 8080))
        print(f" * Запуск Flask приложения на http://0.0.0.0:{port}")
        app.run(host='0.0.0.0', port=port, debug=False) # debug=False для продакшена
