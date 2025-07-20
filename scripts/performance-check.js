#!/usr/bin/env node

// scripts/performance-check.js - Performance monitoring and alerting

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Performance thresholds
const THRESHOLDS = {
  responseTime: 2000,      // 2 seconds
  memoryUsage: 500,        // 500MB
  errorRate: 5,            // 5%
  connectionCount: 100     // 100 concurrent connections
};

class PerformanceChecker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      frontend: {},
      backend: {},
      overall: { status: 'unknown', issues: [] }
    };
  }

  async checkFrontendPerformance() {
    console.log('🔍 Checking frontend performance...');
    
    try {
      const startTime = Date.now();
      const response = await fetch(FRONTEND_URL, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      this.results.frontend = {
        status: response.ok ? 'healthy' : 'error',
        responseTime,
        statusCode: response.status,
        accessible: response.ok
      };
      
      if (responseTime > THRESHOLDS.responseTime) {
        this.results.overall.issues.push(`Frontend slow: ${responseTime}ms`);
      }
      
      console.log(`✅ Frontend: ${responseTime}ms (Status: ${response.status})`);
      
    } catch (error) {
      console.error(`❌ Frontend check failed: ${error.message}`);
      this.results.frontend = {
        status: 'error',
        error: error.message,
        accessible: false
      };
      this.results.overall.issues.push('Frontend inaccessible');
    }
  }

  async checkBackendPerformance() {
    console.log('🔍 Checking backend performance...');
    
    try {
      // Check health endpoint
      const startTime = Date.now();
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        
        this.results.backend = {
          status: 'healthy',
          responseTime,
          health: healthData,
          accessible: true
        };
        
        // Check performance metrics if available
        await this.checkPerformanceMetrics();
        
        console.log(`✅ Backend: ${responseTime}ms`);
        
      } else {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Backend check failed: ${error.message}`);
      this.results.backend = {
        status: 'error',
        error: error.message,
        accessible: false
      };
      this.results.overall.issues.push('Backend inaccessible');
    }
  }

  async checkPerformanceMetrics() {
    try {
      // Try to get detailed performance metrics (admin endpoint)
      const metricsResponse = await fetch(`${BACKEND_URL}/api/admin/performance/metrics`, {
        timeout: 3000,
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN || 'test_token'}`
        }
      });
      
      if (metricsResponse.ok) {
        const metrics = await metricsResponse.json();
        
        // Check memory usage
        if (metrics.system?.memory_usage_mb > THRESHOLDS.memoryUsage) {
          this.results.overall.issues.push(
            `High memory usage: ${metrics.system.memory_usage_mb}MB`
          );
        }
        
        // Check error rate
        if (metrics.system?.error_rate_percent > THRESHOLDS.errorRate) {
          this.results.overall.issues.push(
            `High error rate: ${metrics.system.error_rate_percent}%`
          );
        }
        
        // Check connection count
        if (metrics.sse?.active_connections > THRESHOLDS.connectionCount) {
          this.results.overall.issues.push(
            `High connection count: ${metrics.sse.active_connections}`
          );
        }
        
        this.results.backend.metrics = metrics;
        console.log('📊 Performance metrics retrieved');
        
      }
    } catch (error) {
      console.log('⚠️  Performance metrics not available (requires admin access)');
    }
  }

  async checkDatabaseConnection() {
    console.log('🔍 Checking database connection...');
    
    try {
      const dbResponse = await fetch(`${BACKEND_URL}/api/health/db`, { timeout: 5000 });
      
      if (dbResponse.ok) {
        const dbData = await dbResponse.json();
        this.results.backend.database = {
          status: 'connected',
          details: dbData
        };
        console.log('✅ Database: Connected');
      } else {
        throw new Error(`Database check failed: ${dbResponse.status}`);
      }
      
    } catch (error) {
      console.error(`❌ Database check failed: ${error.message}`);
      this.results.backend.database = {
        status: 'error',
        error: error.message
      };
      this.results.overall.issues.push('Database connection issue');
    }
  }

  async checkExternalServices() {
    console.log('🔍 Checking external services...');
    
    // Check Steam API (if configured)
    try {
      const steamResponse = await fetch(`${BACKEND_URL}/api/steam/health`, { timeout: 3000 });
      
      this.results.backend.steam = {
        status: steamResponse.ok ? 'connected' : 'error',
        statusCode: steamResponse.status
      };
      
      if (!steamResponse.ok) {
        this.results.overall.issues.push('Steam API issues');
      }
      
      console.log(`${steamResponse.ok ? '✅' : '❌'} Steam API: ${steamResponse.status}`);
      
    } catch (error) {
      console.log('⚠️  Steam API check not available');
    }
  }

  generateReport() {
    // Determine overall status
    if (this.results.overall.issues.length === 0) {
      this.results.overall.status = 'healthy';
    } else if (this.results.overall.issues.length <= 2) {
      this.results.overall.status = 'warning';
    } else {
      this.results.overall.status = 'critical';
    }
    
    // Create report
    const report = {
      summary: {
        status: this.results.overall.status,
        timestamp: this.results.timestamp,
        issues_found: this.results.overall.issues.length,
        issues: this.results.overall.issues
      },
      details: this.results
    };
    
    return report;
  }

  async saveReport(report) {
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }
    
    const filename = `performance-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📁 Report saved: ${filepath}`);
    
    return filepath;
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE CHECK SUMMARY');
    console.log('='.repeat(60));
    
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      critical: '🚨',
      unknown: '❓'
    };
    
    console.log(`Status: ${statusEmoji[report.summary.status]} ${report.summary.status.toUpperCase()}`);
    console.log(`Timestamp: ${report.summary.timestamp}`);
    console.log(`Issues Found: ${report.summary.issues_found}`);
    
    if (report.summary.issues.length > 0) {
      console.log('\nIssues:');
      report.summary.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    console.log('\nComponent Status:');
    console.log(`  Frontend: ${this.results.frontend.status || 'unknown'}`);
    console.log(`  Backend: ${this.results.backend.status || 'unknown'}`);
    console.log(`  Database: ${this.results.backend.database?.status || 'unknown'}`);
    
    console.log('='.repeat(60));
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting performance check...\n');
  
  const checker = new PerformanceChecker();
  
  await checker.checkFrontendPerformance();
  await checker.checkBackendPerformance();
  await checker.checkDatabaseConnection();
  await checker.checkExternalServices();
  
  const report = checker.generateReport();
  const reportPath = await checker.saveReport(report);
  
  checker.printSummary(report);
  
  // Exit with error code if critical issues found
  if (report.summary.status === 'critical') {
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Performance check failed:', error);
    process.exit(1);
  });
}