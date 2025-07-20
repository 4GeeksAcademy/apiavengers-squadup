// src/front/components/SystemStatusIndicator.jsx - COMPLETE IMPLEMENTATION

import React, { useState, useEffect } from 'react';
import { fetchWithConfig } from '../config/environment.js';

/**
 * System Status Indicator Component
 * Shows real-time system health and performance metrics
 */
const SystemStatusIndicator = ({ showDetails = false, className = "" }) => {
    const [status, setStatus] = useState('loading');
    const [metrics, setMetrics] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [error, setError] = useState(null);

    // Fetch system status
    const fetchStatus = async () => {
        try {
            const response = await fetchWithConfig('/api/health', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                setStatus(data.status === 'healthy' ? 'healthy' : 'degraded');
                setMetrics(data.performance || {});
                setLastUpdate(new Date());
                setError(null);
            } else {
                throw new Error(`Status ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            console.warn('System status check failed:', err.message);
            setStatus('error');
            setError(err.message);
            setMetrics(null);
        }
    };

    // Initial fetch and periodic updates
    useEffect(() => {
        fetchStatus();
        
        // Update every 30 seconds
        const interval = setInterval(fetchStatus, 30000);
        
        return () => clearInterval(interval);
    }, []);

    // Get status color and icon
    const getStatusDisplay = () => {
        switch (status) {
            case 'healthy':
                return {
                    color: 'text-green-400',
                    bgColor: 'bg-green-500/20',
                    borderColor: 'border-green-500/30',
                    icon: '●',
                    text: 'Healthy'
                };
            case 'degraded':
                return {
                    color: 'text-yellow-400',
                    bgColor: 'bg-yellow-500/20',
                    borderColor: 'border-yellow-500/30',
                    icon: '●',
                    text: 'Degraded'
                };
            case 'error':
                return {
                    color: 'text-red-400',
                    bgColor: 'bg-red-500/20',
                    borderColor: 'border-red-500/30',
                    icon: '●',
                    text: 'Error'
                };
            default:
                return {
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-500/20',
                    borderColor: 'border-gray-500/30',
                    icon: '○',
                    text: 'Loading'
                };
        }
    };

    const statusDisplay = getStatusDisplay();

    // Compact indicator for navbar
    if (!showDetails) {
        return (
            <div 
                className={`relative flex items-center ${className}`}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${statusDisplay.bgColor} ${statusDisplay.borderColor} transition-all duration-300`}>
                    <span className={`${statusDisplay.color} text-sm animate-pulse`}>
                        {statusDisplay.icon}
                    </span>
                    <span className={`${statusDisplay.color} text-sm font-medium hidden sm:inline`}>
                        System
                    </span>
                </div>

                {/* Tooltip */}
                {showTooltip && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-black/90 backdrop-blur-sm border border-white/10 rounded-lg p-3 z-50 text-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">System Status</span>
                            <span className={`${statusDisplay.color} font-medium`}>
                                {statusDisplay.text}
                            </span>
                        </div>
                        
                        {metrics && (
                            <div className="space-y-1 text-gray-300">
                                <div className="flex justify-between">
                                    <span>Health:</span>
                                    <span className="text-white">{metrics.health_status || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Memory:</span>
                                    <span className="text-white">{metrics.memory_usage_mb ? `${metrics.memory_usage_mb}MB` : 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Connections:</span>
                                    <span className="text-white">{metrics.active_connections || 0}</span>
                                </div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="mt-2 text-red-400 text-xs">
                                Error: {error}
                            </div>
                        )}
                        
                        {lastUpdate && (
                            <div className="mt-2 text-gray-500 text-xs">
                                Updated: {lastUpdate.toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Detailed view for admin dashboard - this will be enhanced below
    return <AdminPerformanceDashboard />;
};

/**
 * Admin Performance Dashboard Component
 * Comprehensive performance monitoring interface
 */
export const AdminPerformanceDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Fetch comprehensive metrics
    const fetchMetrics = async () => {
        try {
            setLoading(true);
            
            // Try admin endpoint first, fallback to public health endpoint
            let response = await fetchWithConfig('/api/admin/performance-dashboard', {
                method: 'GET'
            });

            if (!response.ok && response.status === 403) {
                // Fallback to public health endpoint
                response = await fetchWithConfig('/api/health', {
                    method: 'GET'
                });
            }

            if (response.ok) {
                const data = await response.json();
                
                // Transform data structure based on endpoint
                if (data.data) {
                    // Admin endpoint response
                    setMetrics(data.data);
                } else {
                    // Public health endpoint response
                    setMetrics({
                        summary: {
                            status: data.status,
                            uptime: data.performance?.uptime_seconds || 0,
                            memory_usage: data.performance?.memory_usage_mb || 0,
                            environment: data.environment || 'unknown'
                        },
                        performance: data.performance || {},
                        health: data.performance?.health_status || data.status || 'unknown',
                        services: data.services || {}
                    });
                }
                
                setError(null);
                setLastUpdate(new Date());
            } else {
                throw new Error(`Failed to fetch metrics: ${response.status}`);
            }
        } catch (err) {
            console.error('Failed to fetch performance metrics:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchMetrics();
        
        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchMetrics, 30000); // 30 seconds
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh]);

    // Run diagnostics
    const runDiagnostics = async () => {
        try {
            const response = await fetchWithConfig('/api/health', {
                method: 'GET'
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(`System Diagnostics:\n\nStatus: ${data.status}\nJWT: ${data.jwt_configured ? 'Configured' : 'Not Configured'}\nEnvironment: ${data.environment}\n\nCheck console for detailed logs.`);
                console.log('🔍 System Diagnostics:', data);
            } else {
                throw new Error('Diagnostics failed');
            }
        } catch (err) {
            alert(`Diagnostics failed: ${err.message}`);
        }
    };

    if (loading && !metrics) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto mb-4"></div>
                    <p className="text-white">Loading performance dashboard...</p>
                </div>
            </div>
        );
    }

    if (error && !metrics) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
                    <div className="text-red-400 text-4xl mb-4">⚠️</div>
                    <h2 className="text-white text-xl font-bold mb-4">Dashboard Unavailable</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <button
                        onClick={fetchMetrics}
                        className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl transition-colors duration-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const getHealthColor = (status) => {
        if (typeof status === 'string') {
            switch (status.toLowerCase()) {
                case 'healthy': case 'excellent': return 'text-green-400';
                case 'good': return 'text-green-300';
                case 'fair': case 'degraded': return 'text-yellow-400';
                case 'poor': return 'text-orange-400';
                case 'critical': case 'unhealthy': return 'text-red-400';
                default: return 'text-gray-400';
            }
        }
        return 'text-gray-400';
    };

    const formatUptime = (seconds) => {
        if (!seconds) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Performance Dashboard</h1>
                            <p className="text-white/70">Real-time system monitoring and analytics</p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2 text-white">
                                <input
                                    type="checkbox"
                                    checked={autoRefresh}
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm">Auto Refresh</span>
                            </label>
                            
                            <button
                                onClick={fetchMetrics}
                                disabled={loading}
                                className="px-4 py-2 bg-marine-500 hover:bg-marine-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50"
                            >
                                {loading ? 'Refreshing...' : 'Refresh'}
                            </button>
                            
                            <button
                                onClick={runDiagnostics}
                                className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-lg transition-colors duration-200"
                            >
                                Run Diagnostics
                            </button>
                        </div>
                    </div>
                    
                    {lastUpdate && (
                        <div className="mt-4 text-white/60 text-sm">
                            Last updated: {lastUpdate.toLocaleString()}
                        </div>
                    )}
                </div>

                {/* System Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className={`text-3xl font-bold ${getHealthColor(metrics?.summary?.status || metrics?.health)}`}>
                            {(metrics?.summary?.status || metrics?.health || 'Unknown').toUpperCase()}
                        </div>
                        <div className="text-white/70 text-sm mt-1">System Health</div>
                    </div>
                    
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-white">
                            {formatUptime(metrics?.summary?.uptime)}
                        </div>
                        <div className="text-white/70 text-sm mt-1">Uptime</div>
                    </div>
                    
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-white">
                            {metrics?.summary?.memory_usage ? `${Math.round(metrics.summary.memory_usage)}MB` : 'Unknown'}
                        </div>
                        <div className="text-white/70 text-sm mt-1">Memory Usage</div>
                    </div>
                    
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
                        <div className="text-3xl font-bold text-white">
                            {metrics?.summary?.total_connections || metrics?.summary?.active_sessions || 0}
                        </div>
                        <div className="text-white/70 text-sm mt-1">Active Connections</div>
                    </div>
                </div>

                {/* Performance Metrics */}
                {metrics?.performance && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Performance Metrics</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {Object.entries(metrics.performance).map(([key, value]) => (
                                <div key={key} className="bg-white/5 rounded-lg p-4">
                                    <div className="text-white/70 text-sm capitalize mb-1">
                                        {key.replace(/_/g, ' ')}
                                    </div>
                                    <div className="text-white font-medium">
                                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Services Status */}
                {metrics?.services && (
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Services Status</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {Object.entries(metrics.services).map(([service, status]) => (
                                <div key={service} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                                    <span className="text-white capitalize">{service.replace(/_/g, ' ')}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        status === 'connected' || status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="backdrop-blur-xl bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                        <h3 className="text-red-400 font-bold mb-2">System Alert</h3>
                        <p className="text-red-300">{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemStatusIndicator;