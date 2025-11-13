# Demo POS Application - Setup Guide

## Quick Setup (2 minutes)

```bash
# 1. Navigate to demo-pos-app folder
cd demo-pos-app

# 2. Install dependencies
npm install

# 3. Create logs directory
mkdir -p logs

# 4. Start the server
npm run dev

# Server runs on http://localhost:3001
```

## Testing the Application

### Test 1: Health Check
```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","service":"demo-pos"}`

### Test 2: Get Products
```bash
curl http://localhost:3001/products
```

You should see 6 products, including:
- Product #1: Laptop ($999.99)
- Product #999: Mystery Product (NO PRICE - intentional!)

### Test 3: Create Successful Order
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 1}]}'
```

Expected: 201 Created with order details

### Test 4: Create Failed Order (Trigger Error)
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 999, "quantity": 1}]}'
```

Expected: 400 Bad Request with error message about missing price

### Test 5: View Logs
```bash
tail -f logs/pos-application.log
```

You'll see entries like:
```
[2024-11-13T...] [CRITICAL] Pricing error in order | {"orderId":"...","productId":999,"errorType":"MISSING_PRICE","confidence":0.99}
```

## Integration with StackLens AI

When an error occurs in the POS app:
1. Error is logged to `logs/pos-application.log`
2. Error is sent to StackLens AI via `POST /api/demo-events`
3. StackLens AI analyzes the error
4. Error appears on real-time dashboard
5. Jira ticket is automatically created

---

**Status**: ✅ Ready to use  
**Run independently or integrate with StackLens AI**
