import React, { useState } from 'react';
import { Home } from 'lucide-react';
import ProductsPage from './pages/products';

type Page = 'home' | 'products';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  if (currentPage === 'products') {
    return (
      <div>
        <ProductsPage />
        <div className="fixed bottom-4 left-4">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg"
          >
            <Home size={18} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <HomePage onNavigateToProducts={() => setCurrentPage('products')} />
  );
}

interface HomePageProps {
  onNavigateToProducts: () => void;
}

function HomePage({ onNavigateToProducts }: HomePageProps) {
  const [status, setStatus] = useState<string>('');
  const { ShoppingCart, AlertTriangle, CheckCircle } = require('lucide-react');
  const axios = require('axios');

  const sendLog = async (type: 'info' | 'error' | 'checkout') => {
    try {
      setStatus(`Sending ${type}...`);
      // Use the POS Backend API which logs to OTel
      await axios.post(`http://localhost:3000/api/${type}`, {});
      setStatus(`${type} sent successfully!`);
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to send ${type}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <ShoppingCart size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">POS Demo</h1>
        </div>

        <p className="text-gray-600 text-sm mb-6">
          Production-ready Point of Sale System with OpenTelemetry Integration
        </p>

        <div className="space-y-4">
          <button
            onClick={() => sendLog('checkout')}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <CheckCircle size={20} />
            Simulate Checkout
          </button>

          <button
            onClick={() => sendLog('error')}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <AlertTriangle size={20} />
            Simulate Payment Error
          </button>

          <button
            onClick={() => sendLog('info')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <ShoppingCart size={20} />
            Simulate Item Scan
          </button>

          <button
            onClick={onNavigateToProducts}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            <ShoppingCart size={20} />
            Browse Products
          </button>
        </div>

        {status && (
          <div className="mt-6 text-center text-sm text-gray-600 animate-pulse">
            {status}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 text-center">
          StackLens POS Integration Demo
        </div>
      </div>
    </div>
  );
}

export default App;
