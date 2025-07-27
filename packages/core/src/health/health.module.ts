import { Module } from '@rapidojs/common';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

/**
 * Health check module providing health status endpoints
 * 
 * This module can be imported into your application to enable health check endpoints:
 * - GET /health - Basic health check
 * - GET /health/detailed - Detailed health check with system information
 * - GET /health/ready - Readiness probe for container orchestration
 * - GET /health/live - Liveness probe for container orchestration
 * 
 * @example
 * ```typescript
 * import { Module } from '@rapidojs/common';
 * import { HealthModule } from '@rapidojs/core';
 * 
 * @Module({
 *   imports: [HealthModule],
 *   // ... other module configuration
 * })
 * export class AppModule {}
 * ```
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService]
})
export class HealthModule {}