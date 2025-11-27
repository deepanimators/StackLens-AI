FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY python-services/requirements-phase4.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-phase4.txt

# Copy application code
COPY python-services/dashboard_api.py .

# Create logs directory
RUN mkdir -p /app/logs

# Expose API port
EXPOSE 8005

# Run the dashboard API
CMD ["python", "-u", "dashboard_api.py"]
