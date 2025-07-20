import time
import threading
import psutil
import json
from collections import defaultdict, deque
from datetime import datetime, timedelta
from flask import jsonify
from functools import wraps
import sys
import os

class PerformanceMonitor:
    """
    Real-time performance monitoring for SSE voting system
    Tracks connections, response times, memory usage, and system health
    """
    
    def __init__(self):
        self.metrics = {
            'sse_connections': 0,
            'active_sessions': 0,
            'events_per_second': 0,
            'memory_usage_mb': 0,
            'db_query_times': deque(maxlen=100),  # Last 100 queries
            'steam_api_times': deque(maxlen=50),   # Last 50 API calls
            'error_count': 0,
            'total_requests': 0,
            'start_time': time.time()
        }
        
        # Time-based counters
        self.event_counter = 0
        self.last_event_time = time.time()
        self.error_window = deque(maxlen=100)  # Track errors in sliding window
        
        # Connection tracking
        self.active_connections = set()
        self.session_connections = defaultdict(set)  # session_id -> user_ids
        
        # Request timing
        self.request_times = deque(maxlen=200)
        
        # Start background monitoring
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._background_monitor, daemon=True)
        self.monitor_thread.start()
        
        print("🔥 Performance Monitor started - tracking system health")
    
    def track_sse_connection(self, session_id, user_id, action='connect'):
        """Track SSE connection events"""
        connection_id = f"{session_id}:{user_id}"
        
        if action == 'connect':
            self.active_connections.add(connection_id)
            self.session_connections[session_id].add(user_id)
            self.metrics['sse_connections'] = len(self.active_connections)
            print(f"📡 SSE Connected: {user_id} to session {session_id} (Total: {self.metrics['sse_connections']})")
            
        elif action == 'disconnect':
            self.active_connections.discard(connection_id)
            self.session_connections[session_id].discard(user_id)
            if not self.session_connections[session_id]:
                del self.session_connections[session_id]
            self.metrics['sse_connections'] = len(self.active_connections)
            print(f"📡 SSE Disconnected: {user_id} from session {session_id} (Total: {self.metrics['sse_connections']})")
        
        # Update active sessions count
        self.metrics['active_sessions'] = len(self.session_connections)
    
    def track_sse_event(self, event_type, processing_time=None):
        """Track SSE event sending"""
        self.event_counter += 1
        current_time = time.time()
        
        # Calculate events per second
        time_diff = current_time - self.last_event_time
        if time_diff >= 1.0:  # Update every second
            self.metrics['events_per_second'] = self.event_counter / time_diff
            self.event_counter = 0
            self.last_event_time = current_time
        
        if processing_time:
            print(f"⚡ SSE Event '{event_type}' sent ({processing_time:.2f}ms)")
    
    def track_database_query(self, query_time_ms):
        """Track database query performance"""
        self.metrics['db_query_times'].append(query_time_ms)
        if query_time_ms > 100:  # Slow query warning
            print(f"🐌 Slow DB query detected: {query_time_ms:.2f}ms")
    
    def track_steam_api_call(self, response_time_ms, success=True):
        """Track Steam API call performance"""
        self.metrics['steam_api_times'].append(response_time_ms)
        if not success:
            self.track_error('steam_api_error')
        if response_time_ms > 2000:  # Slow API call
            print(f"🐌 Slow Steam API call: {response_time_ms:.2f}ms")
    
    def track_request(self, request_time_ms):
        """Track general request response times"""
        self.request_times.append(request_time_ms)
        self.metrics['total_requests'] += 1
    
    def track_error(self, error_type):
        """Track system errors"""
        self.metrics['error_count'] += 1
        self.error_window.append({
            'type': error_type,
            'timestamp': time.time()
        })
        print(f"❌ Error tracked: {error_type} (Total: {self.metrics['error_count']})")
    
    def get_current_metrics(self):
        """Get current system metrics"""
        # Update memory usage
        process = psutil.Process()
        self.metrics['memory_usage_mb'] = process.memory_info().rss / 1024 / 1024
        
        # Calculate averages
        avg_db_time = sum(self.metrics['db_query_times']) / len(self.metrics['db_query_times']) if self.metrics['db_query_times'] else 0
        avg_steam_time = sum(self.metrics['steam_api_times']) / len(self.metrics['steam_api_times']) if self.metrics['steam_api_times'] else 0
        avg_request_time = sum(self.request_times) / len(self.request_times) if self.request_times else 0
        
        # Calculate error rate (errors in last 5 minutes)
        recent_errors = [e for e in self.error_window if time.time() - e['timestamp'] < 300]
        error_rate = len(recent_errors) / max(1, self.metrics['total_requests']) * 100
        
        uptime = time.time() - self.metrics['start_time']
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'uptime_seconds': int(uptime),
                'memory_usage_mb': round(self.metrics['memory_usage_mb'], 2),
                'cpu_percent': psutil.cpu_percent(),
                'error_rate_percent': round(error_rate, 2)
            },
            'sse': {
                'active_connections': self.metrics['sse_connections'],
                'active_sessions': self.metrics['active_sessions'],
                'events_per_second': round(self.metrics['events_per_second'], 2),
                'connections_by_session': {
                    session_id: len(users) 
                    for session_id, users in self.session_connections.items()
                }
            },
            'performance': {
                'avg_request_time_ms': round(avg_request_time, 2),
                'avg_db_query_time_ms': round(avg_db_time, 2),
                'avg_steam_api_time_ms': round(avg_steam_time, 2),
                'total_requests': self.metrics['total_requests'],
                'total_errors': self.metrics['error_count']
            },
            'health_status': self._calculate_health_status(error_rate, avg_request_time, self.metrics['memory_usage_mb'])
        }
    
    def _calculate_health_status(self, error_rate, avg_response_time, memory_mb):
        """Calculate overall system health"""
        issues = []
        status = 'healthy'
        
        if error_rate > 5:
            issues.append(f"High error rate: {error_rate:.1f}%")
            status = 'degraded'
        
        if avg_response_time > 200:
            issues.append(f"Slow responses: {avg_response_time:.0f}ms avg")
            status = 'degraded' if status == 'healthy' else 'critical'
        
        if memory_mb > 500:
            issues.append(f"High memory usage: {memory_mb:.0f}MB")
            status = 'degraded' if status == 'healthy' else 'critical'
        
        if self.metrics['sse_connections'] > 100:
            issues.append(f"High connection load: {self.metrics['sse_connections']} connections")
        
        return {
            'status': status,
            'issues': issues,
            'recommendations': self._get_recommendations(issues)
        }
    
    def _get_recommendations(self, issues):
        """Get performance recommendations based on issues"""
        recommendations = []
        
        for issue in issues:
            if 'error rate' in issue:
                recommendations.append("Check error logs and fix recurring issues")
            elif 'responses' in issue:
                recommendations.append("Optimize database queries and add caching")
            elif 'memory' in issue:
                recommendations.append("Consider restarting application or scaling resources")
            elif 'connection' in issue:
                recommendations.append("Monitor for connection leaks and implement rate limiting")
        
        return recommendations
    
    def _background_monitor(self):
        """Background thread for continuous monitoring"""
        while self.monitoring_active:
            try:
                # Clean up old data
                current_time = time.time()
                
                # Remove errors older than 1 hour
                self.error_window = deque([
                    e for e in self.error_window 
                    if current_time - e['timestamp'] < 3600
                ], maxlen=100)
                
                # Log health status every 5 minutes
                if int(current_time) % 300 == 0:
                    metrics = self.get_current_metrics()
                    health = metrics['health_status']
                    print(f"🏥 Health Check: {health['status'].upper()} | "
                          f"Connections: {metrics['sse']['active_connections']} | "
                          f"Memory: {metrics['system']['memory_usage_mb']:.1f}MB | "
                          f"Errors: {metrics['performance']['total_errors']}")
                
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Monitor thread error: {e}")
                time.sleep(5)
    
    def get_connection_details(self):
        """Get detailed connection information"""
        return {
            'total_connections': len(self.active_connections),
            'sessions': {
                session_id: {
                    'user_count': len(users),
                    'users': list(users)
                }
                for session_id, users in self.session_connections.items()
            },
            'connection_list': list(self.active_connections)
        }
    
    def get_performance_history(self, minutes=30):
        """Get performance data for the last N minutes"""
        # This would typically pull from a time-series database
        # For now, return current snapshot
        return {
            'timeframe_minutes': minutes,
            'current_snapshot': self.get_current_metrics(),
            'note': 'Historical data requires time-series database integration'
        }
    
    def shutdown(self):
        """Gracefully shutdown the monitor"""
        self.monitoring_active = False
        if self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=5)
        print("🔥 Performance Monitor shutdown complete")


# Global monitor instance
monitor = PerformanceMonitor()


def track_performance(operation_name):
    """Decorator to track function performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                processing_time = (time.time() - start_time) * 1000
                
                if operation_name == 'database':
                    monitor.track_database_query(processing_time)
                elif operation_name == 'steam_api':
                    monitor.track_steam_api_call(processing_time, success=True)
                elif operation_name == 'request':
                    monitor.track_request(processing_time)
                
                return result
                
            except Exception as e:
                processing_time = (time.time() - start_time) * 1000
                
                if operation_name == 'steam_api':
                    monitor.track_steam_api_call(processing_time, success=False)
                else:
                    monitor.track_error(f"{operation_name}_error")
                
                raise e
        
        return wrapper
    return decorator


# Health check functions for routes
def get_health_status():
    """Get basic health status for health endpoints"""
    return monitor.get_current_metrics()

def get_detailed_metrics():
    """Get detailed metrics for admin/monitoring"""
    return {
        'metrics': monitor.get_current_metrics(),
        'connections': monitor.get_connection_details(),
        'history': monitor.get_performance_history()
    }