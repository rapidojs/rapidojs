import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { SchedulerService } from '../services/scheduler.service.js';
import { Cron, Interval, Timeout, SCHEDULE_METADATA_KEY } from '../decorators/schedule.decorators.js';
import { JobType } from '../interfaces/scheduler.interface.js';
import * as cron from 'node-cron';

// Mock node-cron
vi.mock('node-cron', () => ({
  schedule: vi.fn(),
}));

// Mock tsyringe container
vi.mock('tsyringe', () => ({
  container: {
    _registry: new Map(),
    resolve: vi.fn()
  }
}));

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let mockCronTask: any;

  beforeEach(() => {
    // Mock cron task
    mockCronTask = {
      start: vi.fn(),
      stop: vi.fn()
    };
    
    (cron.schedule as Mock).mockReturnValue(mockCronTask);
    
    schedulerService = new SchedulerService({
      enabled: true,
      timezone: 'Asia/Shanghai',
      enableLogging: false // 禁用日志以避免测试输出
    });
  });

  afterEach(async () => {
    await schedulerService.stop();
    vi.clearAllMocks();
  });

  describe('基本功能', () => {
    it('应该能够启动和停止调度器', async () => {
      await schedulerService.start();
      expect(schedulerService['isStarted']).toBe(true);
      
      await schedulerService.stop();
      expect(schedulerService['isStarted']).toBe(false);
    });

    it('应该能够获取所有任务', () => {
      const jobs = schedulerService.getJobs();
      expect(jobs).toBeInstanceOf(Map);
      expect(jobs.size).toBe(0);
    });
  });

  describe('Cron任务', () => {
    it('应该能够添加Cron任务', () => {
      const callback = vi.fn();
      const cronExpression = '0 0 * * *';
      
      schedulerService.addCronJob('test-cron', cronExpression, callback);
      
      expect(cron.schedule).toHaveBeenCalledWith(
        cronExpression,
        expect.any(Function),
        {
          scheduled: false,
          timezone: 'Asia/Shanghai'
        }
      );
      
      const jobs = schedulerService.getJobs();
      expect(jobs.size).toBe(1);
      
      const job = jobs.get('test-cron');
      expect(job).toBeDefined();
      expect(job?.type).toBe(JobType.CRON);
      expect(job?.expression).toBe(cronExpression);
    });

    it('应该在调度器启动时启动Cron任务', async () => {
      const callback = vi.fn();
      
      schedulerService.addCronJob('test-cron', '0 0 * * *', callback);
      await schedulerService.start();
      
      expect(mockCronTask.start).toHaveBeenCalled();
      
      const jobs = schedulerService.getJobs();
      const job = jobs.get('test-cron');
      expect(job?.isActive).toBe(true);
    });

    it('应该在停止调度器时停止Cron任务', async () => {
      const callback = vi.fn();
      
      schedulerService.addCronJob('test-cron', '0 0 * * *', callback);
      await schedulerService.start();
      await schedulerService.stop();
      
      expect(mockCronTask.stop).toHaveBeenCalled();
    });

    it('不应该允许添加重复名称的任务', () => {
      const callback = vi.fn();
      
      schedulerService.addCronJob('test-cron', '0 0 * * *', callback);
      
      expect(() => {
        schedulerService.addCronJob('test-cron', '0 1 * * *', callback);
      }).toThrow("任务 'test-cron' 已存在");
    });
  });

  describe('间隔任务', () => {
    it('应该能够添加间隔任务', () => {
      const callback = vi.fn();
      const interval = 5000;
      
      // Mock setInterval
      const mockTimer = {} as NodeJS.Timeout;
      vi.spyOn(global, 'setInterval').mockReturnValue(mockTimer);
      
      schedulerService.addIntervalJob('test-interval', interval, callback);
      
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        interval
      );
      
      const jobs = schedulerService.getJobs();
      expect(jobs.size).toBe(1);
      
      const job = jobs.get('test-interval');
      expect(job).toBeDefined();
      expect(job?.type).toBe(JobType.INTERVAL);
      expect(job?.interval).toBe(interval);
      expect(job?.isActive).toBe(true);
    });

    it('应该在停止调度器时清除间隔任务', async () => {
      const callback = vi.fn();
      const mockTimer = {} as NodeJS.Timeout;
      
      vi.spyOn(global, 'setInterval').mockReturnValue(mockTimer);
      vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
      
      schedulerService.addIntervalJob('test-interval', 5000, callback);
      await schedulerService.start(); // 先启动调度器
      await schedulerService.stop();
      
      expect(clearInterval).toHaveBeenCalledWith(mockTimer);
    });
  });

  describe('超时任务', () => {
    it('应该能够添加超时任务', () => {
      const callback = vi.fn();
      const timeout = 3000;
      
      // Mock setTimeout
      const mockTimer = {} as NodeJS.Timeout;
      vi.spyOn(global, 'setTimeout').mockReturnValue(mockTimer);
      
      schedulerService.addTimeoutJob('test-timeout', timeout, callback);
      
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        timeout
      );
      
      const jobs = schedulerService.getJobs();
      expect(jobs.size).toBe(1);
      
      const job = jobs.get('test-timeout');
      expect(job).toBeDefined();
      expect(job?.type).toBe(JobType.TIMEOUT);
      expect(job?.timeout).toBe(timeout);
      expect(job?.isActive).toBe(true);
    });

    it('应该在停止调度器时清除超时任务', async () => {
      const callback = vi.fn();
      const mockTimer = {} as NodeJS.Timeout;
      
      vi.spyOn(global, 'setTimeout').mockReturnValue(mockTimer);
      vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});
      
      schedulerService.addTimeoutJob('test-timeout', 3000, callback);
      await schedulerService.start(); // 先启动调度器
      await schedulerService.stop();
      
      expect(clearTimeout).toHaveBeenCalledWith(mockTimer);
    });
  });

  describe('任务移除', () => {
    it('应该能够移除Cron任务', () => {
      const callback = vi.fn();
      
      schedulerService.addCronJob('test-cron', '0 0 * * *', callback);
      expect(schedulerService.getJobs().size).toBe(1);
      
      schedulerService.removeJob('test-cron');
      expect(schedulerService.getJobs().size).toBe(0);
      expect(mockCronTask.stop).toHaveBeenCalled();
    });

    it('应该能够移除间隔任务', () => {
      const callback = vi.fn();
      const mockTimer = {} as NodeJS.Timeout;
      
      vi.spyOn(global, 'setInterval').mockReturnValue(mockTimer);
      vi.spyOn(global, 'clearInterval').mockImplementation(() => {});
      
      schedulerService.addIntervalJob('test-interval', 5000, callback);
      expect(schedulerService.getJobs().size).toBe(1);
      
      schedulerService.removeJob('test-interval');
      expect(schedulerService.getJobs().size).toBe(0);
      expect(clearInterval).toHaveBeenCalledWith(mockTimer);
    });

    it('应该能够移除超时任务', () => {
      const callback = vi.fn();
      const mockTimer = {} as NodeJS.Timeout;
      
      vi.spyOn(global, 'setTimeout').mockReturnValue(mockTimer);
      vi.spyOn(global, 'clearTimeout').mockImplementation(() => {});
      
      schedulerService.addTimeoutJob('test-timeout', 3000, callback);
      expect(schedulerService.getJobs().size).toBe(1);
      
      schedulerService.removeJob('test-timeout');
      expect(schedulerService.getJobs().size).toBe(0);
      expect(clearTimeout).toHaveBeenCalledWith(mockTimer);
    });

    it('移除不存在的任务应该不报错', () => {
      expect(() => {
        schedulerService.removeJob('non-existent');
      }).not.toThrow();
    });
  });
});

describe('调度装饰器', () => {
  describe('@Cron', () => {
    it('应该正确设置Cron元数据', () => {
      class TestService {
        @Cron('0 0 * * *')
        dailyTask() {
          // 测试方法
        }
      }

      const metadata = Reflect.getMetadata(SCHEDULE_METADATA_KEY, TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        type: 'cron',
        expression: '0 0 * * *',
        propertyKey: 'dailyTask'
      });
    });

    it('应该支持自定义任务名称', () => {
      class TestService {
        @Cron('0 0 * * *', { name: 'custom-daily-task' })
        dailyTask() {
          // 测试方法
        }
      }

      const metadata = Reflect.getMetadata(SCHEDULE_METADATA_KEY, TestService);
      expect(metadata[0].name).toBe('custom-daily-task');
    });
  });

  describe('@Interval', () => {
    it('应该正确设置间隔元数据', () => {
      class TestService {
        @Interval(5000)
        periodicTask() {
          // 测试方法
        }
      }

      const metadata = Reflect.getMetadata(SCHEDULE_METADATA_KEY, TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        type: 'interval',
        interval: 5000,
        propertyKey: 'periodicTask'
      });
    });
  });

  describe('@Timeout', () => {
    it('应该正确设置超时元数据', () => {
      class TestService {
        @Timeout(3000)
        delayedTask() {
          // 测试方法
        }
      }

      const metadata = Reflect.getMetadata(SCHEDULE_METADATA_KEY, TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]).toMatchObject({
        type: 'timeout',
        timeout: 3000,
        propertyKey: 'delayedTask'
      });
    });
  });

  describe('多个装饰器', () => {
    it('应该支持在同一个类中使用多个调度装饰器', () => {
      class TestService {
        @Cron('0 0 * * *')
        dailyTask() {
          // 每日任务
        }

        @Interval(60000)
        minutelyTask() {
          // 每分钟任务
        }

        @Timeout(5000)
        startupTask() {
          // 启动延时任务
        }
      }

      const metadata = Reflect.getMetadata(SCHEDULE_METADATA_KEY, TestService);
      expect(metadata).toBeDefined();
      expect(metadata).toHaveLength(3);
      
      const cronTask = metadata.find((m: any) => m.type === 'cron');
      const intervalTask = metadata.find((m: any) => m.type === 'interval');
      const timeoutTask = metadata.find((m: any) => m.type === 'timeout');
      
      expect(cronTask).toBeDefined();
      expect(intervalTask).toBeDefined();
      expect(timeoutTask).toBeDefined();
    });
  });
});