import { Controller, Get } from '@rapidojs/common';
import { HealthService } from './health.service.js';

/**
 * Health check controller providing application health status endpoints
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * @returns Health status information
   */
  @Get()
  async check() {
    return this.healthService.check();
  }

  /**
   * Detailed health check endpoint with system information
   * @returns Detailed health status and system metrics
   */
  @Get('detailed')
  async detailedCheck() {
    return this.healthService.detailedCheck();
  }

  /**
   * Readiness probe endpoint for container orchestration
   * @returns Readiness status
   */
  @Get('ready')
  async ready() {
    return this.healthService.readinessCheck();
  }

  /**
   * Liveness probe endpoint for container orchestration
   * @returns Liveness status
   */
  @Get('live')
  async live() {
    return this.healthService.livenessCheck();
  }
}