/**
 * Type definitions for POS Demo Service
 */

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | null;  // Can be null to trigger PRICE_MISSING alert
}

export interface LogEntry {
  request_id: string;
  service: string;
  env: string;
  timestamp: string;
  user_id?: string;
  product_id?: string;
  action: string;
  level: string;
  message: string;
  price?: number | null;
  error_code?: string;
  stack?: string;
  app_version?: string;
}

export interface OrderRequest {
  product_id: string;
  user_id?: string;
  quantity?: number;
}

export interface OrderResponse {
  order_id: string;
  product_id: string;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
}

export interface ErrorResponse {
  error: string;
  error_code?: string;
  request_id?: string;
  timestamp: string;
}
