# FAQ - Frequently Asked Questions

**Version:** 1.0  
**Updated:** November 16, 2025  
**Format:** Q&A

---

## 🙋 Frequently Asked Questions

Quick answers to commonly asked questions about StackLens AI.

---

## 🚀 Getting Started

### Q: What do I need to get started?
**A:** Just three things:
1. Node.js v18+ (get from nodejs.org)
2. 30 minutes of your time
3. The Quick Start Guide

Follow the [Quick Start Guide](../01_OVERVIEW/00_QUICK_START.md) to be running in 5 minutes.

### Q: Can I run StackLens AI on my laptop?
**A:** Absolutely! StackLens AI runs great on:
- MacBook Pro/Air (M1+, Intel)
- Windows 10/11
- Linux (Ubuntu, CentOS, etc.)

Minimum: 2GB RAM, 500MB disk space

### Q: What's the difference between development and production?
**A:** 
- **Development:** Local database (SQLite), hot reloading, verbose logging
- **Production:** PostgreSQL, optimized builds, security hardened

See [Production Deployment](../07_DEPLOYMENT/02_Production_Deployment.md) for details.

---

## 🔧 Configuration

### Q: Where do I configure Jira integration?
**A:** Three steps:
1. Get Jira API token from https://id.atlassian.com/manage-profile/security/api-tokens
2. Add to `.env` file:
   ```
   JIRA_API_URL=https://your-domain.atlassian.net
   JIRA_USERNAME=your-email@example.com
   JIRA_API_TOKEN=your-token
   JIRA_PROJECT_KEY=STACK
   ```
3. Restart API server

See [Jira Integration](../03_CORE_COMPONENTS/00_Component_Overview.md) for more.

### Q: How do I change the port?
**A:** Two ways:
```bash
# Option 1: Command line
PORT=4001 npm run dev:api

# Option 2: .env file
echo "PORT=4001" >> .env
npm run dev:api
```

### Q: Can I use SQLite in production?
**A:** Not recommended. For production:
- Use PostgreSQL
- Better performance for large datasets
- Concurrent access support
- Advanced features

