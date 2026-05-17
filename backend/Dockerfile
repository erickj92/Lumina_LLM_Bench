# ── Backend Dockerfile (Python 3.11 slim + FastAPI/Uvicorn) ────────────────

FROM python:3.11-slim

# Create data directory for SQLite persistence
RUN mkdir -p /data

WORKDIR /app

# Install Python dependencies (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Ensure data dir and expose
EXPOSE 8000

# Run with uvicorn — production settings
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]