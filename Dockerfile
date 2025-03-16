# Используем Python 3.12 (Debian)
FROM python:3.12-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы проекта
COPY . .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем curl
RUN apt-get update && apt-get install -y curl

# Загружаем модель с Dropbox
RUN mkdir -p models && \
    curl -L "https://www.dropbox.com/scl/fi/m9a3rj98z7zcnxxkeqv4j/simple_model.keras?rlkey=fw291bkxrh38sr5swbnouosom&dl=1" -o models/simple_model.keras

# Открываем порт (Railway требует EXPOSE)
EXPOSE 5000

# Запускаем приложение через Gunicorn (WSGI-сервер)
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
