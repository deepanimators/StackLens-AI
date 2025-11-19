import React, { useState } from 'react';
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import axios from 'axios';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number | null;
  stock: number;
  scenario?: string;
}

function ProductsPage() {
  const [status, setStatus] = useState<string>('');
  const [logStatus, setLogStatus] = useState<string>('');
  const [manualLogInput, setManualLogInput] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  const products: Product[] = [
    {
      id: 'PROD-001',
      name: 'Normal Product',
      sku: 'PROD-001',
      price: 29.99,
      stock: 100,
      scenario: 'Normal',
    },
    {
      id: 'PROD-002',
      name: 'Low Stock Item',
      sku: 'PROD-002',
      price: 49.99,
      stock: 2,
      scenario: 'Low Stock',
    },
    {
      id: 'PROD-003',
      name: 'Price Missing Product',
      sku: 'PROD-003',
      price: null,
      stock: 50,
      scenario: 'Price Missing',
    },
    {
      id: 'PROD-004',
      name: 'Out of Stock',
      sku: 'PROD-004',
      price: 19.99,
      stock: 0,
      scenario: 'Out of Stock',
    },
  ];

  const sendLog = async (type: 'info' | 'error' | 'checkout') => {
    try {
      setStatus(`Sending ${type}...`);
      await axios.post(`http://localhost:3000/api/${type}`, {});
      setStatus(`${type} sent successfully!`);
      addLog(`✓ ${type} event logged`);
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setStatus(`Failed to send ${type}`);
      addLog(`✗ Failed to log ${type} event`);
    }
  };

  const sendManualLog = async () => {
    if (!manualLogInput.trim()) {
      setLogStatus('Please enter a log message');
      return;
    }

    try {
      setLogStatus('Sending custom log...');
      await axios.post('http://localhost:3000/api/log', {
        message: manualLogInput,
        timestamp: new Date().toISOString(),
        source: 'manual-trigger',
      });
      setLogStatus('Custom log sent successfully!');
      addLog(`✓ Custom: ${manualLogInput}`);
      setManualLogInput('');
      setTimeout(() => setLogStatus(''), 2000);
    } catch (err) {
      console.error(err);
      setLogStatus('Failed to send custom log');
      addLog(`✗ Custom log failed: ${manualLogInput}`);
    }
  };

  const addLog = (log: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${log}`, ...prev].slice(0, 10));
  };

  const addToOrder = (product: Product) => {
    sendLog('info');
    addLog(
      `+ Added "${product.name}" (${product.sku}) to order - $${product.price || 'N/A'}`
    );
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">0 in stock</span>;
    if (stock < 5) return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">{stock} in stock</span>;
    return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{stock} in stock</span>;
  };

  const getPriceBadge = (price: number | null) => {
    if (price === null) return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">No Price</span>;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <ShoppingCart size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">POS Demo</h1>
                <p className="text-gray-500 text-sm">Production-ready Point of Sale System</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
              Admin Panel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Existing Action Buttons */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => sendLog('checkout')}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              <CheckCircle size={20} />
              Simulate Checkout
            </button>

            <button
              onClick={() => sendLog('error')}
              className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              <AlertTriangle size={20} />
              Simulate Payment Error
            </button>

            <button
              onClick={() => sendLog('info')}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              <ShoppingCart size={20} />
              Simulate Item Scan
            </button>
          </div>
          {status && (
            <div className="mt-4 text-center text-sm text-gray-600 animate-pulse">
              {status}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Products</h2>
          <p className="text-gray-600 text-sm mb-6">
            Select a product to place an order. Try products with different scenarios!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {product.name}
                    </h3>
                    <p className="text-gray-500 text-sm">SKU: {product.sku}</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer">
                    <ShoppingCart size={18} />
                  </div>
                </div>

                <div className="mb-4 space-y-2">
                  {product.price !== null ? (
                    <p className="text-3xl font-bold text-gray-900">${product.price}</p>
                  ) : (
                    <p className="text-3xl font-bold text-gray-900">-</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {getStockBadge(product.stock)}
                    {getPriceBadge(product.price)}
                  </div>
                </div>

                <button
                  onClick={() => addToOrder(product)}
                  disabled={product.stock === 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  <ShoppingCart size={18} />
                  Add to Order
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Log Trigger Cards - Similar to Products */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Manual Log Triggers</h2>
          <p className="text-gray-600 text-sm mb-6">
            Manually trigger logs to test specific scenarios and monitoring capabilities!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Checkout Trigger Card */}
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Checkout Event</h3>
                  <p className="text-gray-500 text-sm">Type: SUCCESS</p>
                </div>
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Simulate a successful checkout transaction
              </p>
              <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold mb-4">
                Success Event
              </span>
              <button
                onClick={() => {
                  sendLog('checkout');
                }}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                <CheckCircle size={18} />
                Trigger Checkout
              </button>
            </div>

            {/* Error Trigger Card */}
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Payment Error</h3>
                  <p className="text-gray-500 text-sm">Type: ERROR</p>
                </div>
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Simulate a payment processing failure
              </p>
              <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold mb-4">
                Error Event
              </span>
              <button
                onClick={() => {
                  sendLog('error');
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                <AlertTriangle size={18} />
                Trigger Error
              </button>
            </div>

            {/* Item Scan Trigger Card */}
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Item Scan</h3>
                  <p className="text-gray-500 text-sm">Type: INFO</p>
                </div>
                <ShoppingCart className="text-blue-600" size={24} />
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Simulate scanning an item during transaction
              </p>
              <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold mb-4">
                Info Event
              </span>
              <button
                onClick={() => {
                  sendLog('info');
                }}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                <ShoppingCart size={18} />
                Trigger Item Scan
              </button>
            </div>

            {/* Custom Log Trigger Card */}
            <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">Custom Log</h3>
                  <p className="text-gray-500 text-sm">Type: CUSTOM</p>
                </div>
                <MessageSquare className="text-purple-600" size={24} />
              </div>
              <p className="text-gray-600 text-sm mb-4">
                Send a custom message to the system
              </p>
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold mb-4">
                Custom Event
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualLogInput}
                  onChange={(e) => setManualLogInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') sendManualLog();
                  }}
                  placeholder="Message..."
                  className="flex-1 px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
                <button
                  onClick={sendManualLog}
                  className="flex items-center justify-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 rounded-lg font-medium transition-colors text-sm"
                >
                  <MessageSquare size={16} />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Log Trigger Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <div className="bg-purple-100 p-2 rounded-lg">
              <MessageSquare size={24} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manual Log Trigger</h2>
              <p className="text-gray-600 text-sm">Trigger custom logs for testing and debugging</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Input Section */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Log Message
                </label>
                <input
                  type="text"
                  value={manualLogInput}
                  onChange={(e) => setManualLogInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') sendManualLog();
                  }}
                  placeholder="Enter a custom log message (e.g., 'Transaction started', 'Customer discount applied')"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter or click the button to send the log
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={sendManualLog}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  <MessageSquare size={18} />
                  Send Custom Log
                </button>
                <button
                  onClick={() => {
                    setManualLogInput('');
                    setLogs([]);
                  }}
                  className="flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw size={18} />
                  Clear
                </button>
              </div>

              {logStatus && (
                <div
                  className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    logStatus.includes('success')
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {logStatus.includes('success') ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  {logStatus}
                </div>
              )}
            </div>

            {/* Log History */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-900">Log History</h3>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No logs yet</p>
                ) : (
                  logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-100 font-mono"
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Feature Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  <span className="text-sm font-semibold">1</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Enter Message</p>
                <p className="text-xs text-gray-500">Type your custom log message</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  <span className="text-sm font-semibold">2</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Send Log</p>
                <p className="text-xs text-gray-500">Click button or press Enter</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-500 text-white">
                  <span className="text-sm font-semibold">3</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View History</p>
                <p className="text-xs text-gray-500">See recent logs on the right</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          StackLens POS Integration Demo • OpenTelemetry Instrumented
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
