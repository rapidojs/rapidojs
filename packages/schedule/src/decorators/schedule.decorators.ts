import 'reflect-metadata';

/**
 * 调度任务元数据键
 */
export const SCHEDULE_METADATA_KEY = Symbol('schedule:metadata');

/**
 * 任务类型枚举
 */
export enum ScheduleType {
  CRON = 'cron',
  INTERVAL = 'interval',
  TIMEOUT = 'timeout'
}

/**
 * 调度任务元数据接口
 */
export interface ScheduleMetadata {
  type: ScheduleType;
  expression?: string;
  interval?: number;
  timeout?: number;
  name?: string;
  timezone?: string;
  propertyKey?: string;
}

/**
 * Cron任务装饰器
 */
export function Cron(
  cronExpression: string,
  options?: { name?: string; timezone?: string }
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const metadata: ScheduleMetadata = {
      type: ScheduleType.CRON,
      expression: cronExpression,
      name: options?.name || `${target.constructor.name}.${String(propertyKey)}`,
      timezone: options?.timezone,
      propertyKey: String(propertyKey)
    };

    const existingMetadata: ScheduleMetadata[] = 
      Reflect.getMetadata(SCHEDULE_METADATA_KEY, target.constructor) || [];
    
    existingMetadata.push(metadata);
    Reflect.defineMetadata(SCHEDULE_METADATA_KEY, existingMetadata, target.constructor);
  };
}

/**
 * 间隔任务装饰器
 */
export function Interval(
  interval: number,
  options?: { name?: string }
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const metadata: ScheduleMetadata = {
      type: ScheduleType.INTERVAL,
      interval,
      name: options?.name || `${target.constructor.name}.${String(propertyKey)}`,
      propertyKey: String(propertyKey)
    };

    const existingMetadata: ScheduleMetadata[] = 
      Reflect.getMetadata(SCHEDULE_METADATA_KEY, target.constructor) || [];
    
    existingMetadata.push(metadata);
    Reflect.defineMetadata(SCHEDULE_METADATA_KEY, existingMetadata, target.constructor);
  };
}

/**
 * 超时任务装饰器
 */
export function Timeout(
  timeout: number,
  options?: { name?: string }
): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const metadata: ScheduleMetadata = {
      type: ScheduleType.TIMEOUT,
      timeout,
      name: options?.name || `${target.constructor.name}.${String(propertyKey)}`,
      propertyKey: String(propertyKey)
    };

    const existingMetadata: ScheduleMetadata[] = 
      Reflect.getMetadata(SCHEDULE_METADATA_KEY, target.constructor) || [];
    
    existingMetadata.push(metadata);
    Reflect.defineMetadata(SCHEDULE_METADATA_KEY, existingMetadata, target.constructor);
  };
}