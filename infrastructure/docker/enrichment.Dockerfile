FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY python-services/requirements-phase3.txt .
RUN pip install --no-cache-dir -r requirements-phase3.txt

# Copy application code
COPY python-services/enrichment_service.py .
COPY python-services/enrichment_schema.sql .

# Create directories for logs and cache
RUN mkdir -p /app/logs /app/cache

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV LOG_LEVEL=INFO

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# Run the service
CMD ["python", "-u", "enrichment_service.py"]
