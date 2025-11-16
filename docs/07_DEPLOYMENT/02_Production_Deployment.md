# Production Deployment - StackLens AI

**Version:** 1.0  
**Updated:** November 16, 2025  
**Difficulty:** Advanced  
**Time:** 2-4 hours

---

## 🚀 Production Deployment Guide

Complete guide for deploying StackLens AI to production.

---

## 📋 Pre-Deployment Checklist

### Infrastructure
- [ ] Production server(s) provisioned
- [ ] PostgreSQL database set up
- [ ] SSL/TLS certificates obtained
- [ ] Domain name configured
- [ ] Firewall rules configured
- [ ] Backup strategy in place

### Configuration
- [ ] Environment variables prepared
- [ ] Jira integration configured
- [ ] Database backups tested
- [ ] Monitoring tools set up
- [ ] Log aggregation configured
- [ ] Error alerting configured

### Code
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Dependency audit passed
- [ ] Performance benchmarks acceptable

### Team
- [ ] Deployment plan approved
- [ ] Rollback procedure documented
- [ ] Team trained on new system
- [ ] Support contacts assigned
- [ ] On-call rotation updated

---

## 🛠️ Step 1: Environment Setup

### Server Requirements

```
Minimum:
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- OS: Ubuntu 20.04 LTS or Amazon Linux 2

Recommended:
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 100GB+ SSD
- OS: Ubuntu 22.04 LTS
```

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx (Reverse Proxy)
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install certbot (SSL/TLS)
sudo apt install -y certbot python3-certbot-nginx
```

### Verify Installation

```bash
node --version   # v18+
npm --version    # 8+
psql --version   # PostgreSQL 12+
nginx -v         # Verify Nginx
pm2 --version    # Verify PM2
```

---

## 🔐 Step 2: Database Setup

### PostgreSQL Configuration

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE stacklens_prod;

# Create application user
CREATE USER stacklens_user WITH PASSWORD 'strong_password_here';

# Grant privileges
ALTER ROLE stacklens_user SET client_encoding TO 'utf8';
ALTER ROLE stacklens_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE stacklens_user SET default_transaction_deferrable TO on;
ALTER ROLE stacklens_user SET default_tzinfo TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE stacklens_prod TO stacklens_user;

# Exit
\q
```

### Run Migrations

```bash
# Clone repository
git clone https://github.com/deepanimators/StackLens-AI.git
cd StackLens-AI-Deploy

# Install dependencies
npm install

# Set database URL
export DATABASE_URL="postgresql://stacklens_user:password@localhost:5432/stacklens_prod"

# Run migrations
npm run db:migrate
```

### Verify Database

```bash
# Connect as application user
psql postgresql://stacklens_user:password@localhost:5432/stacklens_prod

# List tables
\dt

# Check migration status
\q
```

---

## 📝 Step 3: Environment Configuration

### Create Production .env File

```bash
# Create .env file
sudo nano /opt/stacklens/.env
```

**Content:**
```bash
# Server Configuration
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://stacklens_user:password@localhost:5432/stacklens_prod

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Jira Configuration
JIRA_API_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=STACK

# Logging
LOG_FILE_PATH=/var/log/stacklens/app.log
LOG_ERROR_FILE_PATH=/var/log/stacklens/error.log

# Frontend
VITE_API_URL=https://your-domain.com/api

# Security
CORS_ORIGIN=https://your-domain.com
ALLOWED_HOSTS=your-domain.com

# Email (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@your-domain.com

# Firebase (Optional)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
```

### Secure Environment File

```bash
# Change permissions
sudo chown root:root /opt/stacklens/.env
sudo chmod 600 /opt/stacklens/.env

# Never commit .env to Git
echo ".env" >> .gitignore
```

---

## 🏗️ Step 4: Build Application

```bash
# Install dependencies
npm ci --omit=dev

# Build frontend
npm run build

# Verify build
ls -la dist/
```

---

## ⚙️ Step 5: Configure Process Manager

### PM2 Ecosystem File

```bash
# Create ecosystem.config.js
cat > /opt/stacklens/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'stacklens-api',
      script: 'npm',
      args: 'run start',
      cwd: '/opt/stacklens',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 'max',
      exec_mode: 'cluster',
      error_file: '/var/log/stacklens/pm2-error.log',
      out_file: '/var/log/stacklens/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
EOF
```

### Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Start on system boot
pm2 startup

# Monitor
pm2 monit
```

---

## 🌐 Step 6: Configure Nginx

### SSL Certificate

```bash
# Get Let's Encrypt certificate
sudo certbot certonly --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/stacklens
```

**Content:**
```nginx
upstream stacklens_api {
  least_conn;
  server localhost:4000;
  server localhost:4001;
  keepalive 64;
}