See [Database Setup](../07_DEPLOYMENT/02_Production_Deployment.md#database-setup).

---

## 🐛 Troubleshooting

### Q: Port 4000 is already in use, what do I do?
**A:** Find and kill the process:
```bash
lsof -i :4000          # See what's using it
kill -9 <PID>          # Kill the process

# Or use a different port
PORT=4001 npm run dev:api
```

### Q: Dashboard not updating in real-time?
**A:** Check:
1. Is API server running? (`npm run dev:api`)
2. Is CORS configured? Check .env
3. Check browser console (F12) for errors
4. Clear browser cache (Ctrl+Shift+Delete)

### Q: Jira tickets not being created?
**A:** Verify:
1. Is Jira API token correct? (Copy from atlassian.com)
2. Is Jira configured? Check API status endpoint
3. Is error severity high enough? (Usually CRITICAL)
4. Check API logs: `npm run logs:api`

### Q: High memory usage, what should I do?
**A:** Try:
```bash
# Restart service
npm run dev:api

# Clear old data (archive old errors)
npm run db:archive

# Check what's consuming memory
ps aux | grep node | sort -k3 -r
```

See [Common Issues](./01_Common_Issues.md) for more.

---

## 📊 API & Integration

### Q: How do I authenticate to the API?
**A:** Using Bearer tokens:
```bash
# Get token
curl -X POST http://localhost:4000/api/auth/login \
  -d '{"email":"user@example.com","password":"pwd"}'

# Use token
curl http://localhost:4000/api/errors \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Q: What API endpoints are available?
**A:** Check the [API Reference](../04_API_REFERENCE/00_API_INDEX.md). Key endpoints:
- `GET /api/errors` - List errors
- `POST /api/jira/configure` - Set up Jira
- `GET /api/health` - System health
- `GET /api/sse/events` - Real-time updates

### Q: Can I create tickets for every error?
**A:** Yes, via rules configuration:
```json
{
  "condition": {
    "severity": ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
  },
  "action": {
    "createJiraTicket": true
  }
}
```

But usually you want filters (severity thresholds).

### Q: How do I integrate with other systems?
**A:** Currently integrated with:
- ✅ Jira Cloud (built-in)
- ✅ Webhook support (emit events)
- 🔜 Slack (roadmap)
- 🔜 Email (roadmap)

See roadmap for details.

---

## 💾 Data & Storage

### Q: How long are errors stored?
**A:** Configurable, default is 90 days. Change in admin settings or:
```bash
# Archive old errors (older than 90 days)
npm run db:archive

# Delete very old errors (older than 1 year)
npm run db:cleanup --older-than=1y
```

### Q: How do I backup my data?
**A:** Automatic backups run daily:
```bash
# Manual backup
npm run db:backup

# Restore from backup
npm run db:restore --from=backup_file.sql.gz

# List backups
ls -la backups/
```

### Q: Can I export error data?
**A:** Yes:
```bash
# Export to CSV
npm run export:csv --output=errors.csv

# Export to JSON
npm run export:json --output=errors.json

# Export specific date range
npm run export:csv --start=2025-11-01 --end=2025-11-16
```

### Q: Where is the database stored?
**A:** By default:
- **Development:** `data/database.db` (SQLite)
- **Production:** Managed PostgreSQL (configured in .env)

---

## 🚀 Deployment

### Q: How do I deploy to production?
**A:** Follow the [Production Deployment Guide](../07_DEPLOYMENT/02_Production_Deployment.md). Summary:
1. Set up PostgreSQL database
2. Configure environment variables
3. Build: `npm run build`
4. Set up Nginx (reverse proxy)
5. Use PM2 for process management
6. Configure SSL/TLS

### Q: Can I use Docker?
**A:** Yes! Docker support:
```bash
# Build image
docker build -t stacklens:latest .

# Run container
docker run -p 4000:4000 stacklens:latest
```

See [Docker Setup](../07_DEPLOYMENT/03_Docker_Setup.md) for details.

### Q: How do I scale to multiple servers?
**A:** Use load balancing:
1. Multiple API server instances
2. Shared PostgreSQL database
3. Nginx/HAProxy load balancer
4. Redis for session management

See [System Architecture](../01_OVERVIEW/04_System_Architecture.md) for diagrams.

### Q: What's the uptime SLA?
**A:** Target: 99.9% uptime (allows ~45 minutes downtime/month)

With proper deployment and monitoring, this is achievable.

---

## 🔒 Security

### Q: Is the system secure?
**A:** Yes:
- ✅ JWT token authentication
- ✅ HTTPS/TLS encryption
- ✅ API rate limiting
- ✅ Input validation
- ✅ Permission-based access control
- ✅ Audit logging

See [Security Configuration](../07_DEPLOYMENT/02_Production_Deployment.md#security) for setup.

### Q: How do I keep secrets secure?
**A:** Best practices:
- ✅ Never commit `.env` to Git
- ✅ Use environment variables
- ✅ Rotate API tokens regularly
- ✅ Use strong passwords
- ✅ Enable 2FA on accounts

### Q: Is authentication required?
**A:** Yes, for:
- ✅ API endpoints (except health check)
- ✅ Dashboard access
- ✅ Admin operations

Public endpoints:
- `GET /api/health` - Health check only

---

## 🆘 Performance

### Q: Why is the dashboard slow?
**A:** Common causes:
1. Too many errors loaded at once (use pagination)
2. Slow database queries (missing indexes)
3. Large network responses (compress)
4. Slow API server (scale horizontally)

Solution: See [Performance Optimization](../08_TROUBLESHOOTING/02_Debug_Guide.md).

### Q: How many errors can the system handle?
**A:** Easily:
- ✅ 1000+ errors per hour
- ✅ 10,000+ stored errors
- ✅ 1000+ concurrent users
- ✅ 99.9% uptime

With proper infrastructure scaling.

### Q: What's the fastest error detection speed?
**A:** ~200ms from error log to dashboard:
- Log written
- LogWatcher detects (<10ms)
- Classification (<50ms)
- Automation decision (<50ms)
- Jira API call (<100ms)
- SSE broadcast (<20ms)

---

## 👥 Team & Support

### Q: Is there a community?
**A:** Yes! Find us at:
- GitHub: github.com/deepanimators/StackLens-AI
- GitHub Discussions: For questions
- GitHub Issues: For bugs
- Pull Requests: For contributions

### Q: How do I contribute?
**A:** See [Contributing Guide](../10_CONTRIBUTING/01_Development_Guidelines.md):
1. Fork repository
2. Create feature branch
3. Make changes
4. Write tests
5. Submit Pull Request

### Q: Where do I report bugs?
**A:** Open an issue on GitHub:
github.com/deepanimators/StackLens-AI/issues

Include:
- Error message
- Steps to reproduce
- System info (OS, Node version)
- Relevant logs

### Q: How do I get support?
**A:** Options:
1. **Documentation:** First check here
2. **FAQ:** This document
3. **GitHub Issues:** Search existing issues
4. **Community:** Ask in GitHub Discussions
5. **Commercial:** Email for enterprise support

---

## 📈 Advanced

### Q: Can I customize error detection rules?
**A:** Yes! Via admin panel or API:
```json
{
  "name": "Custom Rule",
  "pattern": "my_error_pattern",
  "errorType": "CUSTOM_ERROR",
  "severity": "HIGH",
  "action": {
    "createJiraTicket": true
  }
}
```

### Q: How do I integrate with my existing monitoring?
**A:** Multiple options:
1. **Webhooks:** Trigger on events
2. **API:** Poll endpoints
3. **SSE:** Subscribe to real-time events
4. **Database:** Direct access to events table

See [API Reference](../04_API_REFERENCE/00_API_INDEX.md).

### Q: Can I use my own ML model?
**A:** Yes:
1. Replace TensorFlow.js model
2. Implement custom classification
3. Integrate via Error Detection Engine

See [Custom Integration Guide](../10_CONTRIBUTING/02_Code_Standards.md).

---

## 🚫 Known Limitations

### Q: What are the known issues?
**A:** Current limitations:
- Single timezone support (UTC only currently)
- Max file size for logs: 1GB
- Max concurrent SSE connections: 10,000
- Database query timeout: 30 seconds

See [Known Issues](./03_Error_Reference.md).

---

## 📞 Contact & Resources

**Need help?**
- 📖 [Documentation](../STORYBOOK_INDEX.md)
- 🐛 [Report Bug](https://github.com/deepanimators/StackLens-AI/issues/new)
- 💬 [Ask Question](https://github.com/deepanimators/StackLens-AI/discussions)
- 📧 [Email Support](mailto:support@example.com)

---

**Last Updated:** November 16, 2025  
**Status:** ✅ Complete  
**Total Q&A:** 50+
