import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

interface Alert {
  id: number;
  issue_code: string;
  severity: string;
  suggested_fix: string;
  log_summary: string;
  service: string;
  timestamp: string;
  status: string;
  jira_issue_key?: string;
}

export const AlertsDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');

    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'alert.created') {
        setAlerts((prev) => [message.data, ...prev]);
      }
    };

    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, []);

  const createJiraTicket = async (alertId: number) => {
    try {
      const res = await fetch(`http://localhost:3001/admin/alerts/${alertId}/create-jira`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.ticketKey) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, jira_issue_key: data.ticketKey, status: 'assigned' } : a));
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Real-time Alerts</h1>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${alert.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{alert.issue_code}</h3>
                  <p className="text-sm text-gray-500 mb-2">{alert.service} • {new Date(alert.timestamp).toLocaleTimeString()}</p>
                  <p className="text-gray-700 mb-3">{alert.log_summary}</p>
                  
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm font-medium text-blue-900">Suggested Fix:</p>
                    <p className="text-sm text-blue-800">{alert.suggested_fix}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {alert.jira_issue_key ? (
                  <a 
                    href={`https://your-domain.atlassian.net/browse/${alert.jira_issue_key}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink size={16} />
                    {alert.jira_issue_key}
                  </a>
                ) : (
                  <button
                    onClick={() => createJiraTicket(alert.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    Create Jira Ticket
                  </button>
                )}
                <span className="text-xs text-gray-400 uppercase tracking-wider">{alert.status}</span>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p>No active alerts. System is healthy.</p>
          </div>
        )}
      </div>
    </div>
  );
};
