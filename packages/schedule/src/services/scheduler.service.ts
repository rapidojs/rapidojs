import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from '@rapidojs/common';
import { container } from 'tsyringe';
import * as cron from 'node-cron';
import { IScheduler, JobType, JobInfo, SchedulerConfig } from '../interfaces/scheduler.interface.js';
import { SCHEDULE_METADATA_KEY, ScheduleMetadata, ScheduleType } from '../decorators/schedule.decorators.js';

/**
 * 调度器服务
 * 负责管理和执行所有的定时任务
 */
@Injectable()
export class SchedulerService implements IScheduler, OnApplicationBootstrap, BeforeApplicationShutdown {
  private jobs = new Map<string, JobInfo>();
  private cronJobs = new Map<string, cron.ScheduledTask>();
  private intervalJobs = new Map<string, NodeJS.Timeout>();
  private timeoutJobs = new Map<string, NodeJS.Timeout>();
  private isStarted = false;
  private config: SchedulerConfig;

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      enabled: true,
      timezone: 'Asia/Shanghai',
      maxConcurrentJobs: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: true,
      ...config
    };
  }

  /**
   * 应用启动时自动扫描并注册所有调度任务
   */
  async onApplicationBootstrap(): Promise<void> {
    if (!this.config.enabled) {
      this.log('调度器已禁用，跳过任务注册');
      return;
    }

    this.log('开始扫描和注册调度任务...');
    await this.scanAndRegisterJobs();
    await this.start();
    this.log(`调度器启动完成，共注册 ${this.jobs.size} 个任务`);
  }

  /**
   * 应用关闭前停止所有任务
   */
  async beforeApplicationShutdown(): Promise<void> {
    this.log('正在停止调度器...');
    await this.stop();
    this.log('调度器已停止');
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      this.log('调度器已经启动');
      return;
    }

    // 启动所有已添加的Cron任务
    for (const [name, task] of this.cronJobs) {
      task.start();
      const jobInfo = this.jobs.get(name);
      if (jobInfo) {
        jobInfo.isActive = true;
      }
      this.log(`启动Cron任务: ${name}`);
    }

    this.isStarted = true;
    this.log('调度器启动成功');
  }

  /**
   * 停止调度器
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    // 停止所有Cron任务
    for (const [name, task] of this.cronJobs) {
      task.stop();
      this.log(`停止Cron任务: ${name}`);
    }
    this.cronJobs.clear();

    // 清除所有间隔任务
    for (const [name, timer] of this.intervalJobs) {
      clearInterval(timer);
      this.log(`停止间隔任务: ${name}`);
    }
    this.intervalJobs.clear();

    // 清除所有超时任务
    for (const [name, timer] of this.timeoutJobs) {
      clearTimeout(timer);
      this.log(`停止超时任务: ${name}`);
    }
    this.timeoutJobs.clear();

    this.jobs.clear();
    this.isStarted = false;
  }

  /**
   * 注册Cron任务
   */
  addCronJob(name: string, cronExpression: string, callback: () => void | Promise<void>): void {
    if (this.jobs.has(name)) {
      throw new Error(`任务 '${name}' 已存在`);
    }

    const jobInfo: JobInfo = {
      name,
      type: JobType.CRON,
      expression: cronExpression,
      callback,
      isActive: false,
      createdAt: new Date()
    };

    const task = cron.schedule(cronExpression, async () => {
      await this.executeJob(jobInfo);
    }, {
      scheduled: false,
      timezone: this.config.timezone
    });

    this.jobs.set(name, jobInfo);
    this.cronJobs.set(name, task);

    if (this.isStarted) {
      task.start();
      jobInfo.isActive = true;
      this.log(`Cron任务 '${name}' 已启动: ${cronExpression}`);
    }
  }

  /**
   * 注册间隔任务
   */
  addIntervalJob(name: string, interval: number, callback: () => void | Promise<void>): void {
    if (this.jobs.has(name)) {
      throw new Error(`任务 '${name}' 已存在`);
    }

    const jobInfo: JobInfo = {
      name,
      type: JobType.INTERVAL,
      interval,
      callback,
      isActive: false,
      createdAt: new Date()
    };

    const timer = setInterval(async () => {
      await this.executeJob(jobInfo);
    }, interval);

    this.jobs.set(name, jobInfo);
    this.intervalJobs.set(name, timer);
    jobInfo.isActive = true;

    this.log(`间隔任务 '${name}' 已启动: ${interval}ms`);
  }

  /**
   * 注册超时任务
   */
  addTimeoutJob(name: string, timeout: number, callback: () => void | Promise<void>): void {
    if (this.jobs.has(name)) {
      throw new Error(`任务 '${name}' 已存在`);
    }

    const jobInfo: JobInfo = {
      name,
      type: JobType.TIMEOUT,
      timeout,
      callback,
      isActive: false,
      createdAt: new Date()
    };

    const timer = setTimeout(async () => {
      await this.executeJob(jobInfo);
      // 超时任务执行完后自动移除
      this.removeJob(name);
    }, timeout);

    this.jobs.set(name, jobInfo);
    this.timeoutJobs.set(name, timer);
    jobInfo.isActive = true;

    this.log(`超时任务 '${name}' 已启动: ${timeout}ms`);
  }

  /**
   * 移除任务
   */
  removeJob(name: string): void {
    const jobInfo = this.jobs.get(name);
    if (!jobInfo) {
      return;
    }

    // 根据任务类型停止相应的任务
    switch (jobInfo.type) {
      case JobType.CRON:
        const cronTask = this.cronJobs.get(name);
        if (cronTask) {
          cronTask.stop();
          this.cronJobs.delete(name);
        }
        break;
      case JobType.INTERVAL:
        const intervalTimer = this.intervalJobs.get(name);
        if (intervalTimer) {
          clearInterval(intervalTimer);
          this.intervalJobs.delete(name);
        }
        break;
      case JobType.TIMEOUT:
        const timeoutTimer = this.timeoutJobs.get(name);
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          this.timeoutJobs.delete(name);
        }
        break;
    }

    this.jobs.delete(name);
    this.log(`任务 '${name}' 已移除`);
  }

  /**
   * 获取所有任务
   */
  getJobs(): Map<string, JobInfo> {
    return new Map(this.jobs);
  }

  /**
   * 扫描并注册所有带有调度装饰器的方法
   */
  private async scanAndRegisterJobs(): Promise<void> {
    // 获取所有已注册的服务
    const registrations = (container as any)._registry;
    
    for (const [token, registration] of registrations) {
      if (typeof token === 'string' || typeof token === 'symbol') {
        try {
          const instance = container.resolve(token) as any;
          const constructor = instance.constructor;
          
          // 获取调度元数据
          const scheduleMetadata: (ScheduleMetadata & { propertyKey: string })[] = 
            Reflect.getMetadata(SCHEDULE_METADATA_KEY, constructor) || [];
          
          for (const metadata of scheduleMetadata) {
            const method = instance[metadata.propertyKey];
            if (typeof method === 'function') {
              await this.registerJobFromMetadata(instance, metadata, method.bind(instance));
            }
          }
        } catch (error) {
          // 忽略解析失败的服务
        }
      }
    }
  }

  /**
   * 根据元数据注册任务
   */
  private async registerJobFromMetadata(
    instance: any,
    metadata: ScheduleMetadata & { propertyKey: string },
    callback: () => void | Promise<void>
  ): Promise<void> {
    const jobName = metadata.name || `${instance.constructor.name}.${metadata.propertyKey}`;

    try {
      switch (metadata.type) {
        case ScheduleType.CRON:
          if (metadata.expression) {
            this.addCronJob(jobName, metadata.expression, callback);
          }
          break;
        case ScheduleType.INTERVAL:
          if (metadata.interval) {
            this.addIntervalJob(jobName, metadata.interval, callback);
          }
          break;
        case ScheduleType.TIMEOUT:
          if (metadata.timeout) {
            this.addTimeoutJob(jobName, metadata.timeout, callback);
          }
          break;
      }
    } catch (error) {
      this.log(`注册任务失败 '${jobName}': ${error}`, 'error');
    }
  }

  /**
   * 执行任务
   */
  private async executeJob(jobInfo: JobInfo): Promise<void> {
    const startTime = Date.now();
    jobInfo.lastRunAt = new Date();

    try {
      this.log(`开始执行任务: ${jobInfo.name}`);
      await jobInfo.callback();
      const duration = Date.now() - startTime;
      this.log(`任务执行完成: ${jobInfo.name} (耗时: ${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`任务执行失败: ${jobInfo.name} (耗时: ${duration}ms) - ${error}`, 'error');
      
      // 可以在这里实现重试逻辑
      if (this.config.retryAttempts && this.config.retryAttempts > 0) {
        // TODO: 实现重试逻辑
      }
    }
  }

  /**
   * 记录日志
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (!this.config.enableLogging) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[SchedulerService] ${timestamp}`;
    
    if (level === 'error') {
      console.error(`${prefix} ERROR: ${message}`);
    } else {
      console.log(`${prefix} INFO: ${message}`);
    }
  }
}