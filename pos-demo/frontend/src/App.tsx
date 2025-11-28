import { useState } from 'react';
import { Home, ShoppingCart, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';
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

        {/* Manual Log Trigger Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Manual Log Trigger</h3>
          <div className="space-y-3">
            <select 
              id="log-level"
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              defaultValue="info"
            >
              <option value="info">INFO</option>
              <option value="warn">WARN</option>
              <option value="error">ERROR</option>
            </select>
            <input 
              id="log-message"
              type="text" 
              placeholder="Enter custom log message..." 
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            />
            <button
              onClick={() => {
                const message = (document.getElementById('log-message') as HTMLInputElement).value;
                if (message) {
                  // Custom log logic - reusing sendLog but with custom message if possible, 
                  // or just mapping to existing types for now as the backend API is simple.
                  // The backend API is /api/:type. 
                  // If we want custom messages, we might need to update backend or just use 'info'/'error' endpoints.
                  // For now, we'll use the selected level as the endpoint type.
                  // Use /api/log for custom messages as it accepts a message body
                  axios.post(`http://localhost:3000/api/log`, { message, source: 'pos-manual' })
                    .then(() => {
                      setStatus(`Custom log sent!`);
                      setTimeout(() => setStatus(''), 2000);
                      (document.getElementById('log-message') as HTMLInputElement).value = '';
                    })
                    .catch((err: any) => {
                      console.error(err);
                      setStatus(`Failed to send custom log`);
                    });
                }
              }}
              className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Send Custom Log
            </button>
          </div>
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
