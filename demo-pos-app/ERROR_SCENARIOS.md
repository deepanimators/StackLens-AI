# POS Error Scenarios - Complete Documentation

## Overview
This document describes the 50+ realistic Point of Sale (POS) error scenarios implemented for StackLens AI testing and demonstration. These scenarios are based on real-world POS system challenges across retail and restaurant industries.

## Error Categories

### 1. Payment Processing Errors (5 scenarios)
Most critical category - directly impacts revenue and customer experience.

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| PAY_001 | Payment Gateway Timeout | Critical | 15% | Lost sale, poor CX |
| PAY_002 | Card Declined - Insufficient Funds | Medium | 25% | Sale delayed, abandonment risk |
| PAY_003 | EMV Chip Read Failure | High | 20% | Transaction delay, fraud risk |
| PAY_004 | Split Payment Failure | Medium | 12% | Complex refund, dissatisfaction |
| PAY_005 | Duplicate Transaction Posted | Critical | 8% | Customer overcharged, chargebacks |

**Common Causes:**
- Network latency and connectivity issues
- Payment processor overload
- Hardware malfunction (card readers)
- Software bugs in payment logic
- Insufficient customer funds

**Recovery Actions:**
- Retry with exponential backoff
- Switch to backup payment gateway
- Offer alternative payment methods
- Implement idempotency keys

### 2. Inventory Management Errors (4 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| INV_001 | Out of Stock - System Mismatch | High | 18% | Lost sale, inventory accuracy issues |
| INV_002 | Barcode Scan Failure | Medium | 22% | Slow checkout, pricing errors |
| INV_003 | Negative Stock Error | Medium | 10% | Sale blocked, integrity concern |
| INV_004 | Price Lookup Failure | High | 14% | Transaction cannot complete |

**Common Causes:**
- Unrecorded shrinkage or theft
- Receiving errors
- Failed synchronization
- Damaged or missing barcodes
- Database inconsistencies

**Recovery Actions:**
- Physical inventory recounts
- Manual SKU entry
- Manager price overrides
- Real-time inventory tracking (RFID)

### 3. Network & Connectivity Errors (3 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| NET_001 | Database Connection Lost | Critical | 8% | Complete POS shutdown |
| NET_002 | API Rate Limit Exceeded | High | 12% | Reduced throughput |
| NET_003 | Cloud Service Degradation | High | 10% | Slow checkout |

**Common Causes:**
- Network outages
- Firewall blocking
- Cloud provider issues
- DDoS attacks
- Insufficient rate limits

**Recovery Actions:**
- Implement offline mode
- Request queuing
- Multi-region deployment
- Redundant network paths

### 4. Hardware Failures (4 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| HW_001 | Receipt Printer Paper Jam | Medium | 28% | No receipt, customer dissatisfaction |
| HW_002 | Cash Drawer Won't Open | High | 15% | Cannot accept cash |
| HW_003 | Touchscreen Calibration Drift | Medium | 16% | Entry errors, slow transactions |
| HW_004 | Barcode Scanner Malfunction | High | 24% | Very slow checkout, long queues |

**Common Causes:**
- Worn hardware components
- Dust and dirt buildup
- Cable disconnections
- Power issues
- Hardware age and degradation

**Recovery Actions:**
- Regular maintenance schedules
- Backup hardware availability
- Digital receipt alternatives
- Peripheral monitoring systems

### 5. Database & Data Integrity Errors (3 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| DB_001 | Transaction Deadlock | High | 10% | Transaction failures |
| DB_002 | Data Corruption Detected | Critical | 3% | Potential data loss |
| DB_003 | Connection Pool Exhaustion | High | 12% | System can't accept new transactions |

**Common Causes:**
- Concurrent updates and lock contention
- Hardware or disk failures
- Power outages during writes
- Connection leaks
- Slow queries

**Recovery Actions:**
- Optimize queries and indexes
- Regular backups and replication
- RAID storage with UPS
- Connection timeout implementation
- Transaction scope reduction

### 6. Integration & Third-Party Errors (3 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| INT_001 | Loyalty System API Down | Medium | 14% | Cannot honor rewards |
| INT_002 | Tax Calculation Service Error | High | 8% | Cannot complete sale |
| INT_003 | Email Receipt Service Down | Low | 18% | No digital receipt |

**Common Causes:**
- Third-party API downtime
- Authentication failures
- Service maintenance windows
- Rate limiting
- Network issues

**Recovery Actions:**
- Offline mode with cached data
- Fallback calculation logic
- Queue with retry mechanism
- Multiple service providers

### 7. Security & Authentication Errors (3 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| SEC_001 | Employee Authentication Failure | High | 16% | Terminal unavailable |
| SEC_002 | PCI Compliance Violation Detected | Critical | 2% | Legal liability, fines up to $500k |
| SEC_003 | Suspicious Transaction Pattern | High | 10% | Transaction delayed, potential fraud |

