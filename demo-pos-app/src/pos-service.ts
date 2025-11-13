/**
 * Demo POS Service
 * Simulates a Point of Sale system with intentional errors for StackLens AI demonstration
 */

import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export interface Product {
    id: number;
    name: string;
    category: string;
    price?: number; // Optional: Product #999 intentionally has no price
    quantity: number;
}

export interface Order {
    orderId: string;
    timestamp: string;
    storeNumber: string;
    kioskNumber: string;
    items: Array<{
        productId: number;
        quantity: number;
        name: string;
        price?: number;
    }>;
    status: "pending" | "completed" | "failed";
    error?: string;
    totalAmount?: number;
}

export class DemoPOSService extends EventEmitter {
    private products: Product[] = [];
    private orders: Order[] = [];
    private logFilePath: string;
    private storeNumber: string = process.env.STORE_NUMBER || "STORE_001";
    private kioskNumber: string = process.env.KIOSK_NUMBER || "KIOSK_001";

    constructor(logFilePath: string = "data/pos-application.log") {
        super();
        this.logFilePath = logFilePath;
        this.initializeProducts();
        this.createLogFile();
    }

    private initializeProducts(): void {
        this.products = [
            { id: 1, name: "Laptop", category: "Electronics", price: 999.99, quantity: 10 },
            { id: 2, name: "Mouse", category: "Accessories", price: 29.99, quantity: 50 },
            { id: 3, name: "Keyboard", category: "Accessories", price: 79.99, quantity: 30 },
            { id: 4, name: "Monitor", category: "Electronics", price: 299.99, quantity: 20 },
            { id: 5, name: "USB Cable", category: "Accessories", price: 9.99, quantity: 100 },
            { id: 999, name: "Mystery Product", category: "Special", quantity: 5 }, // No price - intentional error!
        ];
    }

    private createLogFile(): void {
        const logDir = path.dirname(this.logFilePath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        if (!fs.existsSync(this.logFilePath)) {
            const header = `=== POS Application Log Started at ${new Date().toISOString()} ===\n`;
            fs.writeFileSync(this.logFilePath, header);
        }
    }

    private logEvent(level: string, message: string, details?: unknown): void {
        const timestamp = new Date().toISOString();
        let logLine = `[${timestamp}] [${level}] ${message}`;

        if (details) {
            logLine += ` | ${JSON.stringify(details)}`;
        }

        logLine += "\n";

        try {
            fs.appendFileSync(this.logFilePath, logLine);
            this.emit("log", { timestamp, level, message, details });
        } catch (error) {
            console.error("Failed to write log:", error);
        }
    }

    getProducts(): Product[] {
        return this.products;
    }

    createOrder(items: Array<{ productId: number; quantity: number }>): Order {
        const orderId = uuidv4();
        const timestamp = new Date().toISOString();

        // Process items and check for errors
        const orderItems: Order["items"] = [];
        let hasError = false;
        let errorMessage = "";

        for (const item of items) {
            const product = this.products.find((p) => p.id === item.productId);

            if (!product) {
                hasError = true;
                errorMessage = `Product #${item.productId} not found`;
                this.logEvent("ERROR", "Product not found", {
                    orderId,
                    productId: item.productId,
                });
                break;
            }

            // CRITICAL ERROR: Product #999 has no price!
            if (!product.price) {
                hasError = true;
                errorMessage = `Product #${product.id} (${product.name}) has no pricing information`;
                this.logEvent("CRITICAL", "Pricing error in order", {
                    orderId,
                    storeNumber: this.storeNumber,
                    kioskNumber: this.kioskNumber,
                    productId: product.id,
                    productName: product.name,
                    errorType: "MISSING_PRICE",
                    confidence: 0.99,
                });
                break;
            }

            orderItems.push({
                productId: product.id,
                quantity: item.quantity,
                name: product.name,
                price: product.price,
            });
        }

        const order: Order = {
            orderId,
            timestamp,
            storeNumber: this.storeNumber,
            kioskNumber: this.kioskNumber,
            items: orderItems,
            status: hasError ? "failed" : "completed",
            error: hasError ? errorMessage : undefined,
            totalAmount: hasError
                ? undefined
                : orderItems.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0),
        };

        this.orders.push(order);

        if (hasError) {
            this.logEvent("ERROR", `Order ${orderId} failed`, {
                orderId,
                error: errorMessage,
                items,
            });
        } else {
            this.logEvent("INFO", `Order ${orderId} completed successfully`, {
                orderId,
                totalAmount: order.totalAmount,
                itemCount: orderItems.length,
            });
        }

        this.emit("order", order);
        return order;
    }

    getOrders(): Order[] {
        return this.orders;
    }

    getOrderById(orderId: string): Order | undefined {
        return this.orders.find((o) => o.orderId === orderId);
    }

    getStatus(): {
        isRunning: boolean;
        logFile: string;
        storeNumber: string;
        kioskNumber: string;
        totalOrders: number;
        failedOrders: number;
    } {
        const failedOrders = this.orders.filter((o) => o.status === "failed").length;
        return {
            isRunning: true,
            logFile: this.logFilePath,
            storeNumber: this.storeNumber,
            kioskNumber: this.kioskNumber,
            totalOrders: this.orders.length,
            failedOrders,
        };
    }
}

// Export singleton instance
const demoPOS = new DemoPOSService(
    process.env.POS_LOG_FILE_PATH || "logs/pos-application.log"
);

export default demoPOS;
