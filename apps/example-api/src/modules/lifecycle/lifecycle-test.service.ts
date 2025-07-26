import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown, LoggerService } from '@rapidojs/common';

@Injectable()
export class LifecycleTestService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new LoggerService('LifecycleTestService');
  private bootstrapCalled = false;
  private shutdownCalled = false;
  private bootstrapTime?: Date;

  async onApplicationBootstrap(): Promise<void> {
    this.bootstrapCalled = true;
    this.bootstrapTime = new Date();
    this.logger.log('🚀 Application bootstrap completed! LifecycleTestService is ready.');
    this.logger.log('✅ OnApplicationBootstrap lifecycle hook executed successfully.');
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.shutdownCalled = true;
    this.logger.log('🛑 Application is shutting down. Cleaning up resources...');
    this.logger.log('✅ BeforeApplicationShutdown lifecycle hook executed successfully.');
    
    // Simulate cleanup work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.logger.log('🧹 Cleanup completed.');
  }

  getStatus(): { 
    message: string;
    bootstrapCalled: boolean;
    shutdownCalled: boolean;
    bootstrapTime?: string;
  } {
    return {
      message: 'LifecycleTestService is running',
      bootstrapCalled: this.bootstrapCalled,
      shutdownCalled: this.shutdownCalled,
      bootstrapTime: this.bootstrapTime?.toISOString()
    };
  }
}