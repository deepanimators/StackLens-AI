# 🚀 StackLens AI - Quick Start Guide

Get your advanced AI microservices running in under 5 minutes!

## ⚡ One-Command Setup

```bash
cd ml_microservices
./stacklens_ai.sh setup && ./stacklens_ai.sh start
```

## 🎯 What This Gives You

8 powerful AI microservices ready to analyze error patterns:

| Service                  | Port | Capability                                    |
| ------------------------ | ---- | --------------------------------------------- |
| 🧠 **Embeddings**        | 8000 | High-quality text embeddings + clustering     |
| 🔍 **NER**               | 8001 | Named entity recognition for error data       |
| 📝 **Summarization**     | 8002 | BART-powered error summarization              |
| 🔎 **Semantic Search**   | 8003 | Vector-based similarity search                |
| ⚠️ **Anomaly Detection** | 8004 | ML-based anomaly detection                    |
| 💾 **Vector Database**   | 8005 | FAISS-powered vector storage                  |
| 🤖 **Deep Learning**     | 8006 | Custom transformers, VAE, GNN, RL             |
| 📚 **Active Learning**   | 8007 | Self-improving AI with uncertainty estimation |

## 🛠️ Management Commands

```bash
# Setup environment (one-time)
./stacklens_ai.sh setup

# Start all services
./stacklens_ai.sh start

# Check status
./stacklens_ai.sh status

# Run comprehensive tests
./stacklens_ai.sh test

# View logs
./stacklens_ai.sh logs
./stacklens_ai.sh logs embeddings_service

# Stop all services
./stacklens_ai.sh stop

# Get help
./stacklens_ai.sh help
```

## 🧪 Quick Test

After starting services, test the complete pipeline:

```bash
# Test embeddings
curl -X POST "http://localhost:8000/embed" \
     -H "Content-Type: application/json" \
     -d '{"sentences": ["Database connection timeout", "Memory allocation failed"]}'

# Test semantic search
curl -X POST "http://localhost:8003/semantic-search" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "database error",
       "corpus": [
         "Database connection timeout",
         "Memory allocation failed",
         "Network connection refused"
       ]
     }'

# Or run the full integration test
./stacklens_ai.sh test
```

## 📊 Expected Results

**Successful startup should show:**

```
✅ embeddings_service started successfully (PID: 12345)
✅ ner_service started successfully (PID: 12346)
✅ summarization_service started successfully (PID: 12347)
✅ semantic_search_service started successfully (PID: 12348)
✅ anomaly_service started successfully (PID: 12349)
✅ vector_db_service started successfully (PID: 12350)
✅ deep_learning_service started successfully (PID: 12351)
✅ active_learning_service started successfully (PID: 12352)
```

**Integration tests should show 80%+ pass rate:**

```
🎯 INTEGRATION TEST SUMMARY
✅ Passed: 8/10 (80.0%)
🎉 INTEGRATION TEST SUITE: PASSED
```

## 🐳 Docker Alternative

If you prefer Docker:

```bash
# Build and start with Docker Compose
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 🔧 Troubleshooting

**Port conflicts:**

```bash
# Check what's using a port
lsof -i:8000

# Kill process on port
lsof -ti:8000 | xargs kill -9
```

**Memory issues:**

```bash
# Check memory usage
free -h

# Monitor service memory
./stacklens_ai.sh logs embeddings_service
```

**Service won't start:**

```bash
# Check detailed logs
./stacklens_ai.sh logs [service_name]

# Check Python environment
source stacklens_ai_venv/bin/activate
python3 -c "import torch; print('PyTorch version:', torch.__version__)"
```

## 🎉 Next Steps

1. **Integrate with your StackLens application**
2. **Feed real error data through the pipeline**
3. **Monitor active learning improvements**
4. **Scale services based on usage**

## 📚 Full Documentation

See `README.md` for complete API documentation and advanced configuration options.

---

**🚀 You now have a production-ready AI platform for advanced error analysis!**
