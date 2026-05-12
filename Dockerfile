# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Setup the Python Flask backend
FROM python:3.13-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python backend file
COPY app.py .

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create a data directory for the database
RUN mkdir -p /app/data

# Expose the application port
EXPOSE 8001

# Set environment variables
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV DB_PATH=/app/data/database.sqlite

# Start the Flask-SocketIO server
# Note: eventlet is recommended for Flask-SocketIO
CMD ["python", "app.py"]
