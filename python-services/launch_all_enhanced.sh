#!/bin/bash
# Enhanced launcher for all microservices including deep learning

SERVICES=(
  "uvicorn embeddings_service:app --host 0.0.0.0 --port 8000"
  "uvicorn ner_service:app --host 0.0.0.0 --port 8001"
  "uvicorn summarization_service:app --host 0.0.0.0 --port 8002"
  "uvicorn semantic_search_service:app --host 0.0.0.0 --port 8003"
  "uvicorn anomaly_service:app --host 0.0.0.0 --port 8004"
  "uvicorn vector_db_service:app --host 0.0.0.0 --port 8005"
  "uvicorn deep_learning_api:app --host 0.0.0.0 --port 8006"
)

SERVICE_NAMES=(
  "Embeddings & Clustering"
  "NER/Token Classification"
  "Text Summarization"
  "Semantic Search (BGE)"
  "Anomaly Detection"
  "Vector Database (FAISS)"
  "Deep Learning Models"
)

echo "🚀 Launching all StackLens AI microservices..."
echo "📊 Services include traditional ML + advanced deep learning models"
echo "🔥 GPU acceleration will be used if available"
echo ""

# Check for GPU
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected - deep learning will be GPU accelerated"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠️  No GPU detected - deep learning will run on CPU (slower)"
fi

echo ""
echo "Starting services..."

for i in "${!SERVICES[@]}"; do
  CMD="${SERVICES[$i]}"
  NAME="${SERVICE_NAMES[$i]}"
  PORT=$((8000 + i))
  
  echo "🔄 Starting: $NAME on port $PORT"
  $CMD &
  
  # Give each service a moment to start
  sleep 2
done

echo ""
echo "✅ All services launched in background!"
echo ""
echo "🌐 Service URLs:"
echo "   Embeddings/Clustering:  http://localhost:8000"
echo "   NER Classification:     http://localhost:8001"
echo "   Text Summarization:     http://localhost:8002"
echo "   Semantic Search:        http://localhost:8003"
echo "   Anomaly Detection:      http://localhost:8004"
echo "   Vector Database:        http://localhost:8005"
echo "   🧠 Deep Learning API:    http://localhost:8006"
echo ""
echo "📚 Deep Learning Features:"
echo "   • Transformer: Semantic error understanding"
echo "   • LSTM: Temporal pattern detection"
echo "   • GNN: System dependency mapping"
echo "   • VAE: Novel error detection"
echo "   • DQN: Self-improving suggestions"
echo ""
echo "🔧 Management commands:"
echo "   Check running services: ps aux | grep uvicorn"
echo "   Stop all services:      pkill -f uvicorn"
echo "   View service logs:      tail -f nohup.out"
echo ""
echo "🧪 Test deep learning API:"
echo "   curl http://localhost:8006/status"
echo "   curl http://localhost:8006/performance-comparison"
