# C:\Users\galym\Desktop\monkeypox_final\app.py
import os
# Убедись, что эта строка в самом начале, ДО импорта tensorflow
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

from flask import Flask, request, jsonify, render_template, g, url_for, session, redirect, make_response
from flask_babel import Babel, _
from PIL import Image
import numpy as np
# !!! Используйте правильный import для вашей модели и препроцессинга !!!
# Если вы перешли на новую модель, импорты должны соответствовать ей
from tensorflow.keras.models import load_model
# from tensorflow.keras.applications.efficientnet import preprocess_input # Пример
from tensorflow.keras.applications.resnet_v2 import preprocess_input # Пример, если остался ResNet
import logging
# import requests # Не нужен, если модель локально или уже скачана
from werkzeug.utils import secure_filename
from translations.disease_data import disease_info # Оставьте, если используете
import datetime
import json # Для загрузки маппинга, если перешли на новую модель

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = "mysecretkey" # Используйте безопасный ключ
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_SUPPORTED_LOCALES'] = ['en', 'ru', 'kk']
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

babel = Babel(app, locale_selector=lambda: g.get('locale', 'en'))

# --- Загрузка модели и маппинга ---
MODEL_PATH = os.path.join('models', 'simple_model.keras') # Или 'final_skin_detector_model.keras'
MAPPING_PATH = os.path.join('data', 'label_mapping.json') # Если используете новую модель

model = None
int_to_label = None
label_mapping = None
num_classes = 0

try:
    if os.path.exists(MODEL_PATH):
        model = load_model(MODEL_PATH)
        print("✅ Модель успешно загружена!")
    else:
        print(f"КРИТИЧЕСКАЯ ОШИБКА: Файл модели не найден: {MODEL_PATH}")

    if os.path.exists(MAPPING_PATH):
         with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
            int_to_label_str_keys = json.load(f)
            int_to_label = {int(k): v for k, v in int_to_label_str_keys.items()}
         num_classes = len(int_to_label)
         print(f"✅ Маппинг меток загружен ({num_classes} классов): {int_to_label}")
         label_mapping = {k: v for k, v in int_to_label.items()}
    else:
        print(f"Файл маппинга {MAPPING_PATH} не найден. Используется старый label_mapping.")
        label_mapping = {
             0: 'Chickenpox', 1: 'Cowpox', 2: 'Hand, foot and mouth disease',
             3: 'Healthy', 4: 'Measles', 5: 'Monkeypox'
        }
        int_to_label = {k: v for k, v in label_mapping.items()}
        num_classes = len(label_mapping)
        print(f"Используется старый маппинг ({num_classes} классов).")

except Exception as e:
    print(f"КРИТИЧЕСКАЯ ОШИБКА при загрузке модели или маппинга: {e}")
    model = None
    int_to_label = None
    label_mapping = None

# --- Конфигурация Flask ---
logging.basicConfig(level=logging.INFO)

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

    if prediction_key and g.locale:
        # Используем актуальный маппинг для получения ключа, если нужно
        current_mapping_inv = {v: k for k, v in (int_to_label if int_to_label else label_mapping).items()}
        # Используем текстовый ключ для поиска в disease_info
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
    # ... (fallback logic) ...

    return render_template(
        'index.html',
        prediction=translated_disease_name,
        confidence=confidence,
        image_url=image_url,
        disease_info=disease_info_translated
    )

