# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup the Python Flask backend
FROM python:3.13-slim
WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python backend file and database
COPY app.py .
# Note: In production, you might want to use a volume for database.sqlite
# COPY database.sqlite . 

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV FLASK_ENV=production

# Start the Flask-SocketIO server
CMD ["python", "app.py"]
