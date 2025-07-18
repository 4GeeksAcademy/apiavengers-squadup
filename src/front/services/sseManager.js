// services/sseManager.js - Enhanced SSE Connection Manager
import authService from '../store/authService';
import { useRef, useState, useEffect } from 'react';

/**
 * Enhanced SSE Manager for reliable real-time connections
 * Handles connection management, reconnection logic, heartbeat monitoring, and error recovery
 */
class SSEManager {
    constructor(endpoint, options = {}) {
        this.endpoint = endpoint;
        this.options = {
            maxRetries: 5,
            retryDelay: 2000,
            heartbeatTimeout: 30000,
            reconnectMultiplier: 1.5,
            maxReconnectDelay: 30000,
            enableLogging: true,
            autoReconnect: true,
            ...options
        };
        
        // Connection state
        this.eventSource = null;
        this.retryCount = 0;
        this.isConnected = false;
        this.isReconnecting = false;
        this.isDestroyed = false;
        this.lastHeartbeat = null;
        this.connectionId = Math.random().toString(36).substr(2, 9);
        this.connectionStartTime = null;
        
        // Event handling
        this.listeners = new Map();
        this.messageQueue = [];
        this.connectionAttempts = 0;
        
        // Timers
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.healthCheckTimer = null;
        
        // Bind methods to preserve context
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.scheduleReconnect = this.scheduleReconnect.bind(this);
        this.checkHeartbeat = this.checkHeartbeat.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleError = this.handleError.bind(this);
        
        this.log('SSE Manager initialized', { endpoint, options: this.options });
    }
    
    /**
     * Establish SSE connection with enhanced error handling
     */
    connect() {
        if (this.isDestroyed) {
            this.log('Cannot connect - manager is destroyed', 'warn');
            return;
        }
        
        const token = authService.getAccessToken();
        if (!token) {
            this.log('No auth token available', 'error');
            this.emit('authError', { message: 'No authentication token' });
            return;
        }
        
        // Prevent duplicate connections
        if (this.isConnected || this.isReconnecting) {
            this.log('Connection already active or reconnecting', 'warn');
            return;
        }
        
        this.connectionAttempts++;
        this.connectionStartTime = Date.now();
        this.isReconnecting = true;
        this.clearTimers();
        
        try {
            // Build URL with authentication
            const url = new URL(this.endpoint, window.location.origin);
            url.searchParams.set('token', token);
            url.searchParams.set('connection_id', this.connectionId);
            url.searchParams.set('client', 'web');
            url.searchParams.set('version', '1.0');
            
            this.log(`Connecting to SSE (attempt ${this.connectionAttempts})...`);
            
            this.eventSource = new EventSource(url.toString());
            
            // Set up event handlers
            this.eventSource.onopen = this.handleOpen;
            this.eventSource.onmessage = this.handleMessage;
            this.eventSource.onerror = this.handleError;
            
            // Start health monitoring
            this.startHealthMonitoring();
            
        } catch (error) {
            this.log('Failed to create EventSource', 'error', error);
            this.handleConnectionFailure(error);
        }
    }
    
    /**
     * Handle successful connection
     */
    handleOpen(event) {
        const connectionTime = Date.now() - this.connectionStartTime;
        
        this.log(`SSE connected successfully in ${connectionTime}ms`, 'success');
        
        this.isConnected = true;
        this.isReconnecting = false;
        this.retryCount = 0;
        this.lastHeartbeat = Date.now();
        
        this.clearReconnectTimer();
        this.startHeartbeatMonitor();
        
        this.emit('connected', { 
            connectionId: this.connectionId,
            endpoint: this.endpoint,
            connectionTime,
            attempt: this.connectionAttempts
        });
        
        // Process queued messages
        this.processMessageQueue();
    }
    
    /**
     * Handle incoming messages
     */
    handleMessage(event) {
        try {
            this.lastHeartbeat = Date.now();
            
            // Parse message data
            let data;
            try {
                data = JSON.parse(event.data);
            } catch (parseError) {
                this.log('Failed to parse message data', 'warn', parseError);
                this.emit('parseError', { 
                    error: parseError, 
                    rawData: event.data 
                });
                return;
            }
            
            this.log('Received message', 'debug', data);
            
            // Handle different message types
            if (data.type === 'heartbeat') {
                this.emit('heartbeat', { 
                    timestamp: data.timestamp || this.lastHeartbeat,
                    connectionId: this.connectionId
                });
                return;
            }
            
            if (data.type === 'error') {
                this.log('Server error message', 'error', data);
                this.emit('serverError', data);
                return;
            }
            
            if (data.type === 'auth_error') {
                this.log('Authentication error from server', 'error', data);
                this.emit('authError', data);
                this.disconnect();
                return;
            }
            
            // Regular data message
            this.emit('message', data);
            
        } catch (error) {
            this.log('Error processing message', 'error', error);
        }
    }
    
