import React, { useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProductList } from './components/ProductList';
import { CheckoutForm } from './components/CheckoutForm';
import { logger } from './utils/logger';
import { initTelemetry } from './utils/telemetry';

// Initialize telemetry
initTelemetry();

function App() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [view, setView] = useState<'pos' | 'admin'>('pos');

  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    logger.info('Product selected', { product_id: product.id, name: product.name });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-100 p-8">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">POS Demo</h1>
          <div className="space-x-4">
            <button onClick={() => setView('pos')} className={`px-4 py-2 rounded ${view === 'pos' ? 'bg-blue-600 text-white' : 'bg-white'}`}>POS</button>
            <button onClick={() => setView('admin')} className={`px-4 py-2 rounded ${view === 'admin' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Admin</button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto">
          {view === 'pos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProductList onSelect={handleProductSelect} />
              <div>
                {selectedProduct ? (
                  <CheckoutForm product={selectedProduct} onCancel={() => setSelectedProduct(null)} />
                ) : (
                  <div className="p-4 bg-white rounded shadow-sm text-gray-500 text-center">
                    Select a product to checkout
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="bg-white p-6 rounded shadow-sm">
              <h2 className="text-xl font-bold mb-4">Admin Dashboard</h2>
              <p className="text-gray-600">Admin features (Jira integration, Alerts) would go here.</p>
              <div className="mt-4 p-4 border rounded bg-gray-50">
                <h3 className="font-bold">Simulate Jira Ticket</h3>
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/admin/create-jira', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ alert: 'Test Alert' })
                      });
                      const data = await res.json();
                      alert(`Jira Ticket Created: ${data.key}`);
                    } catch (e) {
                      alert('Failed to create ticket');
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Create Test Ticket
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
