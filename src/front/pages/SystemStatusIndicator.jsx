import React, { useState, useEffect } from 'react';
import { getBackendURL } from '../config/environment.js';

const SystemStatusIndicator = ({ showDetails = false, className = "" }) => {
    const [status, setStatus] = useState({
        status: 'unknown',
        metrics: null,
        lastUpdate: null,
        error: null
    });
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        fetchSystemStatus();
        
        // Update every 30 seconds
        const interval = setInterval(fetchSystemStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchSystemStatus = async () => {
        try {
            const response = await fetch(`${getBackendURL()}/api/metrics`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                setStatus({
                    status: data.metrics.system.status,
                    metrics: data.metrics,
                    lastUpdate: new Date(),
                    error: null
                });
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to fetch system status:', error);
            setStatus(prev => ({
                ...prev,
                status: 'error',
                error: error.message,
                lastUpdate: new Date()
            }));
        }
    };

    const getStatusColor = () => {
        switch (status.status) {
            case 'healthy': return 'text-green-500';
            case 'degraded': return 'text-yellow-500';
            case 'critical': return 'text-red-500';
            case 'error': return 'text-red-600';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = () => {
        switch (status.status) {
            case 'healthy': return '🟢';
            case 'degraded': return '🟡';
            case 'critical': return '🔴';
            case 'error': return '❌';
            default: return '⚪';
        }
    };

    const formatUptime = (seconds) => {
        if (!seconds) return 'Unknown';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const formatMemory = (mb) => {
        if (!mb) return 'Unknown';
        
        if (mb > 1024) {
            return `${(mb / 1024).toFixed(1)}GB`;
        }
        return `${mb.toFixed(0)}MB`;
    };

    if (!showDetails) {
        // Compact status indicator
        return (
            <div className={`flex items-center space-x-2 ${className}`}>
                <span className="text-sm">{getStatusIcon()}</span>
                <span className={`text-xs font-medium ${getStatusColor()}`}>
                    {status.status.toUpperCase()}
                </span>
                {status.metrics && (
                    <span className="text-xs text-gray-500">
                        {status.metrics.activity.total_connections} users
                    </span>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
            {/* Header */}
            <div 
                className="p-4 cursor-pointer flex items-center justify-between"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center space-x-3">
                    <span className="text-lg">{getStatusIcon()}</span>
                    <div>
                        <h3 className="font-medium text-gray-900">System Status</h3>
                        <p className={`text-sm ${getStatusColor()}`}>
                            {status.status.toUpperCase()}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center space-x-4">
                    {status.metrics && (
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                                {status.metrics.activity.total_connections} users online
                            </p>
                            <p className="text-xs text-gray-500">
                                {status.metrics.activity.active_sessions} active sessions
                            </p>
                        </div>
                    )}
                    
                    <span className={`transform transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                    }`}>
                        ▼
                    </span>
                </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && status.metrics && (
                <div className="border-t px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {/* System Metrics */}
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 mb-1">Uptime</p>
                            <p className="font-medium">
                                {formatUptime(status.metrics.system.uptime_seconds)}
                            </p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 mb-1">Memory</p>
                            <p className="font-medium">
                                {formatMemory(status.metrics.system.memory_usage_mb)}
                            </p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 mb-1">Response Time</p>
                            <p className="font-medium">
                                {status.metrics.performance.avg_response_time_ms.toFixed(0)}ms
                            </p>
                        </div>

                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 mb-1">Error Rate</p>
                            <p className={`font-medium ${
                                status.metrics.performance.error_rate_percent > 5 
                                    ? 'text-red-600' 
                                    : 'text-green-600'
                            }`}>
                                {status.metrics.performance.error_rate_percent.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Activity Metrics */}
                    <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Live Activity</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-blue-50 p-3 rounded">
                                <p className="text-xs text-blue-600 mb-1">Events/Second</p>
                                <p className="font-medium text-blue-900">
                                    {status.metrics.activity.events_per_second.toFixed(1)}
                                </p>
                            </div>

                            <div className="bg-green-50 p-3 rounded">
                                <p className="text-xs text-green-600 mb-1">Total Requests</p>
                                <p className="font-medium text-green-900">
                                    {status.metrics.performance.total_requests.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Last Updated */}
                    <div className="mt-4 pt-3 border-t">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                                Last updated: {status.lastUpdate?.toLocaleTimeString()}
                            </span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fetchSystemStatus();
                                }}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Error State */}
                    {status.error && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                                ⚠️ Could not fetch latest metrics: {status.error}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Admin Performance Dashboard Component (bonus)
export const AdminPerformanceDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDetailedMetrics();
        const interval = setInterval(fetchDetailedMetrics, 10000); // Update every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchDetailedMetrics = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${getBackendURL()}/api/health/detailed`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setMetrics(data.data);
                setError(null);
            } else if (response.status === 403) {
                setError('Admin access required');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading performance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">❌ {error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
            
            {/* System Health Overview */}
            <SystemStatusIndicator showDetails={true} />
            
            {/* Connection Details */}
            {metrics.connections && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Live Connections ({metrics.connections.total_connections})
                    </h3>
                    
                    {Object.keys(metrics.connections.sessions).length === 0 ? (
                        <p className="text-gray-500">No active sessions</p>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(metrics.connections.sessions).map(([sessionId, sessionData]) => (
                                <div key={sessionId} className="bg-gray-50 p-3 rounded">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">Session {sessionId}</span>
                                        <span className="text-sm text-gray-600">
                                            {sessionData.user_count} users
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Users: {sessionData.users.join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SystemStatusIndicator;