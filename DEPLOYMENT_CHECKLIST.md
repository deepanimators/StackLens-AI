# Deployment Checklist - API Credential Priority System

**Deployment Date:** December 15, 2025  
**Deployed By:** ________________  
**Environment:** [ ] Development [ ] Staging [ ] Production  
**Approval:** [ ] Approved [ ] On Hold [ ] Rejected  

---

## Pre-Deployment Phase

### Code Review & Validation
- [ ] All code changes reviewed and approved
- [ ] No breaking changes identified
- [ ] Backward compatibility confirmed
- [ ] Security review completed
- [ ] Performance impact assessment done
- [ ] Documentation is accurate and complete

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Credential selection flow tested
- [ ] Jira automation verified
- [ ] API endpoints responding correctly
- [ ] Database schema validated
- [ ] Priority ordering verified (10, 20, 30, 40, 50)

### Preparation
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Support team notified
- [ ] Change management ticket created
- [ ] Maintenance window scheduled
- [ ] User communication drafted

---

## Migration Phase

### Pre-Migration
- [ ] All services stopped
- [ ] Database backup verified (test restore)
- [ ] Migration script reviewed
- [ ] Downtime window confirmed
- [ ] Team assembled and ready

### Migration Execution
- [ ] Code pulled and built
- [ ] Dependencies installed
- [ ] Database migration generated
- [ ] Migration executed successfully
- [ ] Migration validated (PRAGMA table_info shows priority column)
- [ ] Data integrity verified (record counts match)
- [ ] No errors in migration logs

### Post-Migration
- [ ] Default priorities set for existing credentials
- [ ] Database state verified
- [ ] All tables present and valid
- [ ] Indexes created properly
- [ ] Foreign keys intact

---

## Deployment Phase

### Pre-Start Checks
- [ ] All environment variables set correctly
- [ ] Configuration files in place
- [ ] Encryption keys configured
- [ ] Database connection string correct
- [ ] Port 4000 available (not in use)
- [ ] Required directories exist and writable
- [ ] Log directories configured

### Start Services
- [ ] API server started successfully
- [ ] No errors in startup logs
- [ ] Database connected and initialized
- [ ] Credentials loaded from database
- [ ] Provider initialization logged with priorities
- [ ] All routes registered
- [ ] Server listening on correct port

### Initial Validation
- [ ] Health check endpoint responding
- [ ] API is accessible
- [ ] Database connectivity verified
- [ ] Credential service operational
- [ ] Jira service initialized
- [ ] RAG system initialized
- [ ] Vector database initialized or fallback active

---

## Testing Phase

### Functional Testing
- [ ] GET /api/test - returns 200 OK
- [ ] GET /api/admin/credentials - lists all credentials
- [ ] POST /api/admin/credentials - can create new credential with priority
- [ ] PATCH /api/admin/credentials/:id - can update priority
- [ ] Credentials returned sorted by priority (ASC)
- [ ] Default priorities assigned correctly:
  - [ ] Gemini = 10
  - [ ] Groq = 20
  - [ ] OpenRouter = 30
  - [ ] OpenAI = 40
  - [ ] Anthropic = 50

### Jira Automation Testing
- [ ] Real-time error creates Jira ticket
- [ ] File upload does NOT create Jira ticket
- [ ] Jira ticket contains correct error details
- [ ] Jira integration status verified

### Performance Testing
- [ ] API response time < 200ms
- [ ] Credential queries perform efficiently
- [ ] No memory leaks in logs
- [ ] Database query times acceptable
- [ ] No increase in error rates

### Integration Testing
- [ ] Database operations succeed
- [ ] Encryption/decryption working
- [ ] Usage tracking working
- [ ] Rate limiting functioning
- [ ] Error handling proper
- [ ] Logging comprehensive

---

## Verification Phase

### Data Verification
- [ ] All existing credentials present
- [ ] Priorities assigned correctly
- [ ] API keys still encrypted
- [ ] No data corruption
- [ ] Audit logs accurate
- [ ] User assignments intact

