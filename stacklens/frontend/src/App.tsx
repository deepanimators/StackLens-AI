import React from 'react';
import { AlertsDashboard } from './components/AlertsDashboard';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <span className="text-xl font-bold text-gray-900">StackLens</span>
        </div>
      </nav>
      <main>
        <AlertsDashboard />
      </main>
    </div>
  );
}

export default App;
