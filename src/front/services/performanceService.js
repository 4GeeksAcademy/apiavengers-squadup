// performanceService.js - Real-time Performance Monitoring & Alerting

class PerformanceService {
  constructor() {
    this.metrics = {
      userConnections: 0,
      activeSessions: 0,
      steamApiResponseTimes: [],
      voteProcessingTimes: [],
      errorRate: 0,
      memoryUsage: 0,
      totalRequests: 0,
      totalErrors: 0
    };

    this.alerts = [];
    this.isMonitoring = false;
    
    // Start monitoring if in browser environment
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  // Alert thresholds
  static ALERT_THRESHOLDS = {
    memory: 80, // % usage
    responseTime: 3000, // ms
    errorRate: 10 // %
  };

  // Start real-time monitoring
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor memory usage every 30 seconds
    setInterval(() => {
      this.updateMemoryUsage();
    }, 30000);

    // Clean old metrics every 5 minutes
    setInterval(() => {
      this.cleanOldMetrics();
    }, 300000);

    console.log('🚀 Performance monitoring started');
  }

  // Track user connections
  updateUserConnections(count) {
    this.metrics.userConnections = count;
    this.checkAlerts();
  }

  // Track active gaming sessions
  updateActiveSessions(count) {
    this.metrics.activeSessions = count;
  }

  // Track Steam API performance
  trackSteamApiCall(responseTime, success = true) {
    this.metrics.steamApiResponseTimes.push({
      time: Date.now(),
      responseTime,
      success
    });

    // Keep only last 100 measurements
    if (this.metrics.steamApiResponseTimes.length > 100) {
      this.metrics.steamApiResponseTimes = this.metrics.steamApiResponseTimes.slice(-100);
    }

    this.updateErrorRate(success);
    this.checkResponseTimeAlert(responseTime);
  }

  // Track vote processing performance
  trackVoteProcessing(responseTime, success = true) {
    this.metrics.voteProcessingTimes.push({
      time: Date.now(),
      responseTime,
      success
    });

    // Keep only last 100 measurements
    if (this.metrics.voteProcessingTimes.length > 100) {
      this.metrics.voteProcessingTimes = this.metrics.voteProcessingTimes.slice(-100);
    }

    this.updateErrorRate(success);
  }

  // Track JWT token refresh performance
  trackTokenRefresh(success, responseTime) {
    this.trackGenericPerformance('token_refresh', responseTime, success);
  }

  // Generic performance tracking
  trackGenericPerformance(operation, responseTime, success = true) {
    this.metrics.totalRequests++;
    
    if (!success) {
      this.metrics.totalErrors++;
    }

    this.updateErrorRate(success);
    this.checkResponseTimeAlert(responseTime, operation);
  }

  // Update memory usage (browser-based estimation)
  updateMemoryUsage() {
    if (typeof performance !== 'undefined' && performance.memory) {
      const memory = performance.memory;
      this.metrics.memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.checkMemoryAlert();
    }
  }

  // Update error rate
  updateErrorRate(success) {
    if (this.metrics.totalRequests > 0) {
      this.metrics.errorRate = (this.metrics.totalErrors / this.metrics.totalRequests) * 100;
      this.checkErrorRateAlert();
    }
  }

  // Check for memory alerts
  checkMemoryAlert() {
    if (this.metrics.memoryUsage > PerformanceService.ALERT_THRESHOLDS.memory) {
      this.createAlert('HIGH_MEMORY_USAGE', {
        current: this.metrics.memoryUsage.toFixed(2),
        threshold: PerformanceService.ALERT_THRESHOLDS.memory
      });
    }
  }

  // Check for response time alerts
  checkResponseTimeAlert(responseTime, operation = 'api_call') {
    if (responseTime > PerformanceService.ALERT_THRESHOLDS.responseTime) {
      this.createAlert('HIGH_RESPONSE_TIME', {
        operation,
        responseTime,
        threshold: PerformanceService.ALERT_THRESHOLDS.responseTime
      });
    }
  }

  // Check for error rate alerts
  checkErrorRateAlert() {
    if (this.metrics.errorRate > PerformanceService.ALERT_THRESHOLDS.errorRate) {
      this.createAlert('HIGH_ERROR_RATE', {
        current: this.metrics.errorRate.toFixed(2),
        threshold: PerformanceService.ALERT_THRESHOLDS.errorRate
      });
    }
  }

  // Create alert
  createAlert(type, data) {
    const alert = {
      id: Date.now(),
      type,
      data,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.warn('🚨 Performance Alert:', alert);
    
    // Trigger custom event for UI components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performanceAlert', {
        detail: alert
      }));
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      averageSteamResponseTime: this.getAverageResponseTime('steam'),
      averageVoteProcessingTime: this.getAverageResponseTime('vote'),
      alerts: this.alerts.filter(alert => !alert.acknowledged)
    };
  }

  // Get average response time
  getAverageResponseTime(type) {
    const times = type === 'steam' 
      ? this.metrics.steamApiResponseTimes 
      : this.metrics.voteProcessingTimes;
    
    if (times.length === 0) return 0;
    
    const sum = times.reduce((acc, item) => acc + item.responseTime, 0);
    return Math.round(sum / times.length);
  }

  // Clean old metrics (older than 1 hour)
  cleanOldMetrics() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    this.metrics.steamApiResponseTimes = this.metrics.steamApiResponseTimes
      .filter(item => item.time > oneHourAgo);
    
    this.metrics.voteProcessingTimes = this.metrics.voteProcessingTimes
      .filter(item => item.time > oneHourAgo);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  // Check all alerts
  checkAlerts() {
    this.checkMemoryAlert();
    this.checkErrorRateAlert();
  }

  // Get system health status
  getHealthStatus() {
    const metrics = this.getMetrics();
    
    const status = {
      overall: 'healthy',
      checks: {
        memory: metrics.memoryUsage < PerformanceService.ALERT_THRESHOLDS.memory,
        responseTime: metrics.averageSteamResponseTime < PerformanceService.ALERT_THRESHOLDS.responseTime,
        errorRate: metrics.errorRate < PerformanceService.ALERT_THRESHOLDS.errorRate
      }
    };

    // Determine overall status
    const failedChecks = Object.values(status.checks).filter(check => !check).length;
    
    if (failedChecks === 0) {
      status.overall = 'healthy';
    } else if (failedChecks === 1) {
      status.overall = 'warning';
    } else {
      status.overall = 'critical';
    }

    return status;
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

export default performanceService;