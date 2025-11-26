# ErrorScope AI: Deployment & Operations Guide

## Infrastructure Setup

### Development Environment

1. Python Environment Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

2. Environment Configuration
```bash
# Create .env file
cp .env.example .env

# Configure required variables
GOOGLE_API_KEY=your_api_key
MODEL_STORAGE_PATH=models_storage/
ERROR_MAP_PATH=data/error_map.json
```

### Production Deployment

1. Docker Setup
```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["gunicorn", "app:app", "--workers=4", "--bind=0.0.0.0:8000"]
```

2. Docker Compose
```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - MODEL_STORAGE_PATH=/app/models_storage
    volumes:
      - model_storage:/app/models_storage

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus

volumes:
  model_storage:
```

## Monitoring Setup

### 1. Metrics Collection

```python
# monitoring.py
from prometheus_client import Counter, Histogram, Gauge

# Request metrics
REQUEST_COUNT = Counter('errorscope_requests_total', 'Total requests')
REQUEST_LATENCY = Histogram('errorscope_request_latency_seconds', 'Request latency')

# ML metrics
MODEL_PREDICTION_TIME = Histogram('errorscope_model_prediction_seconds', 'Model prediction time')
MODEL_ACCURACY = Gauge('errorscope_model_accuracy', 'Model accuracy')
LLM_LATENCY = Histogram('errorscope_llm_latency_seconds', 'LLM response time')

# Business metrics
ERROR_COUNT = Counter('errorscope_errors_total', 'Total errors analyzed')
RESOLUTION_SUCCESS = Counter('errorscope_resolutions_success', 'Successful resolutions')
```

### 2. Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'errorscope'
    static_configs:
      - targets: ['web:8000']
```

### 3. Grafana Dashboards

```json
{
  "dashboard": {
    "title": "ErrorScope AI Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "metrics": ["rate(errorscope_requests_total[5m])"]
      },
      {
        "title": "Model Performance",
        "type": "gauge",
        "metrics": ["errorscope_model_accuracy"]
      },
      {
        "title": "Resolution Success Rate",
        "type": "graph",
        "metrics": ["rate(errorscope_resolutions_success[1h])"]
      }
    ]
  }
}
```

## Alert Rules

```yaml
# alerts.yml
groups:
  - name: errorscope_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(errorscope_errors_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          
      - alert: LowModelAccuracy
        expr: errorscope_model_accuracy < 0.8
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: Model accuracy below threshold
          
      - alert: HighLLMLatency
        expr: histogram_quantile(0.95, errorscope_llm_latency_seconds) > 2
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: LLM response time degraded
```

## Health Checks

```python
# health.py
from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__)

@health_bp.route('/health')
def health_check():
    checks = {
        'app': check_app_health(),
        'ml_model': check_model_health(),
        'llm': check_llm_health(),
        'database': check_db_health()
    }
    
    status = 'healthy' if all(c['status'] == 'ok' for c in checks.values()) else 'unhealthy'
    return jsonify({'status': status, 'checks': checks})
```

## Backup & Recovery

### 1. Model Backup

```python
# backup.py
def backup_models():
    """Backup ML models and configurations"""
    backup_path = f"backups/models_{datetime.now().isoformat()}"
    os.makedirs(backup_path, exist_ok=True)
    
    # Backup current model
    shutil.copy("models_storage/current_model.pkl", f"{backup_path}/current_model.pkl")
    
    # Backup configurations
    shutil.copy("data/error_map.json", f"{backup_path}/error_map.json")
    shutil.copy("config.py", f"{backup_path}/config.py")
    
    return backup_path
```

### 2. Recovery Procedures

```python
def restore_model(backup_path):
    """Restore ML model from backup"""
    if not os.path.exists(backup_path):
        raise ValueError(f"Backup not found: {backup_path}")
        
    # Verify backup integrity
    verify_backup(backup_path)
    
    # Restore files
    shutil.copy(f"{backup_path}/current_model.pkl", "models_storage/current_model.pkl")
    shutil.copy(f"{backup_path}/error_map.json", "data/error_map.json")
    
    # Reload model
    reload_model()
```

## Performance Optimization

### 1. Caching Strategy

```python
# cache.py
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=1000)
def get_error_pattern(error_text):
    """Cache frequently accessed error patterns"""
    return analyze_error_pattern(error_text)

class TimedCache:
    """Time-based cache for ML predictions"""
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
        
    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if datetime.now() - timestamp < timedelta(seconds=self.ttl):
                return value
        return None
        
    def set(self, key, value):
        self.cache[key] = (value, datetime.now())
```

### 2. Database Optimization

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_errors_timestamp ON error_logs(timestamp);
CREATE INDEX idx_errors_severity ON error_logs(severity);
CREATE INDEX idx_errors_type ON error_logs(error_type);

-- Optimize for pattern matching
CREATE INDEX idx_errors_message_gin ON error_logs 
USING gin(to_tsvector('english', message));
```

## Scaling Considerations

### 1. Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'
services:
  web:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    placement:
      constraints:
        - node.role == worker

  model_service:
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
    placement:
      constraints:
        - node.labels.gpu == true
```

### 2. Load Balancing

```nginx
# nginx.conf
upstream errorscope {
    least_conn;  # Least connections algorithm
    server web1:8000;
    server web2:8000;
    server web3:8000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://errorscope;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /metrics {
        auth_basic "Metrics";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://errorscope;
    }
}
```