    /**
     * Handle connection errors
     */
    handleError(error) {
        this.log('SSE connection error', 'error', error);
        
        this.isConnected = false;
        this.isReconnecting = false;
        this.stopHeartbeatMonitor();
        
        this.emit('disconnected', {
            reason: 'connection_error',
            retryCount: this.retryCount,
            connectionId: this.connectionId
        });
        
        this.emit('error', { 
            error,
            retryCount: this.retryCount,
            willRetry: this.retryCount < this.options.maxRetries
        });
        
        // Close the connection
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        // Schedule reconnection if auto-reconnect is enabled
        if (this.options.autoReconnect && !this.isDestroyed) {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Handle connection failures
     */
    handleConnectionFailure(error) {
        this.log('Connection failure', 'error', error);
        
        this.isConnected = false;
        this.isReconnecting = false;
        
        this.emit('connectionError', { error });
        this.emit('error', {
            message: error.message || 'Failed to establish connection',
            retryCount: this.retryCount,
            willRetry: this.retryCount < this.options.maxRetries
        });
        
        if (this.options.autoReconnect && !this.isDestroyed) {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Gracefully disconnect SSE connection
     */
    disconnect() {
        this.log('Disconnecting SSE');
        
        this.isConnected = false;
        this.isReconnecting = false;
        this.clearTimers();
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        this.emit('disconnected', { 
            reason: 'manual_disconnect',
            connectionId: this.connectionId,
            wasConnected: this.isConnected 
        });
    }
    
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.retryCount >= this.options.maxRetries) {
            this.log('Max reconnection attempts reached', 'error');
            this.emit('maxRetriesReached', { 
                retryCount: this.retryCount,
                maxRetries: this.options.maxRetries,
                totalAttempts: this.connectionAttempts
            });
            return;
        }
        
        this.retryCount++;
        
        // Calculate delay with exponential backoff
        const baseDelay = this.options.retryDelay;
        const multiplier = Math.pow(this.options.reconnectMultiplier, this.retryCount - 1);
        const delay = Math.min(baseDelay * multiplier, this.options.maxReconnectDelay);
        
        this.log(`Scheduling reconnect attempt ${this.retryCount} in ${delay}ms`);
        
        this.emit('reconnectScheduled', { 
            delay, 
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries 
        });
        
        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected && !this.isDestroyed) {
                this.log(`Attempting reconnect ${this.retryCount}/${this.options.maxRetries}`);
                this.connect();
            }
        }, delay);
    }
    
    /**
     * Start heartbeat monitoring
     */
    startHeartbeatMonitor() {
        this.stopHeartbeatMonitor();
        
        this.heartbeatTimer = setInterval(() => {
            this.checkHeartbeat();
        }, 10000); // Check every 10 seconds
    }
    
    /**
     * Stop heartbeat monitoring
     */
    stopHeartbeatMonitor() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Check if heartbeat is still active
     */
    checkHeartbeat() {
        if (!this.isConnected || !this.lastHeartbeat) return;
        
        const timeSinceHeartbeat = Date.now() - this.lastHeartbeat;
        
        if (timeSinceHeartbeat > this.options.heartbeatTimeout) {
            this.log(`Heartbeat timeout (${timeSinceHeartbeat}ms since last heartbeat)`, 'warn');
            this.emit('heartbeatTimeout', { 
                timeSinceHeartbeat,
                timeout: this.options.heartbeatTimeout 
            });
            
            // Force reconnection
            this.handleHeartbeatTimeout();
        }
    }
    
    /**
     * Handle heartbeat timeout
     */
    handleHeartbeatTimeout() {
        this.log('Heartbeat timeout detected, forcing reconnection', 'warn');
        
        this.disconnect();
        
        if (this.options.autoReconnect && !this.isDestroyed) {
            this.scheduleReconnect();
        }
    }
    
    /**
     * Start general health monitoring
     */
    startHealthMonitoring() {
        this.stopHealthMonitoring();
        
        this.healthCheckTimer = setInterval(() => {
            if (this.isConnected && this.eventSource) {
                // Check if EventSource is still in a good state
                if (this.eventSource.readyState === EventSource.CLOSED) {
                    this.log('EventSource closed unexpectedly', 'warn');
                    this.handleError(new Event('unexpected_close'));
                }
            }
        }, 30000); // Check every 30 seconds
    }
    
    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckTimer) {
            clearInterval(this.healthCheckTimer);
            this.healthCheckTimer = null;
        }
    }
    
    /**
     * Clear all active timers
     */
    clearTimers() {
        this.clearReconnectTimer();
        this.stopHeartbeatMonitor();
        this.stopHealthMonitoring();
    }
    
    /**
     * Clear reconnection timer
     */
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        return () => this.off(event, callback);
    }
    
    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(event) {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }
    
    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.log(`Error in event listener for ${event}`, 'error', error);
                }
            });
        }
    }
    
    /**
     * Queue message for later processing
     */
    queueMessage(message) {
        this.messageQueue.push({
            message,
            timestamp: Date.now()
        });
        
        // Limit queue size
        if (this.messageQueue.length > 100) {
            this.messageQueue.shift();
        }
    }
    
    /**
     * Process queued messages
     */
    processMessageQueue() {
        if (this.messageQueue.length > 0) {
            this.log(`Processing ${this.messageQueue.length} queued messages`);
            
            this.messageQueue.forEach(({ message }) => {
                this.emit('message', message);
            });
            
            this.messageQueue = [];
        }
    }
    
    /**
     * Get current connection status and stats
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isReconnecting: this.isReconnecting,
            isDestroyed: this.isDestroyed,
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries,
            lastHeartbeat: this.lastHeartbeat,
            connectionId: this.connectionId,
            connectionAttempts: this.connectionAttempts,
            endpoint: this.endpoint,
            queuedMessages: this.messageQueue.length,
            uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
        };
    }
    
    /**
     * Get detailed connection stats
     */
    getStats() {
        return this.getStatus();
    }
    
    /**
     * Force reconnection (useful for manual retry)
     */
    forceReconnect() {
        this.log('Force reconnection requested');
        this.retryCount = 0; // Reset retry count
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
    }
    
    /**
     * Update connection options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.log('Options updated', 'info', this.options);
    }
    
    /**
     * Destroy the manager (no more connections)
     */
    destroy() {
        this.log('Destroying SSE Manager');
        
        this.isDestroyed = true;
        this.disconnect();
        this.removeAllListeners();
        this.clearTimers();
        this.messageQueue = [];
        
        this.emit('destroyed');
    }
    
    /**
     * Enhanced logging
     */
    log(message, level = 'info', data = null) {
        if (!this.options.enableLogging) return;
        
        const prefix = `[SSE Manager]`;
        const timestamp = new Date().toISOString();
        
        switch (level) {
            case 'error':
                console.error(`${prefix} ${timestamp} ❌`, message, data || '');
                break;
            case 'warn':
                console.warn(`${prefix} ${timestamp} ⚠️`, message, data || '');
                break;
            case 'success':
                console.log(`${prefix} ${timestamp} ✅`, message, data || '');
                break;
            case 'debug':
                console.debug(`${prefix} ${timestamp} 🔍`, message, data || '');
                break;
            default:
                console.log(`${prefix} ${timestamp} ℹ️`, message, data || '');
        }
    }
}

