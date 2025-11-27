# Placeholder Dockerfile for stacklens-consumer
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY stacklens/consumer ./consumer
COPY stacklens/ingest ./ingest
COPY config ./config

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "require('http').get('http://localhost:8001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 8001

CMD ["node", "consumer/main.js"]
