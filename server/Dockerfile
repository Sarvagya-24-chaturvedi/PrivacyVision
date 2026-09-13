# Production Dockerfile for PrivacyVision FastAPI Reasoning Server
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and demos
COPY app/ ./app/
COPY ../demo/ ../demo/ 2>/dev/null || true

EXPOSE 8000

# Run with uvicorn
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
