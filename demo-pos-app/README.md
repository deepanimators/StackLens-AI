# Demo POS Application

Standalone Point of Sale (POS) application designed for **StackLens AI** demonstration and testing.

## Overview

This is a **separate, independent application** that simulates a real POS system with intentional errors to showcase StackLens AI's error detection and automated resolution capabilities.

## Features

✅ **Product Management** - Catalog of products with pricing
✅ **Order Processing** - Creates orders with error handling
✅ **Intentional Errors** - Product #999 has no price (triggers CRITICAL errors)
✅ **Real-time Logging** - All events logged to `logs/pos-application.log`
✅ **Event Emission** - Notifies StackLens AI of errors
✅ **Independent Operation** - Works standalone, optionally integrates with StackLens

## Quick Start

### Installation

```bash
cd demo-pos-app
npm install
```

### Development

```bash
npm run dev
```

Server will start on `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

## Configuration

Set environment variables in `.env`:

```env
PORT=3001
STACKLENS_URL=http://localhost:3000
STORE_NUMBER=STORE_001
KIOSK_NUMBER=KIOSK_001
POS_LOG_FILE_PATH=logs/pos-application.log
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Get Products
```bash
GET /products
```

Returns:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Laptop", "price": 999.99, ... },
    { "id": 999, "name": "Mystery Product", ... }  // No price!
  ]
}
```

### Create Order
```bash
POST /orders
Content-Type: application/json

{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

### Trigger Error (Product #999)
```bash
POST /orders
Content-Type: application/json

{
  "items": [
    { "productId": 999, "quantity": 1 }
  ]
}
```

Response (400 Bad Request):
```json
{
  "success": false,
  "data": {
    "orderId": "uuid-xxx",
    "status": "failed",
    "error": "Product #999 (Mystery Product) has no pricing information"
  }
}
```

### Get All Orders
```bash
GET /orders
```

### Get Specific Order
```bash
GET /orders/:orderId
```

### Get Status
```bash
GET /status
```

## Log Output

The application generates detailed logs in `logs/pos-application.log`:

```
[2024-11-13T10:30:45.123Z] [INFO] Order abc123 completed successfully | {...}
[2024-11-13T10:31:20.456Z] [CRITICAL] Pricing error in order | {
  "orderId": "def456",
  "productId": 999,
  "productName": "Mystery Product",
  "errorType": "MISSING_PRICE",
  "confidence": 0.99
}
```

## Integration with StackLens AI

The POS application sends error notifications to StackLens AI:

```
POST http://localhost:3000/api/demo-events
{
  "type": "error_detected",
  "orderId": "...",
  "storeNumber": "STORE_001",
  "kioskNumber": "KIOSK_001",
  "error": "Product #999 (Mystery Product) has no pricing information",
  "timestamp": "2024-11-13T10:31:20.456Z"
}
```

StackLens AI will:
1. ✅ Receive the error notification
2. ✅ Analyze the error using ML models
3. ✅ Classify severity (CRITICAL)
4. ✅ Create automatic Jira ticket
5. ✅ Display on real-time monitoring dashboard

## Project Structure

```
demo-pos-app/
├── src/
│   ├── index.ts           # Express server and routes
│   └── pos-service.ts     # POS business logic
├── dist/                  # Compiled JavaScript (generated)
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript configuration
├── .env                   # Environment variables (create manually)
└── README.md              # This file
```

## Development Notes

- **Intentional Error**: Product #999 lacks a `price` field. This is **by design** to trigger CRITICAL errors in StackLens AI
- **Independent**: This app can run completely standalone without StackLens
- **Notification Failures**: If StackLens is unavailable, POS still works normally
- **Logging**: All operations logged to file for audit trail

## Testing Scenarios

### Scenario 1: Successful Order
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 1}]}'
```

**Result**: Order created successfully (200 OK)

### Scenario 2: Error Trigger
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'
```

**Result**: Order fails (400), error logged, StackLens notified (CRITICAL)

### Scenario 3: Bulk Orders
```bash
for i in {1..5}; do
  curl -X POST http://localhost:3001/orders \
    -H "Content-Type: application/json" \
    -d '{"items": [{"productId": '$((RANDOM % 5 + 1))', "quantity": 1}]}'
  sleep 1
done
```

**Result**: Mix of successful and failed orders

## Troubleshooting

**Port already in use**
```bash
lsof -i :3001
kill -9 <PID>
```

**Logs not appearing**
- Check `logs/` directory exists
- Verify `POS_LOG_FILE_PATH` environment variable
- Ensure write permissions

**StackLens not receiving events**
- Verify `STACKLENS_URL` is correct
- Check StackLens API endpoint is running
- Review browser console for CORS errors

## Next Steps

1. Start this POS application
2. In another terminal, start StackLens AI application
3. Create orders (especially with product #999) to trigger errors
4. Watch StackLens AI dashboard for real-time error detection
5. See Jira tickets auto-created for critical errors

---

**Created for**: StackLens AI - Real-time Error Detection & Automated Resolution
**Type**: Standalone Demo Application