@app.route('/upload', methods=['POST'])
def upload_file():
    if model is None or (label_mapping is None and int_to_label is None):
        logging.error("Модель или маппинг не загружены, анализ невозможен.")
        return jsonify(error=_('Model or mapping is not available, cannot analyze.')), 503

    if 'image' not in request.files:
        return jsonify(error=_('No file part')), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify(error=_('No file selected')), 400

    if file and allowed_file(file.filename):

        # --- !!! НАЧАЛО: Очистка папки uploads перед сохранением нового файла !!! ---
        try:
            logging.info(f"Очистка папки {app.config['UPLOAD_FOLDER']}...")
            for filename_to_delete in os.listdir(app.config['UPLOAD_FOLDER']):
                file_path_to_delete = os.path.join(app.config['UPLOAD_FOLDER'], filename_to_delete)
                try:
                    if os.path.isfile(file_path_to_delete) or os.path.islink(file_path_to_delete):
                        os.unlink(file_path_to_delete) # Удаляем файл или символическую ссылку
                        logging.info(f"Удален старый файл: {file_path_to_delete}")
                    # elif os.path.isdir(file_path_to_delete): # На всякий случай, если там окажутся папки
                    #     shutil.rmtree(file_path_to_delete)
                except Exception as e_delete:
                    logging.error(f"Не удалось удалить {file_path_to_delete}. Ошибка: {e_delete}")
            logging.info("Папка uploads очищена.")
        except Exception as e_clear:
            logging.error(f"Ошибка при очистке папки uploads: {e_clear}")
        # --- !!! КОНЕЦ: Очистка папки uploads !!! ---

        file_path = None
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path) # Сохраняем НОВЫЙ файл ПОСЛЕ очистки
            logging.info(f"Новый файл сохранен: {file_path}")

            # --- Обработка изображения ---
            logging.info(f"Обработка изображения: {filename}")
            IMG_SIZE = 128 # !!! Установите РАЗМЕР ВХОДА вашей ТЕКУЩЕЙ модели !!!
            image = Image.open(file_path).convert('RGB').resize((IMG_SIZE, IMG_SIZE))
            image_array = np.array(image, dtype=np.float32)

            # !!! Препроцессинг зависит от модели !!!
            image_array = image_array / 255.0 # Для старой модели
            # image_array = preprocess_input(image_array) # Для новой модели

            image_array = np.expand_dims(image_array, axis=0)
            logging.info(f"Изображение обработано (размер {IMG_SIZE}x{IMG_SIZE}).")
            # -----------------------------

            logging.info(f"Предсказание для: {filename}")
            prediction = model.predict(image_array)
            logging.info(f"Предсказание завершено.")

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

            image_url_for_session = url_for('static', filename=f'uploads/{filename}', _external=False)
            session['image_url'] = image_url_for_session
            session['prediction'] = disease_key
            session['confidence'] = confidence
            session['disease_info'] = disease_info_localized

            return jsonify(
                image_url=url_for('static', filename=f'uploads/{filename}'),
                prediction_key=disease_key,
                prediction_title=translated_disease_name,
                confidence=confidence,
                info=disease_info_localized
            )

        except Image.UnidentifiedImageError:
             logging.warning(f"Не удалось распознать файл как изображение: {filename}")
             return jsonify(error=_('Cannot identify image file. Please upload a valid image.')), 400
        except Exception as e:
            logging.exception("Ошибка при предсказании")
            # Важно: НЕ удаляем файл здесь, если хотим его показать
            return jsonify(error=_('An error occurred during analysis.')), 500
        # finally: # Блок finally больше не нужен для удаления
        #     pass

    else:
        return jsonify(error=_('Invalid file format or file not allowed')), 400

# ... (остальной код app.py: /clear и запуск) ...
@app.route('/clear', methods=['POST'])
def clear_session_route():
    try:
        # Очистка сессии
        session.pop('image_url', None)
        session.pop('prediction', None)
        session.pop('confidence', None)
        session.pop('disease_info', None)
        logging.info("Сессия очищена.")

        # Опционально: Очистка папки uploads при нажатии кнопки Clear
        # Раскомментируйте, если хотите очищать папку и по кнопке Clear
        # try:
        #     logging.info(f"Очистка папки {app.config['UPLOAD_FOLDER']} по кнопке Clear...")
        #     for filename_to_delete in os.listdir(app.config['UPLOAD_FOLDER']):
        #         file_path_to_delete = os.path.join(app.config['UPLOAD_FOLDER'], filename_to_delete)
        #         try:
        #             if os.path.isfile(file_path_to_delete) or os.path.islink(file_path_to_delete):
        #                 os.unlink(file_path_to_delete)
        #         except Exception as e_delete:
        #             logging.error(f"Не удалось удалить {file_path_to_delete}. Ошибка: {e_delete}")
        #     logging.info("Папка uploads очищена по кнопке Clear.")
        # except Exception as e_clear:
        #     logging.error(f"Ошибка при очистке папки uploads по кнопке Clear: {e_clear}")

        return jsonify(message=_("Data cleared successfully."))

    except Exception as e:
        logging.exception("Ошибка при очистке данных")
        return jsonify(error=_('An error occurred while clearing data.')), 500


if __name__ == '__main__':
    if model is None:
        print("ЗАПУСК НЕВОЗМОЖЕН: Модель не загружена.")
    else:
        port = int(os.environ.get('PORT', 8080))
        app.run(host='0.0.0.0', port=port, debug=False) # debug=False для продакшена