server {
  listen 80;
  server_name your-domain.com;
  
  # Redirect HTTP to HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name your-domain.com;

  # SSL Certificates
  ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;

  # Security Headers
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  # Gzip Compression
  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
  gzip_min_length 1000;

  # Proxy to API
  location /api/ {
    proxy_pass http://stacklens_api/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }

  # SSE streaming
  location /api/sse/ {
    proxy_pass http://stacklens_api/api/sse/;
    proxy_http_version 1.1;
    proxy_buffering off;
    proxy_set_header Connection '';
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  # Static files
  location / {
    root /opt/stacklens/dist;
    try_files $uri $uri/ /index.html;
    expires 1h;
    add_header Cache-Control "public, immutable";
  }
}
```

### Enable Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/stacklens \
           /etc/nginx/sites-enabled/stacklens

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📊 Step 7: Configure Monitoring

### Application Monitoring

```bash
# Monitor logs
tail -f /var/log/stacklens/app.log
tail -f /var/log/stacklens/error.log

# Check system health
curl https://your-domain.com/api/health
```

### PM2 Monitoring

```bash
# Real-time dashboard
pm2 monit

# View logs
pm2 logs stacklens-api

# Get stats
pm2 status
```

---

## 🔄 Step 8: Backup Strategy

### Database Backups

```bash
# Create backup script
cat > /opt/stacklens/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/stacklens"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump postgresql://stacklens_user:password@localhost:5432/stacklens_prod \
  | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz

# Keep only last 30 backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/stacklens/backup.sh
```

### Automated Backups

```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/stacklens/backup.sh") \
  | crontab -
```

---

## 🚨 Step 9: Error Handling

### Error Monitoring

```bash
# Check PM2 errors
pm2 logs stacklens-api --err

# Check system logs
sudo journalctl -u stacklens -f

# Check Nginx errors
sudo tail -f /var/log/nginx/error.log
```

### Auto-Recovery

```bash
# PM2 auto-restarts failed processes
pm2 describe stacklens-api

# Check restart count
pm2 list
```

---

## ✅ Post-Deployment Verification

### Health Checks

```bash
# API Health
curl https://your-domain.com/api/health

# Database Connection
curl https://your-domain.com/api/health/db

# Jira Integration
curl https://your-domain.com/api/jira/status
```

### Functional Tests

```bash
# Test error endpoint
curl -X GET https://your-domain.com/api/errors \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test Jira integration
curl -X GET https://your-domain.com/api/jira/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Performance Tests

```bash
# Load testing
npm run test:load

# Check response times
npm run test:performance
```

---

## 📈 Scaling Considerations

### Horizontal Scaling

For multiple servers:

```bash
# Instance 2 on different port
PORT=4001 pm2 start ecosystem.config.js

# Nginx load balancing (already configured)
# Distributes traffic across instances
```

### Database Scaling

```sql
-- Create indexes for common queries
CREATE INDEX idx_errors_created_at ON errors(created_at);
CREATE INDEX idx_errors_severity ON errors(severity);
CREATE INDEX idx_tickets_error_id ON jira_tickets(error_id);

-- Monitor slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC;
```

---

## 🔄 Rollback Procedure

### In Case of Issues

```bash
# Check PM2 history
pm2 describe stacklens-api

# Revert to previous version
git checkout previous-tag
npm run build
pm2 restart stacklens-api

# Verify
curl https://your-domain.com/api/health
```

---

## 📚 Maintenance Tasks

### Weekly
- [ ] Check log file sizes
- [ ] Verify backups completed
- [ ] Review error trends
- [ ] Check disk usage

### Monthly
- [ ] Database maintenance
- [ ] Security updates
- [ ] Dependency updates
- [ ] Performance review

### Quarterly
- [ ] Full disaster recovery test
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Cost optimization

---

## 🆘 Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs stacklens-api

# Verify environment variables
env | grep DATABASE_URL

# Check database connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### High Memory Usage

```bash
# Check memory
pm2 monit

# Restart application
pm2 restart stacklens-api

# Check for memory leaks
npm run test:memory
```

### Jira Integration Failing

```bash
# Verify credentials
curl -X GET https://your-domain.atlassian.net/rest/api/3/myself \
  -u "email@example.com:api-token"

# Check API token
echo $JIRA_API_TOKEN
```

---

## 📞 Support & Resources

- [Deployment FAQ](../08_TROUBLESHOOTING/04_FAQ.md)
- [Common Issues](../08_TROUBLESHOOTING/01_Common_Issues.md)
- [Debug Guide](../08_TROUBLESHOOTING/02_Debug_Guide.md)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete
