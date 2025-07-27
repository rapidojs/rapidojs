import { Module } from '@rapidojs/common';
import { SchedulerService } from './services/scheduler.service.js';
import { SchedulerConfig } from './interfaces/scheduler.interface.js';

/**
 * 调度模块
 * 提供任务调度功能
 */
@Module({
  providers: [
    {
      provide: 'SCHEDULER_CONFIG',
      useValue: {} as SchedulerConfig
    },
    SchedulerService
  ],
  exports: [SchedulerService]
})
export class ScheduleModule {
  /**
   * 使用自定义配置创建调度模块
   */
  static forRoot(config: SchedulerConfig = {}): any {
    return {
      module: ScheduleModule,
      providers: [
        {
          provide: 'SCHEDULER_CONFIG',
          useValue: config
        },
        {
          provide: SchedulerService,
          useFactory: () => new SchedulerService(config)
        }
      ],
      exports: [SchedulerService]
    };
  }

  /**
   * 异步配置调度模块
   */
  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<SchedulerConfig> | SchedulerConfig;
    inject?: any[];
  }): any {
    return {
      module: ScheduleModule,
      providers: [
        {
          provide: 'SCHEDULER_CONFIG',
          useFactory: options.useFactory,
          inject: options.inject || []
        },
        {
          provide: SchedulerService,
          useFactory: (config: SchedulerConfig) => new SchedulerService(config),
          inject: ['SCHEDULER_CONFIG']
        }
      ],
      exports: [SchedulerService]
    };
  }
}