// Factory function to create SSE manager instances
export function createSSEManager(endpoint, options = {}) {
    return new SSEManager(endpoint, options);
}

// Hook for React components
export function useSSEManager(endpoint, options = {}) {
    const managerRef = useRef(null);
    const [status, setStatus] = useState({
        isConnected: false,
        isReconnecting: false,
        retryCount: 0,
        error: null
    });
    
    useEffect(() => {
        if (!endpoint) return;
        
        const manager = new SSEManager(endpoint, options);
        managerRef.current = manager;
        
        // Set up status listeners
        const unsubscribers = [
            manager.on('connected', () => {
                setStatus(prev => ({ ...prev, isConnected: true, error: null }));
            }),
            manager.on('disconnected', () => {
                setStatus(prev => ({ ...prev, isConnected: false }));
            }),
            manager.on('reconnectScheduled', (data) => {
                setStatus(prev => ({ 
                    ...prev, 
                    isReconnecting: true, 
                    retryCount: data.retryCount 
                }));
            }),
            manager.on('error', (data) => {
                setStatus(prev => ({ 
                    ...prev, 
                    error: data.error?.message || data.message || 'Connection error',
                    retryCount: data.retryCount 
                }));
            }),
            manager.on('maxRetriesReached', () => {
                setStatus(prev => ({ 
                    ...prev, 
                    isReconnecting: false,
                    error: 'Max reconnection attempts reached' 
                }));
            })
        ];
        
        // Start connection
        manager.connect();
        
        // Cleanup
        return () => {
            unsubscribers.forEach(unsub => unsub());
            manager.destroy();
        };
    }, [endpoint]);
    
    return {
        manager: managerRef.current,
        status,
        forceReconnect: () => managerRef.current?.forceReconnect(),
        disconnect: () => managerRef.current?.disconnect()
    };
}

export default SSEManager;