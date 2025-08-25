#!/bin/bash
# Unified launcher for all microservices (for local/dev use)

SERVICES=(
  "uvicorn embeddings_service:app --host 0.0.0.0 --port 8000"
  "uvicorn ner_service:app --host 0.0.0.0 --port 8001"
  "uvicorn summarization_service:app --host 0.0.0.0 --port 8002"
  "uvicorn semantic_search_service:app --host 0.0.0.0 --port 8003"
  "uvicorn anomaly_service:app --host 0.0.0.0 --port 8004"
  "uvicorn vector_db_service:app --host 0.0.0.0 --port 8005"
  "uvicorn deep_learning_service:app --host 0.0.0.0 --port 8006"
  "uvicorn active_learning_service:app --host 0.0.0.0 --port 8007"
)

echo "Launching all microservices..."
for CMD in "${SERVICES[@]}"; do
  echo "Starting: $CMD"
  $CMD &
done

echo "All services launched in background."
echo "Use 'ps aux | grep uvicorn' to check running services."
