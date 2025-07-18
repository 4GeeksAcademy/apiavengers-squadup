// services/sseManager.js - Enhanced SSE Connection Manager
import authService from '../store/authService';

class SSEManager {
    constructor(endpoint, options = {}) {
        this.endpoint = endpoint;
        this.options = {
            maxRetries: 5,
            retryDelay: 2000,
            heartbeatTimeout: 30000,
            reconnectMultiplier: 1.5,
            maxReconnectDelay: 30000,
            ...options
        };
        
        this.eventSource = null;
        this.retryCount = 0;
        this.isConnected = false;
        this.isReconnecting = false;
        this.lastHeartbeat = null;
        this.listeners = new Map();
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.connectionId = Math.random().toString(36).substr(2, 9);
        
        // Bind methods to preserve context
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.scheduleReconnect = this.scheduleReconnect.bind(this);
        this.checkHeartbeat = this.checkHeartbeat.bind(this);
    }
    
    /**
     * Establish SSE connection with enhanced error handling
     */
    connect() {
        const token = authService.getAccessToken();
        if (!token) {
            console.warn('🔐 SSEManager: No auth token available');
            this.emit('authError', { message: 'No authentication token' });
            return;
        }
        
        // Prevent duplicate connections
        if (this.isConnected || this.isReconnecting) {
            console.log('🔄 SSEManager: Connection already active or reconnecting');
            return;
        }
        
        this.isReconnecting = true;
        this.clearTimers();
        
        try {
            // Build URL with authentication
            const url = new URL(this.endpoint, window.location.origin);
            url.searchParams.set('token', token);
            url.searchParams.set('connection_id', this.connectionId);
            
            console.log(`🔌 SSEManager: Connecting to ${this.endpoint} (attempt ${this.retryCount + 1})`);
            
            this.eventSource = new EventSource(url.toString());
            
            // Connection opened successfully
            this.eventSource.onopen = () => {
                console.log('✅ SSEManager: Connection established');
                this.isConnected = true;
                this.isReconnecting = false;
                this.retryCount = 0;
                this.lastHeartbeat = Date.now();
                this.startHeartbeatMonitor();
                this.emit('connected', { 
                    connectionId: this.connectionId,
                    endpoint: this.endpoint 
                });
            };
            
            // Message received
            this.eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle different message types
                    if (data.type === 'heartbeat') {
                        this.lastHeartbeat = Date.now();
                        this.emit('heartbeat', { timestamp: this.lastHeartbeat });
                        return;
                    }
                    
                    if (data.type === 'error') {
                        console.error('❌ SSEManager: Server error:', data.message);
                        this.emit('serverError', data);
                        return;
                    }
                    
                    if (data.type === 'auth_error') {
                        console.error('🔐 SSEManager: Authentication error');
                        this.emit('authError', data);
                        this.disconnect();
                        return;
                    }
                    
                    // Regular data message
                    this.lastHeartbeat = Date.now();
                    this.emit('message', data);
                    
                } catch (parseError) {
                    console.error('❌ SSEManager: Message parse error:', parseError);
                    this.emit('parseError', { 
                        error: parseError, 
                        rawData: event.data 
                    });
                }
            };
            
            // Connection error occurred
            this.eventSource.onerror = (error) => {
                console.error('❌ SSEManager: Connection error:', error);
                this.isConnected = false;
                this.isReconnecting = false;
                this.stopHeartbeatMonitor();
                
                // Emit error event
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
                
                // Schedule reconnection if within retry limits
                this.scheduleReconnect();
            };
            
        } catch (error) {
            console.error('❌ SSEManager: Failed to create connection:', error);
            this.isReconnecting = false;
            this.emit('connectionError', { error });
            this.scheduleReconnect();
        }
    }
    
    /**
     * Gracefully disconnect SSE connection
     */
    disconnect() {
        console.log('🔌 SSEManager: Disconnecting...');
        
        this.isConnected = false;
        this.isReconnecting = false;
        this.clearTimers();
        
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
        
        this.emit('disconnected', { 
            connectionId: this.connectionId,
            wasConnected: this.isConnected 
        });
    }
    
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        if (this.retryCount >= this.options.maxRetries) {
            console.log('❌ SSEManager: Max reconnection attempts reached');
            this.emit('maxRetriesReached', { 
                retryCount: this.retryCount,
                maxRetries: this.options.maxRetries 
            });
            return;
        }
        
        const delay = Math.min(
            this.options.retryDelay * Math.pow(this.options.reconnectMultiplier, this.retryCount),
            this.options.maxReconnectDelay
        );
        
        this.retryCount++;
        
        console.log(`🔄 SSEManager: Scheduling reconnection in ${delay}ms (attempt ${this.retryCount}/${this.options.maxRetries})`);
        
        this.emit('reconnectScheduled', { 
            delay, 
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries 
        });
        
        this.reconnectTimer = setTimeout(() => {
            if (!this.isConnected) {
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
            console.warn('💔 SSEManager: Heartbeat timeout detected');
            this.emit('heartbeatTimeout', { 
                timeSinceHeartbeat,
                timeout: this.options.heartbeatTimeout 
            });
            
            // Force reconnection
            this.disconnect();
            this.scheduleReconnect();
        }
    }
    
    /**
     * Clear all active timers
     */
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.stopHeartbeatMonitor();
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
                    console.error(`❌ SSEManager: Listener error for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get current connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            isReconnecting: this.isReconnecting,
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries,
            lastHeartbeat: this.lastHeartbeat,
            connectionId: this.connectionId,
            endpoint: this.endpoint
        };
    }
    
    /**
     * Force reconnection (useful for manual retry)
     */
    forceReconnect() {
        console.log('🔄 SSEManager: Force reconnection requested');
        this.retryCount = 0; // Reset retry count
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
    }
    
    /**
     * Update connection options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        console.log('⚙️ SSEManager: Options updated:', this.options);
    }
    
    /**
     * Clean up all resources
     */
    destroy() {
        console.log('🗑️ SSEManager: Destroying connection manager');
        this.disconnect();
        this.removeAllListeners();
        this.clearTimers();
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
                    error: data.error?.message || 'Connection error',
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