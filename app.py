from flask import Flask, request, jsonify, render_template, g, url_for, session, redirect, make_response
from flask_babel import Babel, _
from PIL import Image
import numpy as np
from tensorflow.keras.models import load_model
import os
import logging
import requests
from werkzeug.utils import secure_filename
from translations.disease_data import disease_info

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = "mysecretkey"
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['BABEL_SUPPORTED_LOCALES'] = ['en', 'ru', 'kk']
app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'translations'

UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

babel = Babel(app, locale_selector=lambda: g.get('locale', 'en'))

# Пусть для модели
MODEL_PATH = os.path.join('models', 'simple_model.keras')
GOOGLE_DRIVE_FILE_ID = "1XCU4RYM1vwhOJ6MDWrG4p4JiCvIVfF-S"

def download_model():
    """Функция скачивания модели, если её нет"""
    if not os.path.exists(MODEL_PATH):
        print("Модель не найдена, скачиваю с Google Drive...")
        url = f"https://drive.google.com/uc?id={GOOGLE_DRIVE_FILE_ID}"
        response = requests.get(url, stream=True)

        if response.status_code == 200:
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            print("Модель успешно скачана!")
        else:
            print(f"Ошибка скачивания модели: {response.status_code}")

# Загружаем модель перед запуском
download_model()
model = load_model(MODEL_PATH)

label_mapping = {
    0: 'Chickenpox',
    1: 'Cowpox',
    2: 'Hand, foot and mouth disease',
    3: 'Healthy',
    4: 'Measles',
    5: 'Monkeypox'
}

logging.basicConfig(level=logging.DEBUG)
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}

@app.before_request
def set_locale():
    lang = request.args.get('lang', session.get('lang', 'en'))
    g.locale = lang if lang in app.config['BABEL_SUPPORTED_LOCALES'] else 'en'
    session['lang'] = g.locale

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    lang = g.locale
    prediction_key = session.get('prediction')
    image_url = session.get('image_url')
    confidence = session.get('confidence')
    disease_info_translated = {}

    if prediction_key:
        disease_info_data = disease_info.get(prediction_key, {})
        disease_info_localized = disease_info_data.get(lang, disease_info_data.get('en', {}))
        disease_info_translated = {
            "Symptoms": disease_info_localized.get("symptoms", []),
            "Causes": disease_info_localized.get("causes", []),
            "Prevention": disease_info_localized.get("prevention", []),
            "Treatment": disease_info_localized.get("treatment", "")
        }

    return render_template(
        'index.html',
        lang=lang,
        prediction=prediction_key,
        confidence=confidence,
        image_url=image_url,
        disease_info=disease_info_translated,
    )

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'image' not in request.files:
        return jsonify(error=_('No file uploaded')), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify(error=_('No file selected')), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        try:
            image = Image.open(file_path).convert('RGB').resize((128, 128))
            image_array = np.array(image, dtype=np.float32) / 255.0
            image_array = np.expand_dims(image_array, axis=0)

            prediction = model.predict(image_array)
            predicted_class = int(np.argmax(prediction[0]))
            confidence = float(round(prediction[0][predicted_class] * 100, 2))

            disease_key = label_mapping[predicted_class]

            disease_info_data = disease_info.get(disease_key, {}).get(g.locale, disease_info.get(disease_key, {}).get('en', {}))

            session['image_url'] = url_for('static', filename=f'uploads/{filename}')
            session['prediction'] = disease_key
            session['confidence'] = confidence
            session['disease_info'] = disease_info_data

            return jsonify(
                image_url=session['image_url'],
                prediction=disease_key,
                confidence=confidence,
                info={
                    "Symptoms": disease_info_data.get("symptoms", []),
                    "Causes": disease_info_data.get("causes", []),
                    "Prevention": disease_info_data.get("prevention", []),
                    "Treatment": disease_info_data.get("treatment", "")
                }
            )

        except Exception as e:
            logging.exception("Ошибка при предсказании")
            return jsonify(error=str(e)), 500

    return jsonify(error=_('Invalid file format')), 400

@app.route('/clear', methods=['POST'])
def clear_session():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
