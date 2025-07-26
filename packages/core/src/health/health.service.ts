import { Injectable } from '@rapidojs/common';
import * as os from 'os';
import * as process from 'process';

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version?: string;
  environment?: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    memory: {
      used: number;
      total: number;
      free: number;
      usage: string;
    };
    cpu: {
      count: number;
      model: string;
      load: number[];
    };
  };
  process: {
    pid: number;
    memory: NodeJS.MemoryUsage;
    cpu: {
      user: number;
      system: number;
    };
  };
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'ok' | 'error';
      message?: string;
    };
  };
}

export interface LivenessStatus {
  status: 'alive' | 'dead';
  timestamp: string;
  uptime: number;
}

type ReadinessCheckFunction = () => Promise<{ status: 'ok' | 'error'; message?: string }>;

/**
 * Health check service providing various health status endpoints
 */
@Injectable()
export class HealthService {
  private readonly startTime = Date.now();
  private readonly readinessChecks = new Map<string, ReadinessCheckFunction>();

  /**
   * Basic health check
   */
  async check(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Detailed health check with system information
   */
  async detailedCheck(): Promise<DetailedHealthStatus> {
    const basicHealth = await this.check();
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuUsage = process.cpuUsage();

    return {
      ...basicHealth,
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        memory: {
          used: usedMemory,
          total: totalMemory,
          free: freeMemory,
          usage: `${((usedMemory / totalMemory) * 100).toFixed(2)}%`
        },
        cpu: {
          count: os.cpus().length,
          model: os.cpus()[0]?.model || 'Unknown',
          load: os.loadavg()
        }
      },
      process: {
        pid: process.pid,
        memory: memoryUsage,
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      }
    };
  }

  /**
   * Readiness check - indicates if the application is ready to serve traffic
   */
  async readinessCheck(): Promise<ReadinessStatus> {
    const checks: ReadinessStatus['checks'] = {};
    let overallStatus: 'ready' | 'not_ready' = 'ready';

    // Execute all registered readiness checks
    for (const [name, checkFn] of this.readinessChecks) {
      try {
        const result = await checkFn();
        checks[name] = result;
        if (result.status === 'error') {
          overallStatus = 'not_ready';
        }
      } catch (error) {
        checks[name] = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        };
        overallStatus = 'not_ready';
      }
    }

    // Default basic checks if no custom checks are registered
    if (this.readinessChecks.size === 0) {
      checks.basic = {
        status: 'ok',
        message: 'Application is running'
      };
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks
    };
  }

  /**
   * Liveness check - indicates if the application is alive and responsive
   */
  async livenessCheck(): Promise<LivenessStatus> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: this.getUptime()
    };
  }

  /**
   * Register a custom readiness check
   * @param name - Name of the check
   * @param checkFn - Function that performs the check
   */
  registerReadinessCheck(
    name: string,
    checkFn: ReadinessCheckFunction
  ): void {
    this.readinessChecks.set(name, checkFn);
  }

  /**
   * Unregister a readiness check
   * @param name - Name of the check to remove
   */
  unregisterReadinessCheck(name: string): void {
    this.readinessChecks.delete(name);
  }

  /**
   * Get application uptime in seconds
   */
  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}