/**
 * Database seed data for POS Demo Service
 * Contains products, including one with null price to trigger PRICE_MISSING alert
 */

import { Product } from '../types';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod_laptop',
    name: 'Gaming Laptop',
    sku: 'LAP-001',
    price: 999.99,
  },
  {
    id: 'prod_mouse_defect',
    name: 'Wireless Mouse',
    sku: 'MOU-001',
    price: null,  // ⚠️ Intentionally null - triggers PRICE_MISSING alert
  },
  {
    id: 'prod_keyboard',
    name: 'Mechanical Keyboard',
    sku: 'KEY-001',
    price: 149.99,
  },
  {
    id: 'prod_monitor',
    name: '4K Monitor',
    sku: 'MON-001',
    price: 399.99,
  },
  {
    id: 'prod_headphones',
    name: 'Wireless Headphones',
    sku: 'HEAD-001',
    price: 199.99,
  },
];

/**
 * Find product by ID
 */
export const getProductById = (productId: string): Product | undefined => {
  return SEED_PRODUCTS.find((p) => p.id === productId);
};

/**
 * Get all products
 */
export const getAllProducts = (): Product[] => {
  return SEED_PRODUCTS;
};
