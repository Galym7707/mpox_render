# Monkeypox Detection Bot

Monkeypox Detection Bot — это веб-приложение на основе Flask, предназначенное для распознавания симптомов оспы обезьян с использованием искусственного интеллекта.

## 🚀 Deployment

1. Fork this repository
2. Create Railway account
3. Connect your GitHub account
4. Deploy using this config:

```yaml
build:
  command: pip install -r requirements.txt && python app.py
environment:
  FLASK_ENV: production

## 🛠 Структура проекта

- `app.py`: основной файл приложения Flask.
- `models/`: содержит обученные модели и вспомогательные файлы для работы искусственного интеллекта.
- `templates/`: HTML-шаблоны для фронтенда.
- `static/`: статические файлы, включая CSS, JavaScript и изображения.
- `translations/`: файлы перевода для многоязычной поддержки.
- `requirements.txt`: список зависимостей Python.
- `venv/`: виртуальное окружение (создаётся локально при настройке).

## 🧰 Инструменты и технологии

- **Flask**: веб-фреймворк для создания backend.
- **TensorFlow**: библиотека для разработки моделей машинного обучения.
- **Pillow**: обработка изображений.
- **Flask-Babel**: поддержка перевода и локализации.


## 📞 Поддержка

Если у вас возникли вопросы или проблемы с проектом, пожалуйста, свяжитесь со мной через мой профиль GitHub: [Galym7707](https://github.com/Galym7707),
по электронной почте: galymtashtek@gmail.com или в Telegram: [@kemmeq](https://t.me/kemmeq).
