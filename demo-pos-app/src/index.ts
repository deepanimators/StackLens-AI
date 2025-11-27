/**
 * Demo POS Express Server
 * Standalone POS application that generates intentional errors for StackLens AI demonstration
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import demoPOS from "./pos-service";
import { getRandomError, getErrorById, POS_ERROR_SCENARIOS, POSErrorScenario } from "./pos-errors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const STACKLENS_URL = process.env.STACKLENS_URL || "http://localhost:3000";

// 🔥 FIX #1: Use absolute path for log file
// Logs to: <project-root>/data/pos-application.log
// This ensures LogWatcher can find it from server root
const absoluteLogPath = path.resolve(process.cwd(), "..", "data", "pos-application.log");

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "demo-pos" });
});

// Get products
app.get("/products", async (req: Request, res: Response) => {
    try {
        const products = demoPOS.getProducts();

        // Send analytics event for product list request
        await sendAnalyticsEvent({
            type: 'info',
            message: `Product list requested`,
            action: 'product_list_viewed',
            details: { productCount: products.length }
        });

        res.json({
            success: true,
            data: products,
            total: products.length,
        });
    } catch (error) {
        await sendAnalyticsEvent({
            type: 'error',
            message: `Failed to get products: ${error instanceof Error ? error.message : 'Unknown error'}`,
            action: 'product_list_error',
            details: { error: error instanceof Error ? error.stack : String(error) }
        });

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get products",
        });
    }
});

// Create order (can trigger errors)
app.post("/orders", async (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            // Send error event for invalid request
            await sendAnalyticsEvent({
                type: 'error',
                message: 'Invalid order request: items array is required',
                action: 'order_creation_failed',
                details: { reason: 'missing_items', itemCount: 0 }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid request. 'items' array is required.",
            });
        }

        // Send info event for order attempt
        await sendAnalyticsEvent({
            type: 'info',
            message: `Order creation started with ${items.length} items`,
            action: 'order_creation_started',
            details: { itemCount: items.length, items: items.map(i => ({ productId: i.productId, qty: i.quantity })) }
        });

        const order = demoPOS.createOrder(items);

        // Send detailed analytics events based on order status
        if (order.status === "completed") {
            await sendAnalyticsEvent({
                type: 'checkout',
                message: `Order ${order.orderId} completed successfully`,
                action: 'checkout_success',
                details: {
                    orderId: order.orderId,
                    itemCount: order.items.length,
                    totalAmount: order.totalAmount,
                    storeNumber: order.storeNumber,
                    kioskNumber: order.kioskNumber
                }
            });
        } else {
            await sendAnalyticsEvent({
                type: 'error',
                message: `Order ${order.orderId} failed: ${order.error}`,
                action: 'checkout_failed',
                details: {
                    orderId: order.orderId,
                    error: order.error,
                    itemCount: order.items.length,
                    storeNumber: order.storeNumber,
                    kioskNumber: order.kioskNumber,
                    failedItems: order.items.filter(i => !i.price).map(i => i.name)
                }
            });
        }

        res.status(order.status === "failed" ? 400 : 201).json({
            success: order.status === "completed",
            data: order,
            message:
                order.status === "completed"
                    ? "Order created successfully"
                    : `Order failed: ${order.error}`,
        });

        // Send log data to StackLens AI (legacy)
        if (order.status === "failed") {
            sendToStackLens({
                type: "error_detected",
                orderId: order.orderId,
                storeNumber: order.storeNumber,
                kioskNumber: order.kioskNumber,
                error: order.error,
                timestamp: order.timestamp,
            }).catch((err) => console.error("Failed to notify StackLens:", err));
        }
    } catch (error) {
        await sendAnalyticsEvent({
            type: 'error',
            message: `Critical error in order processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
            action: 'order_processing_exception',
            details: { error: error instanceof Error ? error.stack : String(error) }
        });

        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to create order",
        });
    }
});

// Get all orders
app.get("/orders", (req: Request, res: Response) => {
    try {
        const orders = demoPOS.getOrders();
        res.json({
            success: true,
            data: orders,
            total: orders.length,
            failed: orders.filter((o) => o.status === "failed").length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get orders",
        });
    }
});

// Get specific order
app.get("/orders/:orderId", (req: Request, res: Response) => {
    try {
        const order = demoPOS.getOrderById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: "Order not found",
            });
        }

        res.json({ success: true, data: order });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get order",
        });
    }
});

// Get status
app.get("/status", (req: Request, res: Response) => {
    try {
        const status = demoPOS.getStatus();
        res.json({
            success: true,
            data: status,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get status",
        });
    }
});

// 🎯 NEW: Get all error scenarios
app.get("/scenarios", (req: Request, res: Response) => {
    res.json({
        success: true,
        data: POS_ERROR_SCENARIOS,
        total: POS_ERROR_SCENARIOS.length,
        categories: [...new Set(POS_ERROR_SCENARIOS.map(s => s.category))],
        severities: [...new Set(POS_ERROR_SCENARIOS.map(s => s.severity))]
    });
});

// 🎯 NEW: Trigger a specific error scenario
app.post("/simulate-error/:errorId", async (req: Request, res: Response) => {
    try {
        const { errorId } = req.params;
        const scenario = getErrorById(errorId);

        if (!scenario) {
            return res.status(404).json({
                success: false,
                error: `Error scenario ${errorId} not found`
            });
        }

        // Generate realistic error event
        await sendAnalyticsEvent({
            type: 'error',
            message: scenario.message,
            action: `error_${scenario.category}_${errorId.toLowerCase()}`,
            details: {
                errorCode: scenario.errorCode,
                errorId: scenario.id,
                category: scenario.category,
                severity: scenario.severity,
                symptoms: scenario.symptoms,
                causes: scenario.causes,
                businessImpact: scenario.businessImpact,
                immediateActions: scenario.immediateActions,
                affectedComponents: scenario.affectedComponents,
                stackTrace: generateStackTrace(scenario)
            }
        });

        res.json({
            success: true,
            message: `Simulated error: ${scenario.name}`,
            scenario: scenario
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to simulate error"
        });
    }
});

// 🎯 NEW: Trigger a random error
app.post("/simulate-random-error", async (req: Request, res: Response) => {
    try {
        const scenario = getRandomError();

        // Generate realistic error event
        await sendAnalyticsEvent({
            type: 'error',
            message: scenario.message,
            action: `error_${scenario.category}_${scenario.id.toLowerCase()}`,
            details: {
                errorCode: scenario.errorCode,
                errorId: scenario.id,
                category: scenario.category,
                severity: scenario.severity,
                symptoms: scenario.symptoms,
                causes: scenario.causes,
                businessImpact: scenario.businessImpact,
                immediateActions: scenario.immediateActions,
                affectedComponents: scenario.affectedComponents,
                stackTrace: generateStackTrace(scenario)
            }
        });

        res.json({
            success: true,
            message: `Simulated random error: ${scenario.name}`,
            scenario: scenario
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to simulate error"
        });
    }
});

// 🎯 NEW: Trigger multiple errors (stress test)
app.post("/simulate-errors/batch", async (req: Request, res: Response) => {
    try {
        const { count = 5, category, severity } = req.body;

        let scenarios = POS_ERROR_SCENARIOS;
        if (category) {
            scenarios = scenarios.filter(s => s.category === category);
        }
        if (severity) {
            scenarios = scenarios.filter(s => s.severity === severity);
        }

        const results = [];
        const errorCount = Math.min(count, scenarios.length);

        for (let i = 0; i < errorCount; i++) {
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

            await sendAnalyticsEvent({
                type: 'error',
                message: scenario.message,
                action: `batch_error_${scenario.category}_${scenario.id.toLowerCase()}`,
                details: {
                    errorCode: scenario.errorCode,
                    errorId: scenario.id,
                    category: scenario.category,
                    severity: scenario.severity,
                    batchNumber: i + 1,
                    batchTotal: errorCount,
                    stackTrace: generateStackTrace(scenario)
                }
            });

            results.push({
                index: i + 1,
                scenario: scenario.name,
                errorCode: scenario.errorCode,
                severity: scenario.severity
            });

            // Small delay between errors to make them realistic
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        res.json({
            success: true,
            message: `Simulated ${errorCount} errors`,
            results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to simulate batch errors"
        });
    }
});

// Helper function to send events to StackLens Analytics
async function sendAnalyticsEvent(eventData: {
    type: 'info' | 'error' | 'checkout' | 'log';
    message: string;
    action?: string;
    details?: any;
}): Promise<void> {
    try {
        const response = await fetch(`${STACKLENS_URL}/api/analytics/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...eventData,
                timestamp: new Date().toISOString(),
                source: 'demo-pos-app'
            }),
        });

        if (!response.ok) {
            console.warn(`Analytics event failed with status ${response.status}`);
        }
    } catch (error) {
        console.error("Failed to send analytics event:", error);
        // Don't throw - POS should work independently
    }
}

// Helper function to generate realistic stack traces
function generateStackTrace(scenario: POSErrorScenario): string {
    const stacks = {
        payment: `Error: ${scenario.message}
    at PaymentProcessor.process (payment-gateway.ts:234)
    at PaymentController.handleTransaction (payment-controller.ts:156)
    at processPayment (pos-terminal.ts:89)
    at checkout (transaction-manager.ts:412)`,
        inventory: `Error: ${scenario.message}
    at InventoryManager.updateStock (inventory-service.ts:178)
    at ProductService.checkAvailability (product-service.ts:234)
    at OrderProcessor.validateItems (order-processor.ts:89)
    at createOrder (pos-api.ts:156)`,
        network: `Error: ${scenario.message}
    at NetworkClient.connect (network-client.ts:245)
    at DatabasePool.getConnection (db-pool.ts:134)
    at executeQuery (database-service.ts:67)
    at fetchData (data-layer.ts:89)`,
        hardware: `Error: ${scenario.message}
    at HardwareDriver.initialize (hardware-driver.ts:123)
    at DeviceManager.connect (device-manager.ts:234)
    at Terminal.setupPeripherals (terminal-init.ts:67)
    at startPOS (main.ts:45)`,
        database: `Error: ${scenario.message}
    at Transaction.commit (transaction.ts:289)
    at DatabaseService.executeSql (db-service.ts:156)
    at Repository.save (repository.ts:234)
    at persistData (data-access.ts:78)`,
        integration: `Error: ${scenario.message}
    at APIClient.request (api-client.ts:178)
    at IntegrationService.call (integration-service.ts:234)
    at ExternalService.sync (external-service.ts:156)
    at syncData (sync-manager.ts:89)`,
        security: `Error: ${scenario.message}
    at AuthService.authenticate (auth-service.ts:145)
    at SecurityManager.validateAccess (security-manager.ts:234)
    at authorize (middleware.ts:67)
    at handleRequest (router.ts:89)`,
        performance: `Error: ${scenario.message}
    at ResourceMonitor.check (resource-monitor.ts:178)
    at SystemManager.monitorHealth (system-manager.ts:234)
    at healthCheck (health-service.ts:89)
    at setInterval (node:timers:1234)`,
        data: `Error: ${scenario.message}
    at SyncEngine.synchronize (sync-engine.ts:267)
    at DataManager.reconcile (data-manager.ts:189)
    at resolveConflicts (conflict-resolver.ts:134)
    at syncData (sync-service.ts:78)`,
        system: `Error: ${scenario.message}
    at ConfigManager.load (config-manager.ts:156)
    at SystemInit.initialize (system-init.ts:234)
    at startup (bootstrap.ts:67)
    at main (index.ts:23)`
    };

    return stacks[scenario.category] || `Error: ${scenario.message}
    at UnknownModule.process (unknown.ts:123)
    at MainController.handle (controller.ts:234)
    at execute (main.ts:67)`;
}

// Helper function to send events to StackLens
async function sendToStackLens(data: unknown): Promise<void> {
    try {
        const response = await fetch(`${STACKLENS_URL}/api/demo-events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            console.warn(`StackLens notification returned status ${response.status}`);
        }
    } catch (error) {
        console.error("Failed to send data to StackLens:", error);
        // Don't throw - POS should work independently
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Demo POS Application - StackLens AI Showcase              ║
║     🎯 With 50+ Realistic Error Scenarios                     ║
╚══════════════════════════════════════════════════════════════╝

📍 Server running at http://localhost:${PORT}
🔗 StackLens AI connected at: ${STACKLENS_URL}
📊 Error Scenarios Loaded: ${POS_ERROR_SCENARIOS.length}

📌 Core Endpoints:
   GET    /health                    - Health check
   GET    /products                  - List available products
   POST   /orders                    - Create order (can trigger errors)
   GET    /orders                    - Get all orders
   GET    /status                    - Get POS status

🎯 Error Simulation Endpoints (NEW):
   GET    /scenarios                 - List all ${POS_ERROR_SCENARIOS.length} error scenarios
   POST   /simulate-error/:errorId   - Trigger specific error (e.g., PAY_001)
   POST   /simulate-random-error     - Trigger random weighted error
   POST   /simulate-errors/batch     - Trigger multiple errors
                                       Body: { count: 5, category?: "payment", severity?: "critical" }

💡 Quick Test Examples:

   # List all error scenarios
   curl http://localhost:${PORT}/scenarios

   # Simulate payment gateway timeout
   curl -X POST http://localhost:${PORT}/simulate-error/PAY_001

   # Simulate random error
   curl -X POST http://localhost:${PORT}/simulate-random-error

   # Simulate 10 critical errors
   curl -X POST http://localhost:${PORT}/simulate-errors/batch \\
     -H "Content-Type: application/json" \\
     -d '{"count": 10, "severity": "critical"}'

   # Simulate 5 payment errors
   curl -X POST http://localhost:${PORT}/simulate-errors/batch \\
     -H "Content-Type: application/json" \\
     -d '{"count": 5, "category": "payment"}'

⚠️  Legacy Error: Product #999 still has NO PRICE for backward compatibility

📦 Error Categories Available:
   • Payment Processing (${POS_ERROR_SCENARIOS.filter(s => s.category === 'payment').length} scenarios)
   • Inventory Management (${POS_ERROR_SCENARIOS.filter(s => s.category === 'inventory').length} scenarios)
   • Network & Connectivity (${POS_ERROR_SCENARIOS.filter(s => s.category === 'network').length} scenarios)
   • Hardware Failures (${POS_ERROR_SCENARIOS.filter(s => s.category === 'hardware').length} scenarios)
   • Database Issues (${POS_ERROR_SCENARIOS.filter(s => s.category === 'database').length} scenarios)
   • Integration Errors (${POS_ERROR_SCENARIOS.filter(s => s.category === 'integration').length} scenarios)
   • Security & Auth (${POS_ERROR_SCENARIOS.filter(s => s.category === 'security').length} scenarios)
   • Performance (${POS_ERROR_SCENARIOS.filter(s => s.category === 'performance').length} scenarios)
   • Data Sync (${POS_ERROR_SCENARIOS.filter(s => s.category === 'data').length} scenarios)
   • System Config (${POS_ERROR_SCENARIOS.filter(s => s.category === 'system').length} scenarios)

══════════════════════════════════════════════════════════════
  `);
});

export default app;
