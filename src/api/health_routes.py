from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from .performance_monitor import monitor, get_health_status, get_detailed_metrics
from .models import User
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def basic_health():
    """
    Basic health check endpoint - always accessible
    Returns simple status for load balancers/uptime monitoring
    """
    try:
        # Quick database test
        start_time = time.time()
        user_count = User.query.count()
        db_time = (time.time() - start_time) * 1000
        
        # Track the database query
        monitor.track_database_query(db_time)
        
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time(),
            'database': 'connected',
            'user_count': user_count,
            'uptime_seconds': int(time.time() - monitor.metrics['start_time']),
            'version': '1.0.0'
        }), 200
        
    except Exception as e:
        monitor.track_error('health_check_error')
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': time.time()
        }), 503

@health_bp.route('/health/detailed', methods=['GET'])
@jwt_required()
def detailed_health():
    """
    Detailed health metrics - requires authentication
    Returns comprehensive system performance data
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check if user has admin privileges (you can modify this check)
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        metrics = get_detailed_metrics()
        
        return jsonify({
            'status': 'success',
            'data': metrics,
            'requested_by': user.display_name,
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        monitor.track_error('detailed_health_error')
        return jsonify({
            'status': 'error',
            'error': str(e),
            'timestamp': time.time()
        }), 500

@health_bp.route('/metrics', methods=['GET'])
def public_metrics():
    """
    Public metrics endpoint for monitoring dashboards
    Returns sanitized performance data without sensitive info
    """
    try:
        metrics = monitor.get_current_metrics()
        
        # Return sanitized metrics (remove sensitive connection details)
        public_data = {
            'system': {
                'status': metrics['health_status']['status'],
                'uptime_seconds': metrics['system']['uptime_seconds'],
                'memory_usage_mb': metrics['system']['memory_usage_mb']
            },
            'activity': {
                'active_sessions': metrics['sse']['active_sessions'],
                'total_connections': metrics['sse']['active_connections'],
                'events_per_second': metrics['sse']['events_per_second']
            },
            'performance': {
                'avg_response_time_ms': metrics['performance']['avg_request_time_ms'],
                'total_requests': metrics['performance']['total_requests'],
                'error_rate_percent': metrics['system']['error_rate_percent']
            },
            'timestamp': metrics['timestamp']
        }
        
        return jsonify({
            'status': 'success',
            'metrics': public_data
        }), 200
        
    except Exception as e:
        monitor.track_error('metrics_error')
        return jsonify({
            'status': 'error',
            'error': 'Failed to retrieve metrics'
        }), 500

@health_bp.route('/health/connections', methods=['GET'])
@jwt_required()
def connection_status():
    """
    SSE connection status - admin only
    Shows detailed connection information
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        connections = monitor.get_connection_details()
        
        return jsonify({
            'status': 'success',
            'data': connections,
            'summary': {
                'total_connections': connections['total_connections'],
                'active_sessions': len(connections['sessions']),
                'avg_users_per_session': (
                    sum(session['user_count'] for session in connections['sessions'].values()) / 
                    len(connections['sessions']) if connections['sessions'] else 0
                )
            }
        }), 200
        
    except Exception as e:
        monitor.track_error('connection_status_error')
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@health_bp.route('/health/reset', methods=['POST'])
@jwt_required()
def reset_metrics():
    """
    Reset performance counters - admin only
    Useful for clearing metrics after maintenance
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Reset error counters and metrics
        monitor.metrics['error_count'] = 0
        monitor.metrics['total_requests'] = 0
        monitor.metrics['start_time'] = time.time()
        monitor.error_window.clear()
        monitor.request_times.clear()
        monitor.metrics['db_query_times'].clear()
        monitor.metrics['steam_api_times'].clear()
        
        return jsonify({
            'status': 'success',
            'message': 'Performance metrics reset',
            'reset_by': user.display_name,
            'timestamp': time.time()
        }), 200
        
    except Exception as e:
        monitor.track_error('reset_metrics_error')
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@health_bp.route('/health/test-load', methods=['POST'])
@jwt_required()
def test_load():
    """
    Load testing endpoint - admin only
    Simulate system load for testing monitoring
    """
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        
        # Get test parameters
        data = request.get_json() or {}
        test_type = data.get('type', 'basic')
        duration = min(data.get('duration', 10), 60)  # Max 60 seconds
        
        results = {}
        
        if test_type == 'database':
            # Simulate database load
            start_time = time.time()
            for i in range(duration * 2):  # 2 queries per second
                query_start = time.time()
                User.query.count()
                query_time = (time.time() - query_start) * 1000
                monitor.track_database_query(query_time)
                time.sleep(0.5)
            
            results['test'] = f'Database load test - {duration * 2} queries'
            
        elif test_type == 'events':
            # Simulate SSE events
            for i in range(duration * 5):  # 5 events per second
                monitor.track_sse_event('test_event', 10)
                time.sleep(0.2)
            
            results['test'] = f'SSE event load test - {duration * 5} events'
            
        elif test_type == 'errors':
            # Simulate errors
            for i in range(min(duration, 10)):  # Max 10 errors
                monitor.track_error('test_error')
                time.sleep(1)
            
            results['test'] = f'Error simulation - {min(duration, 10)} errors'
        
        else:
            # Basic mixed load
            for i in range(duration):
                monitor.track_request(50 + (i * 10))  # Increasing response times
                monitor.track_sse_event('test_event', 15)
                if i % 5 == 0:
                    monitor.track_database_query(25)
                time.sleep(1)
            
            results['test'] = f'Mixed load test - {duration} seconds'
        
        return jsonify({
            'status': 'success',
            'message': 'Load test completed',
            'results': results,
            'current_metrics': monitor.get_current_metrics()['performance'],
            'tested_by': user.display_name
        }), 200
        
    except Exception as e:
        monitor.track_error('load_test_error')
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500