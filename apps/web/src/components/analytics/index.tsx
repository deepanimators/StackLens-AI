import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardProvider from './dashboard-context';
import AnalyticsOverview from './analytics-overview';
import DashboardManager from './dashboard-manager';
import RealTimeDashboard from './real-time-dashboard';
import InteractiveCharts from './interactive-charts';
import CustomDashboard from './custom-dashboard';

export function AnalyticsIntegration() {
  return (
    <DashboardProvider>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="real-time">Real-time</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <AnalyticsOverview />
            </TabsContent>

            <TabsContent value="real-time">
              <RealTimeDashboard 
                metrics={[
                  {
                    id: 'response_time',
                    name: 'Response Time',
                    value: 245,
                    previousValue: 280,
                    change: -35,
                    changePercentage: -12.5,
                    trend: 'down',
                    timestamp: new Date(),
                    unit: 'ms',
                    format: 'duration'
                  },
                  {
                    id: 'active_users',
                    name: 'Active Users',
                    value: 1247,
                    previousValue: 1150,
                    change: 97,
                    changePercentage: 8.4,
                    trend: 'up',
                    timestamp: new Date(),
                    format: 'number'
                  },
                  {
                    id: 'error_rate',
                    name: 'Error Rate',
                    value: 0.8,
                    previousValue: 0.7,
                    change: 0.1,
                    changePercentage: 14.3,
                    trend: 'up',
                    timestamp: new Date(),
                    unit: '%',
                    format: 'percentage'
                  }
                ]}
                alerts={[
                  {
                    id: 'alert-1',
                    type: 'warning',
                    title: 'High Response Time Detected',
                    message: 'Average response time has exceeded 500ms threshold',
                    timestamp: new Date(Date.now() - 5 * 60 * 1000),
                    acknowledged: false,
                    metadata: { threshold: 500, current: 687 }
                  },
                  {
                    id: 'alert-2',
                    type: 'error',
                    title: 'Database Connection Failed',
                    message: 'Unable to establish connection to primary database',
                    timestamp: new Date(Date.now() - 10 * 60 * 1000),
                    acknowledged: false,
                    metadata: { database: 'primary', attempts: 3 }
                  },
                  {
                    id: 'alert-3',
                    type: 'info',
                    title: 'Scheduled Maintenance',
                    message: 'System maintenance will begin in 30 minutes',
                    timestamp: new Date(Date.now() - 2 * 60 * 1000),
                    acknowledged: true,
                    metadata: { duration: '2 hours', systems: ['API', 'Database'] }
                  }
                ]}
              />
            </TabsContent>

            <TabsContent value="charts">
              <InteractiveCharts 
                charts={[
                  {
                    id: 'user-growth',
                    title: 'User Growth Trend',
                    type: 'line',
                    data: Array.from({ length: 30 }, (_, i) => ({
                      name: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
                      'New Users': Math.floor(Math.random() * 100) + 50,
                      'Active Users': Math.floor(Math.random() * 500) + 200,
                      'Returning Users': Math.floor(Math.random() * 300) + 150,
                      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString()
                    }))
                  },
                  {
                    id: 'error-distribution',
                    title: 'Error Distribution',
                    type: 'pie',
                    data: [
                      { name: '4xx Client Errors', value: 45, timestamp: new Date().toISOString() },
                      { name: '5xx Server Errors', value: 25, timestamp: new Date().toISOString() },
                      { name: 'Network Timeouts', value: 15, timestamp: new Date().toISOString() },
                      { name: 'Database Errors', value: 10, timestamp: new Date().toISOString() },
                      { name: 'Other Errors', value: 5, timestamp: new Date().toISOString() }
                    ]
                  },
                  {
                    id: 'performance-metrics',
                    title: 'System Performance',
                    type: 'area',
                    data: Array.from({ length: 24 }, (_, i) => ({
                      name: `${i.toString().padStart(2, '0')}:00`,
                      'CPU %': Math.floor(Math.random() * 50) + 30,
                      'Memory %': Math.floor(Math.random() * 40) + 40,
                      'Disk I/O': Math.floor(Math.random() * 60) + 20,
                      'Network': Math.floor(Math.random() * 80) + 10,
                      timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString()
                    }))
                  },
                  {
                    id: 'api-endpoints',
                    title: 'API Endpoint Usage',
                    type: 'bar',
                    data: [
                      { name: '/api/users', value: 1250, timestamp: new Date().toISOString() },
                      { name: '/api/products', value: 890, timestamp: new Date().toISOString() },
                      { name: '/api/orders', value: 654, timestamp: new Date().toISOString() },
                      { name: '/api/auth', value: 432, timestamp: new Date().toISOString() },
                      { name: '/api/search', value: 321, timestamp: new Date().toISOString() },
                      { name: '/api/analytics', value: 198, timestamp: new Date().toISOString() }
                    ]
                  }
                ]}
              />
            </TabsContent>

            <TabsContent value="dashboards">
              <DashboardManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardProvider>
  );
}

// Export individual components for flexible usage
export {
  AnalyticsOverview,
  DashboardManager,
  RealTimeDashboard,
  InteractiveCharts,
  CustomDashboard,
  DashboardProvider
};

export default AnalyticsIntegration;