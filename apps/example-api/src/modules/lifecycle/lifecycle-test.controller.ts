import { Controller, Get } from '@rapidojs/common';
import { LifecycleTestService } from './lifecycle-test.service.js';

@Controller('lifecycle')
export class LifecycleTestController {
  constructor(private readonly lifecycleService: LifecycleTestService) {}

  @Get('status')
  getStatus(): { 
    service: {
      message: string;
      bootstrapCalled: boolean;
      shutdownCalled: boolean;
      bootstrapTime?: string;
    };
    timestamp: string;
  } {
    return {
      service: this.lifecycleService.getStatus(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('info')
  getInfo(): { 
    description: string; 
    hooks: string[];
    endpoints: string[];
  } {
    return {
      description: 'Lifecycle Test Module - demonstrates OnApplicationBootstrap and BeforeApplicationShutdown hooks',
      hooks: [
        'OnApplicationBootstrap - called when application starts',
        'BeforeApplicationShutdown - called when application shuts down'
      ],
      endpoints: [
        'GET /lifecycle/status - Check service status',
        'GET /lifecycle/info - Get module information'
      ]
    };
  }
}