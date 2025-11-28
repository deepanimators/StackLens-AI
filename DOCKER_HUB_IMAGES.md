# Docker Hub Images Reference

All StackLens infrastructure services use official Docker Hub images for cross-platform compatibility (Windows, Linux, macOS).

## Images Used

### Message Queue
- **Kafka**: `confluentinc/cp-kafka:7.4.0`
  - Source: https://hub.docker.com/r/confluentinc/cp-kafka
  - Vendor: Confluent (official Kafka distribution)
  - Platform: linux/amd64 (works on Windows via WSL2)

- **Zookeeper**: `confluentinc/cp-zookeeper:7.4.0`
  - Source: https://hub.docker.com/r/confluentinc/cp-zookeeper
  - Vendor: Confluent
  - Required for: Kafka cluster coordination

### Observability
- **OpenTelemetry Collector**: `otel/opentelemetry-collector-contrib:0.91.0`
  - Source: https://hub.docker.com/r/otel/opentelemetry-collector-contrib
  - Vendor: OpenTelemetry Project (CNCF)
  - Features: Traces, metrics, logs collection and processing

- **Jaeger**: `jaegertracing/all-in-one:1.51`
  - Source: https://hub.docker.com/r/jaegertracing/all-in-one
  - Vendor: Jaeger (CNCF)
  - Features: Distributed tracing UI and backend

### Storage & Search
- **Elasticsearch**: `docker.elastic.co/elasticsearch/elasticsearch:7.17.10`
  - Source: https://hub.docker.com/_/elasticsearch
  - Vendor: Elastic
  - Use: Log storage and full-text search

- **Kibana**: `docker.elastic.co/kibana/kibana:7.17.10`
  - Source: https://hub.docker.com/_/kibana
  - Vendor: Elastic
  - Use: Elasticsearch visualization and management

### Database
- **PostgreSQL**: `postgres:15-alpine`
  - Source: https://hub.docker.com/_/postgres
  - Vendor: PostgreSQL Core Team
  - Features: Lightweight Alpine Linux base

## Platform Compatibility

All images support `linux/amd64` architecture, which works on:
- ✅ Windows (via WSL2 or Hyper-V)
- ✅ Linux (native)
- ✅ macOS (via virtualization)

## Version Strategy

We use **pinned versions** (not `latest`) for:
- Reproducible builds
- Stable deployments
- Controlled upgrades

## Update Process

To update an image:

1. Check Docker Hub for new version
2. Update version in `infra/docker-compose.yml`
3. Pull new image: `docker-compose pull [service]`
4. Recreate container: `docker-compose up -d [service]`

Example:
```bash
# Update Kafka from 7.4.0 to 7.5.0
sed -i 's/cp-kafka:7.4.0/cp-kafka:7.5.0/g' infra/docker-compose.yml
docker-compose pull kafka
docker-compose up -d kafka
```

## Image Sizes (Approximate)

| Image | Compressed | Uncompressed |
|-------|-----------|--------------|
| Zookeeper | 200 MB | 600 MB |
| Kafka | 350 MB | 1.2 GB |
| OTEL Collector | 150 MB | 400 MB |
| Elasticsearch | 400 MB | 1.1 GB |
| Kibana | 500 MB | 1.3 GB |
| PostgreSQL (Alpine) | 80 MB | 230 MB |
| Jaeger | 60 MB | 180 MB |
| **Total** | ~1.7 GB | ~5 GB |

## Health Checks

All images include health check configurations:
- Kafka: `kafka-broker-api-versions`
- Zookeeper: `echo ruok | nc localhost 2181`
- Elasticsearch: `curl localhost:9200/_cluster/health`
- PostgreSQL: `pg_isready`
- OTEL: `wget localhost:13133`

## Alternative Images

If you need different distributions:

### Kafka Alternatives
- `apache/kafka:latest` - Official Apache Kafka
- `bitnami/kafka:latest` - Bitnami distribution
- `wurstmeister/kafka:latest` - Community image

### Zookeeper Alternatives
- `zookeeper:latest` - Official Apache ZooKeeper
- `bitnami/zookeeper:latest` - Bitnami distribution

### OpenTelemetry Alternatives
- `otel/opentelemetry-collector:latest` - Core version (smaller, fewer features)

## Resource Requirements

Minimum for all services:
- **CPU**: 2 cores
- **Memory**: 6 GB
- **Disk**: 20 GB

Recommended for production:
- **CPU**: 4 cores
- **Memory**: 12 GB
- **Disk**: 100 GB (with volume growth)

## Security Scanning

All images are regularly scanned for vulnerabilities:
- Confluent images: Weekly scans
- Official images: Continuous scanning by vendors
- Elastic images: Regular updates

Check vulnerabilities:
```bash
docker scan confluentinc/cp-kafka:7.4.0
```

## License Information

| Image | License |
|-------|---------|
| Kafka/Zookeeper (Confluent) | Apache 2.0 |
| OpenTelemetry | Apache 2.0 |
| Elasticsearch/Kibana | Elastic License 2.0 / SSPL |
| PostgreSQL | PostgreSQL License |
| Jaeger | Apache 2.0 |

**Note**: Elasticsearch 7.x uses Elastic License. For 100% OSS, use OpenSearch instead.

## Custom Configuration

All images support custom configuration via:
1. Environment variables
2. Volume-mounted config files
3. Command-line arguments

See `docker-compose.yml` for examples.
