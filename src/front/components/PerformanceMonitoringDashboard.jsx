import { useState, useEffect } from 'react';
import performanceService from '../services/performanceService';

const PerformanceMonitoringDashboard = ({ isVisible = false }) => {
  const [metrics, setMetrics] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!isVisible) return;

    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      const currentMetrics = performanceService.getMetrics();
      const currentHealth = performanceService.getHealthStatus();
      
      setMetrics(currentMetrics);
      setHealthStatus(currentHealth);
      setAlerts(currentMetrics.alerts || []);
    }, 5000);

    // Listen for performance alerts
    const handleAlert = (event) => {
      setAlerts(prev => [event.detail, ...prev.slice(0, 9)]); // Keep last 10 alerts
    };

    window.addEventListener('performanceAlert', handleAlert);

    // Initial load
    const initialMetrics = performanceService.getMetrics();
    const initialHealth = performanceService.getHealthStatus();
    setMetrics(initialMetrics);
    setHealthStatus(initialHealth);

    return () => {
      clearInterval(interval);
      window.removeEventListener('performanceAlert', handleAlert);
    };
  }, [isVisible]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      default: return '❓';
    }
  };

  const acknowledgeAlert = (alertId) => {
    performanceService.acknowledgeAlert(alertId);
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  if (!isVisible || !metrics) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 w-96 bg-gray-900 text-white rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">🚀 Performance Monitor</h3>
          {healthStatus && (
            <div className={`flex items-center space-x-2 ${getStatusColor(healthStatus.overall)}`}>
              <span>{getStatusIcon(healthStatus.overall)}</span>
              <span className="text-sm font-medium capitalize">{healthStatus.overall}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Real-time Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Active Users</div>
            <div className="text-xl font-bold text-blue-400">{metrics.userConnections}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Gaming Sessions</div>
            <div className="text-xl font-bold text-green-400">{metrics.activeSessions}</div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Steam API (ms)</div>
            <div className={`text-xl font-bold ${metrics.averageSteamResponseTime > 3000 ? 'text-red-400' : 'text-green-400'}`}>
              {metrics.averageSteamResponseTime}
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Vote Processing (ms)</div>
            <div className={`text-xl font-bold ${metrics.averageVoteProcessingTime > 1000 ? 'text-yellow-400' : 'text-green-400'}`}>
              {metrics.averageVoteProcessingTime}
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-gray-800 p-3 rounded">
          <div className="text-sm text-gray-400 mb-2">System Health</div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Memory Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${metrics.memoryUsage > 80 ? 'bg-red-500' : metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(metrics.memoryUsage, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">{metrics.memoryUsage.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">Error Rate</span>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${metrics.errorRate > 10 ? 'bg-red-500' : metrics.errorRate > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(metrics.errorRate, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-400">{metrics.errorRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="bg-red-900/30 border border-red-500/50 p-3 rounded">
            <div className="text-sm text-red-400 mb-2 flex items-center">
              🚨 Active Alerts ({alerts.length})
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="bg-red-900/50 p-2 rounded text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-red-300">{alert.type.replace(/_/g, ' ')}</div>
                      <div className="text-gray-400 mt-1">
                        {alert.data.current && `Current: ${alert.data.current}`}
                        {alert.data.responseTime && `Response: ${alert.data.responseTime}ms`}
                        {alert.data.threshold && ` (Threshold: ${alert.data.threshold})`}
                      </div>
                    </div>
                    <button 
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="text-red-400 hover:text-red-300 ml-2"
                      title="Acknowledge"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-2">
          <div className="flex justify-between">
            <span>Total Requests: {metrics.totalRequests}</span>
            <span>Total Errors: {metrics.totalErrors}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard;