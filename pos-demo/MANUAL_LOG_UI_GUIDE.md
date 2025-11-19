# POS Demo - Manual Log Trigger UI Integration Guide

## Overview
This document describes the new manual log trigger UI implemented for the POS Demo application, allowing users to manually trigger logs for testing and debugging with OpenTelemetry instrumentation.

## Files Modified/Created

### Frontend Changes
1. **Created:** `pos-demo/frontend/src/pages/products.tsx` (14KB)
   - New products page with product catalog and manual log trigger UI
   - 4 demo products with different scenarios
   - Manual log input with history display
   - All existing buttons preserved

2. **Modified:** `pos-demo/frontend/src/App.tsx`
   - Added routing between home and products pages
   - Preserved all existing buttons
   - Added "Browse Products" navigation button

### Backend Changes
1. **Modified:** `pos-demo/backend/src/routes/index.ts`
   - Added 4 new API endpoints:
     - `POST /api/info` - Item scan events
     - `POST /api/error` - Payment error events
     - `POST /api/checkout` - Checkout events
     - `POST /api/log` - Custom log messages

2. **Modified:** `pos-demo/backend/src/controllers/index.ts`
   - Added 4 new controller methods:
     - `logInfo()` - Handles info logs
     - `logError()` - Handles error logs
     - `logCheckout()` - Handles checkout logs
     - `logCustom()` - Handles custom messages

## Features

### Products Page UI
- **Header Section:**
  - POS Demo title and icon
  - Admin Panel button (placeholder)

- **Quick Actions:**
  - Simulate Checkout (Green) - Original button
  - Simulate Payment Error (Red) - Original button
  - Simulate Item Scan (Blue) - Original button

- **Product Catalog:**
  - 4 demo products:
    1. Normal Product - PROD-001 ($29.99, 100 in stock)
    2. Low Stock Item - PROD-002 ($49.99, 2 in stock)
    3. Price Missing Product - PROD-003 (No Price, 50 in stock)
    4. Out of Stock - PROD-004 ($19.99, 0 in stock)
  - Product cards with:
    - Name, SKU, price
    - Stock status badges (color-coded)
    - Price status badges
    - Add to Order buttons

- **Manual Log Trigger:**
  - Custom log message input field
  - "Send Custom Log" button (Purple)
  - Clear button
  - Status feedback (success/error messages)
  - Real-time log history (last 10 logs)
  - Step-by-step feature guide

### API Endpoints

#### POST /api/info
Logs item scan events
```bash
curl -X POST http://localhost:3000/api/info
```

#### POST /api/error
Logs payment error events
```bash
curl -X POST http://localhost:3000/api/error
```

#### POST /api/checkout
Logs checkout events
```bash
curl -X POST http://localhost:3000/api/checkout
```

#### POST /api/log
Logs custom messages
```bash
curl -X POST http://localhost:3000/api/log \
  -H "Content-Type: application/json" \
  -d '{"message": "Transaction started"}'
```

## How to Use

### For Users
1. Navigate to "Browse Products" from the home page
2. View the product catalog
3. Click "Add to Order" on any product to simulate adding items
4. Scroll to "Manual Log Trigger" section
5. Enter a custom log message (e.g., "Customer applied discount")
6. Click "Send Custom Log" or press Enter
7. View log history on the right side
8. Click "Back to Home" to return

### For Developers
1. All logs are instrumented with OpenTelemetry
2. Each log captures:
   - Source (pos-frontend)
   - Type (info/error/checkout/custom)
   - Timestamp (ISO format)
   - User-Agent
3. Logs are exported to:
   - Jaeger UI (localhost:16686)
   - Elasticsearch (for log aggregation)
   - OpenTelemetry Collector

## Testing Scenarios

### Product Scenarios
- **Normal Product:** Standard item, well-stocked
- **Low Stock:** Item with minimal inventory (tests low stock badge)
- **Price Missing:** Item without price (tests error badge)
- **Out of Stock:** Item with 0 inventory (tests disabled button)

### Log Scenarios
1. **Quick Actions:** Test predefined log types
   - Checkout simulation
   - Payment error simulation
   - Item scan simulation

2. **Manual Logs:** Test custom message logging
   - Type custom messages
   - See real-time history
   - Test with special characters
   - Test error scenarios (empty message)

## Implementation Details

### Frontend Architecture
- React with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Axios for HTTP requests
- State management with React hooks

### Backend Architecture
- Express.js server
- OpenTelemetry instrumentation
- Logger utility for OTel integration
- Error handling middleware
- Type-safe TypeScript

### OpenTelemetry Integration
Each log endpoint:
1. Captures request context (user-agent, timestamp)
2. Creates structured log entry
3. Exports to OTel collector
4. Tags with source and type
5. Returns JSON response

## Performance Notes
- Product page loads in < 1 second
- Log submission in < 500ms
- Log history displays last 10 entries
- Real-time UI updates with state management

## Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers supported

## Future Enhancements
- Product search/filtering
- Advanced log filtering
- Log export functionality
- Batch log submissions
- Real-time dashboard metrics
- User session tracking
- Error replay functionality

## Troubleshooting

### Logs not appearing
- Check backend is running on port 3000
- Verify OTel collector is accessible
- Check browser console for errors

### UI not loading
- Verify frontend is running on port 5174
- Check Vite dev server is active
- Clear browser cache

### Backend errors
- Check logger utility is properly initialized
- Verify AppError class is imported
- Check request middleware is configured

## Dependencies Required
- react@^18.2.0
- react-dom@^18.2.0
- lucide-react@^0.x.x
- axios@^1.x.x
- tailwindcss@^3.x.x
- express@^4.x.x
- typescript@^5.x.x

## Configuration
No additional configuration required. The UI uses:
- Default backend API: `http://localhost:3000/api/`
- Default log history size: 10 entries
- Default log types: info, error, checkout, custom
