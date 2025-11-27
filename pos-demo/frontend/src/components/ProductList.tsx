import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

interface Product {
  id: string;
  name: string;
  price: number | null;
  stock: number;
}

interface Props {
  onSelect: (product: Product) => void;
}

export const ProductList: React.FC<Props> = ({ onSelect }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/products', {
        headers: { 'x-request-id': logger.getSessionId() }
      });
      setProducts(res.data);
    } catch (err) {
      logger.error('Failed to fetch products', { error: err });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const seedProduct = async (type: 'normal' | 'noprice' | 'lowstock') => {
    let product;
    if (type === 'normal') product = { id: 'p_normal', name: 'Normal Item', sku: 'N-1', price: 50, stock: 100 };
    if (type === 'noprice') product = { id: 'p_noprice', name: 'No Price Item', sku: 'NP-1', price: null, stock: 100 };
    if (type === 'lowstock') product = { id: 'p_lowstock', name: 'Low Stock Item', sku: 'LS-1', price: 50, stock: 1 };

    try {
      await axios.post('/api/products/seed', product, {
        headers: { 'x-request-id': logger.getSessionId() }
      });
      logger.info('Seeded product', { type });
      fetchProducts();
    } catch (err) {
      logger.error('Failed to seed product', { error: err });
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-bold mb-4">Products</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={() => seedProduct('normal')} className="px-2 py-1 bg-green-100 hover:bg-green-200 rounded text-sm">Seed Normal</button>
        <button onClick={() => seedProduct('noprice')} className="px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded text-sm">Seed No Price</button>
        <button onClick={() => seedProduct('lowstock')} className="px-2 py-1 bg-orange-100 hover:bg-orange-200 rounded text-sm">Seed Low Stock</button>
      </div>
      
      {loading ? <p>Loading...</p> : (
        <ul className="space-y-2">
          {products.map(p => (
            <li key={p.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(p)}>
              <span>{p.name}</span>
              <span className={p.stock < 5 ? 'text-red-500' : ''}>
                ${p.price ?? 'N/A'} (Stock: {p.stock})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