**Common Causes:**
- Wrong/expired passwords
- Unencrypted card data storage
- Logging sensitive information
- Unusual transaction patterns
- Account lockouts

**Recovery Actions:**
- Self-service password reset
- End-to-end encryption and tokenization
- Biometric authentication
- Fraud detection ML models
- PCI compliance audits

### 8. Performance & System Errors (3 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| PERF_001 | Memory Leak Detected | High | 8% | System instability, crashes |
| PERF_002 | Disk Space Critical | High | 12% | System failure risk |
| PERF_003 | CPU Overload | High | 10% | Severely slow checkout |

**Common Causes:**
- Software bugs
- Log file growth
- Inefficient code
- Resource not released
- Heavy processing load

**Recovery Actions:**
- Automated log rotation
- Memory monitoring and auto-restart
- Code optimization
- Load balancing
- Hardware upgrades

### 9. Data Synchronization Errors (2 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| SYNC_001 | Price Sync Failure | High | 15% | Revenue loss, pricing errors |
| SYNC_002 | Inventory Sync Conflict | Medium | 12% | Overselling, fulfillment problems |

**Common Causes:**
- Network failures
- Concurrent updates
- Data format errors
- Race conditions
- Network partitions

**Recovery Actions:**
- Robust sync mechanisms
- Conflict resolution strategies (CRDT)
- Version vectors
- Distributed locking
- Eventual consistency handling

### 10. System Configuration Errors (4 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| SYS_001 | Configuration Mismatch | Medium | 10% | System operating incorrectly |
| SYS_002 | Software Version Incompatibility | Critical | 5% | Terminal non-functional |
| SYS_003 | Time Synchronization Error | Medium | 8% | Incorrect timestamps, auth failures |
| SYS_004 | License Expiration | Critical | 4% | Complete system shutdown |

**Common Causes:**
- Failed config updates
- Stale client software
- Clock drift
- NTP server unreachable
- License renewal forgotten

**Recovery Actions:**
- Automated config management
- Version control and validation
- Redundant NTP servers
- License management system
- Auto-renewal with reminders

### 11. Miscellaneous Realistic Scenarios (6 scenarios)

| ID | Name | Severity | Probability | Business Impact |
|----|------|----------|-------------|-----------------|
| MISC_001 | Gift Card Balance Check Failed | High | 12% | Cannot accept gift cards |
| MISC_002 | Excessive Failed Login Attempts | Medium | 14% | Terminal unavailable |
| MISC_003 | Customer Display Not Working | Low | 18% | Customer cannot verify charges |
| MISC_004 | Contactless Payment Rejected | Medium | 20% | Transaction delay |
| MISC_005 | Serial Number Duplicate | Medium | 6% | Cannot complete sale |
| MISC_006 | Thermal Printer Overheating | Medium | 10% | Cannot print receipts |

## API Endpoints for Error Simulation

### List All Scenarios
```bash
GET http://localhost:3001/scenarios
```
Returns complete list of all 50+ error scenarios with details.

### Simulate Specific Error
```bash
POST http://localhost:3001/simulate-error/:errorId
```
Example:
```bash
curl -X POST http://localhost:3001/simulate-error/PAY_001
```

### Simulate Random Error
```bash
POST http://localhost:3001/simulate-random-error
```
Selects error based on probability weighting (more common errors more likely).

### Batch Error Simulation
```bash
POST http://localhost:3001/simulate-errors/batch
Content-Type: application/json

{
  "count": 10,
  "category": "payment",    // optional filter
  "severity": "critical"     // optional filter
}
```

Examples:
```bash
# Simulate 10 critical errors
curl -X POST http://localhost:3001/simulate-errors/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "severity": "critical"}'

# Simulate 5 payment-related errors
curl -X POST http://localhost:3001/simulate-errors/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 5, "category": "payment"}'

# Simulate 20 random errors
curl -X POST http://localhost:3001/simulate-errors/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 20}'
```

## Error Event Structure

Each error event sent to StackLens includes:

```json
{
  "type": "error",
  "message": "Payment gateway timeout - transaction took longer than 30 seconds",
  "action": "error_payment_pay_001",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "source": "demo-pos-app",
  "details": {
    "errorCode": "PAYMENT_TIMEOUT",
    "errorId": "PAY_001",
    "category": "payment",
    "severity": "critical",
    "symptoms": [
      "Customer waiting",
      "Transaction pending",
      "Terminal frozen"
    ],
    "causes": [
      "Network latency",
      "Gateway server overload",
      "Network congestion",
      "DDoS attack"
    ],
    "businessImpact": "Customer cannot complete purchase, lost sale, poor customer experience",
    "immediateActions": [
      "Retry transaction",
      "Switch to backup payment processor",
      "Offer alternative payment method"
    ],
    "affectedComponents": [
      "Payment Terminal",
      "Network",
      "Payment Gateway API"
    ],
    "stackTrace": "Error: Payment gateway timeout...\n    at PaymentProcessor.process (payment-gateway.ts:234)..."
  }
}
```