### Feature Verification
- [ ] Priority-based selection working
- [ ] Fallback logic functional
- [ ] Admin UI displays priorities
- [ ] Can edit priorities via UI
- [ ] Can edit priorities via API
- [ ] Suggestions use correct provider

### Monitoring
- [ ] Logs being written correctly
- [ ] Error tracking working
- [ ] Performance metrics available
- [ ] Alerts configured
- [ ] Dashboard updated
- [ ] Metrics collection enabled

---

## Post-Deployment Phase

### Immediate Actions
- [ ] User notification sent
- [ ] Team debriefing completed
- [ ] Issues logged (if any)
- [ ] Performance baseline established
- [ ] Monitoring active
- [ ] Rollback plan ready (if needed)

### 24-Hour Validation
- [ ] No critical errors in logs
- [ ] Performance stable
- [ ] All endpoints functioning
- [ ] Credentials working as expected
- [ ] Jira automation working
- [ ] Users reporting no issues
- [ ] Database health good

### 7-Day Validation
- [ ] System stable for full week
- [ ] No unexpected errors
- [ ] Performance metrics normal
- [ ] User feedback positive
- [ ] All features working as expected
- [ ] Ready to close change ticket

---

## Sign-Off

### Development Team
- **Lead Developer:** ________________ Date: ________
- **Code Reviewer:** ________________ Date: ________
- **QA Lead:** ________________ Date: ________

### Operations Team
- **DevOps Engineer:** ________________ Date: ________
- **Database Admin:** ________________ Date: ________
- **Operations Manager:** ________________ Date: ________

### Management
- **Project Manager:** ________________ Date: ________
- **Product Owner:** ________________ Date: ________
- **Release Manager:** ________________ Date: ________

---

## Deployment Summary

**Deployment Status:** [ ] Successful [ ] Partial [ ] Failed [ ] Rolled Back

**Start Time:** ________________  
**End Time:** ________________  
**Total Duration:** ________________  
**Downtime:** ________________  

**Issues Encountered:**
- [ ] None
- [ ] Minor (< 15 min recovery)
- [ ] Major (> 15 min recovery)
- [ ] Critical (system unavailable)

**Description of Issues (if any):**
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________

**Resolution:**
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________

**Lessons Learned:**
__________________________________________________________________
__________________________________________________________________
__________________________________________________________________

**Follow-up Actions Required:**
- [ ] None
- [ ] Monitor for 24 hours
- [ ] Investigate issue #________
- [ ] Schedule additional testing
- [ ] Other: ________________

---

## Rollback Decision

**Rollback Status:** [ ] Not needed [ ] Requested [ ] In progress [ ] Completed

**Reason (if rolled back):**
__________________________________________________________________
__________________________________________________________________

**Rollback Time:** ________________  
**Rollback Completion:** ________________  
**Data Recovery Status:** [ ] Complete [ ] Partial [ ] Failed  

---

## Communication Log

**Pre-Deployment Notification:** Date ________ Time ________
**Deployment Start:** Date ________ Time ________
**Deployment Complete:** Date ________ Time ________
**User Notification:** Date ________ Time ________
**Post-Deployment Brief:** Date ________ Time ________

---

## Approval & Authorization

**Change Ticket:** ________________  
**CAB Decision:** ________________  
**Approval Authority:** ________________  

**Authorized By:**
Signature: ________________________ Date: ________

**Received By:**
Signature: ________________________ Date: ________

---

## Archive & Documentation

- [ ] Deployment logs archived
- [ ] Configuration backed up
- [ ] Database backup verified
- [ ] Change documentation complete
- [ ] Lessons learned documented
- [ ] Incident report (if needed) created
- [ ] Follow-up actions assigned
- [ ] Change ticket closed

**Archive Location:** ________________  
**Documentation:** ✅ Complete  
**Deployment Package:** ✅ Saved  

---

**Checklist Version:** 1.0  
**Last Updated:** December 15, 2025  
**Next Update:** After first production deployment
