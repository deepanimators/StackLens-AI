import React, { useState } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

interface Product {
  id: string;
  name: string;
  price: number | null;
}

interface Props {
  product: Product | null;
  onCancel: () => void;
}

export const CheckoutForm: React.FC<Props> = ({ product, onCancel }) => {
  const [qty, setQty] = useState(1);
  const [userId, setUserId] = useState('user_123');
  const [status, setStatus] = useState<string | null>(null);

  if (!product) return null;

  const handleOrder = async () => {
    setStatus('Processing...');
    try {
      await axios.post('/api/order', {
        productId: product.id,
        qty,
        userId
      }, {
        headers: { 'x-request-id': logger.getSessionId() }
      });
      setStatus('Order Confirmed!');
      logger.info('Order placed', { product_id: product.id, qty });
    } catch (err: any) {
      const errorData = err.response?.data || {};
      setStatus(`Error: ${errorData.error || err.message}`);
      logger.error('Order failed', { 
        error_code: errorData.error,
        message: errorData.message,
        product_id: product.id 
      });
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-white mt-4">
      <h2 className="text-xl font-bold mb-4">Checkout: {product.name}</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Quantity</label>
          <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="border p-1 rounded w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">User ID (Scenario Trigger)</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} className="border p-1 rounded w-full">
            <option value="user_123">Normal User</option>
            <option value="user_payment_fail">Payment Fail</option>
            <option value="user_db_fail">DB Fail</option>
            <option value="user_timeout">Timeout</option>
            <option value="user_authz_fail">Authz Fail</option>
            <option value="user_crash">Crash Backend</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button onClick={handleOrder} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Place Order</button>
          <button onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
        </div>

        {status && (
          <div className={`p-2 rounded ${status.startsWith('Error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
};
