/**
 * Demo POS Express Server
 * Standalone POS application that generates intentional errors for StackLens AI demonstration
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import demoPOS from "./pos-service";

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
app.get("/products", (req: Request, res: Response) => {
    try {
        const products = demoPOS.getProducts();
        res.json({
            success: true,
            data: products,
            total: products.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Failed to get products",
        });
    }
});

// Create order (can trigger errors)
app.post("/orders", (req: Request, res: Response) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Invalid request. 'items' array is required.",
            });
        }

        const order = demoPOS.createOrder(items);

        res.status(order.status === "failed" ? 400 : 201).json({
            success: order.status === "completed",
            data: order,
            message:
                order.status === "completed"
                    ? "Order created successfully"
                    : `Order failed: ${order.error}`,
        });

        // Send log data to StackLens AI
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
╔════════════════════════════════════════════════════════════╗
║        Demo POS Application - StackLens AI Showcase         ║
╚════════════════════════════════════════════════════════════╝

📍 Server running at http://localhost:${PORT}
🔗 StackLens AI connected at: ${STACKLENS_URL}

📌 Available Endpoints:
   GET    /health              - Health check
   GET    /products            - List available products
   POST   /orders              - Create order (can trigger errors)
   GET    /orders              - Get all orders
   GET    /orders/:orderId     - Get specific order
   GET    /status              - Get POS status

⚠️  NOTE: Product #999 has NO PRICE - creates CRITICAL error!
    This is intentional for StackLens AI demonstration.

To trigger an error, create an order with product #999:
   curl -X POST http://localhost:${PORT}/orders \\
     -H "Content-Type: application/json" \\
     -d '{"items": [{"productId": 999, "quantity": 1}]}'

════════════════════════════════════════════════════════════
  `);
});

export default app;
