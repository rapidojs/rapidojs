/**
 * 任务调度器接口
 * 定义了任务调度的核心方法
 */
export interface IScheduler {
  /**
   * 启动调度器
   */
  start(): Promise<void>;

  /**
   * 停止调度器
   */
  stop(): Promise<void>;

  /**
   * 注册Cron任务
   * @param name 任务名称
   * @param cronExpression Cron表达式
   * @param callback 回调函数
   */
  addCronJob(name: string, cronExpression: string, callback: () => void | Promise<void>): void;

  /**
   * 注册间隔任务
   * @param name 任务名称
   * @param interval 间隔时间（毫秒）
   * @param callback 回调函数
   */
  addIntervalJob(name: string, interval: number, callback: () => void | Promise<void>): void;

  /**
   * 注册超时任务
   * @param name 任务名称
   * @param timeout 超时时间（毫秒）
   * @param callback 回调函数
   */
  addTimeoutJob(name: string, timeout: number, callback: () => void | Promise<void>): void;

  /**
   * 移除任务
   * @param name 任务名称
   */
  removeJob(name: string): void;

  /**
   * 获取所有任务
   */
  getJobs(): Map<string, any>;
}

/**
 * 任务类型枚举
 */
export enum JobType {
  CRON = 'cron',
  INTERVAL = 'interval',
  TIMEOUT = 'timeout'
}

/**
 * 任务信息接口
 */
export interface JobInfo {
  name: string;
  type: JobType;
  expression?: string; // Cron表达式
  interval?: number;   // 间隔时间
  timeout?: number;    // 超时时间
  callback: () => void | Promise<void>;
  isActive: boolean;
  createdAt: Date;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

/**
 * 调度器配置接口
 */
export interface SchedulerConfig {
  /**
   * 是否启用调度器
   */
  enabled?: boolean;

  /**
   * 时区设置
   */
  timezone?: string;

  /**
   * 最大并发任务数
   */
  maxConcurrentJobs?: number;

  /**
   * 错误重试次数
   */
  retryAttempts?: number;

  /**
   * 错误重试间隔（毫秒）
   */
  retryDelay?: number;

  /**
   * 是否记录任务执行日志
   */
  enableLogging?: boolean;
}