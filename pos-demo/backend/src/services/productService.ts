import { getDb } from './db';
import { AppError } from '../utils/AppError';

export interface Product {
    id: string;
    name: string;
    sku: string;
    price: number | null;
    stock: number;
}

export const listProducts = async (): Promise<Product[]> => {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM products');
    return stmt.all() as Product[];
};

export const getProduct = async (id: string): Promise<Product | undefined> => {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    return stmt.get(id) as Product | undefined;
};

export const seedProduct = async (product: Product): Promise<void> => {
    const db = await getDb();
    const stmt = db.prepare(
        'INSERT OR REPLACE INTO products (id, name, sku, price, stock) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(product.id, product.name, product.sku, product.price, product.stock);
};

export const updateStock = async (id: string, qty: number): Promise<void> => {
    const db = await getDb();
    const product = await getProduct(id);
    if (!product) throw new AppError('Product not found', 'PRODUCT_NOT_FOUND', 404);

    const newStock = product.stock - qty;
    if (newStock < 0) {
        throw new AppError('Insufficient stock', 'INVENTORY_UNAVAILABLE', 400, 'Restock product', { stock_level: product.stock });
    }

    const stmt = db.prepare('UPDATE products SET stock = ? WHERE id = ?');
    stmt.run(newStock, id);
};
