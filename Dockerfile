# Используем официальный Python образ как базу
FROM python:3.12-slim

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем файлы проекта
COPY . .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Загружаем модель из Dropbox
RUN mkdir -p models && \
    wget -O models/simple_model.keras "https://www.dropbox.com/scl/fi/m9a3rj98z7zcnxxkeqv4j/simple_model.keras?rlkey=fw291bkxrh38sr5swbnouosom&dl=1"

# Указываем порт (важно для Railway)
EXPOSE 5000

# Запускаем приложение
CMD ["python", "app.py"]