## Additional Scenarios (New)

### Payment & Wallet Issues
| ID | Name | Severity | Description |
|----|------|----------|-------------|
| PAY_006 | Digital Wallet Handshake Failure | Medium | NFC handshake failed for Apple/Google Pay |
| PAY_007 | Currency Conversion Error | Low | DCC service unavailable for international card |

### Inventory & Returns
| ID | Name | Severity | Description |
|----|------|----------|-------------|
| INV_005 | Damaged Item Return Error | Medium | Return rejected due to condition code |
| INV_006 | Bundle SKU Decomposition Fail | High | Bundle sold but components not deducted |

### Network & Security
| ID | Name | Severity | Description |
|----|------|----------|-------------|
| NET_004 | DNS Resolution Failure | Critical | Cannot resolve payment gateway hostname |
| NET_005 | SSL Certificate Expired | Critical | Backend API connection failed due to expired cert |
| SEC_004 | Session Token Expired | Medium | User logged out mid-transaction |
| SEC_005 | Unauthorized Refund Attempt | High | Refund exceeds user limit |

### Hardware & Peripherals
| ID | Name | Severity | Description |
|----|------|----------|-------------|
| HW_005 | Scale Calibration Error | High | Scale reporting unstable/negative weight |
| HW_006 | Biometric Reader Failure | Medium | Fingerprint scanner not responding |
| SYS_005 | Peripheral Driver Crash | High | Universal driver service stopped |

### Data & System
| ID | Name | Severity | Description |
|----|------|----------|-------------|
| DATA_001 | Customer Profile Corrupt | Medium | JSON error loading loyalty profile |
| DATA_002 | Tax Rate Table Missing | Critical | No tax rates for current region |
| INT_004 | KDS Timeout | High | Order failed to reach kitchen display |
| INT_005 | Accounting Sync Failure | Medium | EOD batch failed to post to ERP |
| PERF_004 | UI Thread Blocked | Medium | App frozen by heavy calculation |
| PERF_005 | Database Index Missing | Medium | Slow product search query |
| MISC_007 | Font Rendering Error | Low | Receipt text corrupted |
| MISC_008 | USB Port Security Violation | High | Unauthorized device detected |

## Testing with StackLens AI

### Basic Test Flow
1. Start StackLens API server (port 4000)
2. Start Demo POS app (port 3001)
3. Navigate to Realtime Analytics page
4. Trigger errors using simulation endpoints
5. Watch AI analysis update in real-time

### Recommended Test Scenarios

**Test 1: Critical Payment Failure**
```bash
curl -X POST http://localhost:3001/simulate-error/PAY_005
```
Expected: AI should identify duplicate transaction risk and recommend idempotency implementation.

**Test 2: Hardware Cascade Failure**
```bash
curl -X POST http://localhost:3001/simulate-errors/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 3, "category": "hardware"}'
```
Expected: AI should identify hardware maintenance issues and recommend preventive maintenance schedule.

**Test 3: Peak Load Simulation**
```bash
curl -X POST http://localhost:3001/simulate-errors/batch \
  -H "Content-Type: application/json" \
  -d '{"count": 15}'
```
Expected: AI should analyze patterns and identify most impactful issues.

**Test 4: Security Incident**
```bash
curl -X POST http://localhost:3001/simulate-error/SEC_002
```
Expected: AI should flag as critical compliance issue requiring immediate action.

## Probability Weighting

Each error has a probability score (0-100) representing real-world likelihood:
- High probability (>20%): Common daily issues (barcode scan failures, printer jams)
- Medium probability (10-20%): Weekly occurrences (inventory mismatches, auth failures)
- Low probability (<10%): Monthly or rare events (data corruption, PCI violations)

The `getRandomError()` function uses these weights to create realistic error distributions.

## Integration with AI Analysis

Each error scenario includes:
- **Symptoms**: Observable indicators
- **Causes**: Root cause possibilities
- **Business Impact**: Revenue/operational effects
- **Immediate Actions**: First response steps
- **Long-Term Fix**: Permanent solution
- **Affected Components**: System areas involved

This structured data enables StackLens AI (Gemini) to provide:
1. Accurate error classification
2. Root cause analysis
3. Impact assessment
4. Prioritized recommendations
5. Prevention strategies

## Future Enhancements

Potential additions:
1. Time-of-day patterns (rush hour errors)
2. Seasonal variations (holiday peak issues)
3. Store-specific error profiles
4. Multi-error correlation scenarios
5. Recovery success/failure outcomes
6. Customer impact metrics
7. Financial loss calculations

## References

Error scenarios based on research from:
- PCI Security Standards Council
- National Retail Federation (NRF) reports
- Payment processor documentation
- POS vendor support tickets
- Retail IT best practices
- Restaurant technology studies
