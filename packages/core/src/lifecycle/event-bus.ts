import { EventEmitter } from 'events';
import { Type } from '../types.js';

/**
 * 生命周期事件类型
 */
export enum LifecycleEvent {
  // 应用级事件
  APP_BOOTSTRAP_BEFORE = 'app:bootstrap:before',
  APP_BOOTSTRAP_AFTER = 'app:bootstrap:after',
  APP_SHUTDOWN_BEFORE = 'app:shutdown:before',
  APP_SHUTDOWN_AFTER = 'app:shutdown:after',
  
  // 模块级事件
  MODULE_INIT_BEFORE = 'module:init:before',
  MODULE_INIT_AFTER = 'module:init:after',
  MODULE_DESTROY_BEFORE = 'module:destroy:before',
  MODULE_DESTROY_AFTER = 'module:destroy:after',
  MODULE_REGISTER_BEFORE = 'module:register:before',
  MODULE_REGISTER_AFTER = 'module:register:after',
  
  // 服务级事件
  SERVICE_CREATED = 'service:created',
  SERVICE_DESTROYED = 'service:destroyed',
  
  // 请求级事件
  REQUEST_START = 'request:start',
  REQUEST_END = 'request:end',
  REQUEST_ERROR = 'request:error',
  
  // 自定义事件
  CUSTOM = 'custom'
}

/**
 * 事件数据接口
 */
export interface EventData {
  timestamp: Date;
  source?: string;
  metadata?: Record<string, any>;
}

/**
 * 应用事件数据
 */
export interface AppEventData extends EventData {
  appName?: string;
}

/**
 * 模块事件数据
 */
export interface ModuleEventData extends EventData {
  module: Type<any> | string;
  moduleName?: string;
}

/**
 * 服务事件数据
 */
export interface ServiceEventData extends EventData {
  service: Type<any> | string;
  serviceName?: string;
  instance?: any;
}

/**
 * 请求事件数据
 */
export interface RequestEventData extends EventData {
  requestId: string;
  method?: string;
  url?: string;
  statusCode?: number;
  error?: Error;
}

/**
 * 事件监听器接口
 */
export interface EventListener<T extends EventData = EventData> {
  (data: T): void | Promise<void>;
}

/**
 * 生命周期事件总线
 */
export class LifecycleEventBus {
  private readonly eventEmitter: EventEmitter;
  private readonly listeners = new Map<string, Set<EventListener>>();
  private readonly eventHistory: Array<{ event: string; data: EventData }> = [];
  private readonly maxHistorySize: number;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100); // 增加最大监听器数量
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  /**
   * 订阅事件
   */
  on<T extends EventData = EventData>(
    event: LifecycleEvent | string,
    listener: EventListener<T>
  ): { unsubscribe: () => void } {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as EventListener);
    this.eventEmitter.on(event, listener);
    
    return {
      unsubscribe: () => this.off(event, listener)
    };
  }

  /**
   * 订阅事件（一次性）
   */
  once<T extends EventData = EventData>(
    event: LifecycleEvent | string,
    listener: EventListener<T>
  ): void {
    const wrappedListener = (data: T) => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        listeners.delete(listener as EventListener);
        if (listeners.size === 0) {
          this.listeners.delete(event);
        }
      }
      return listener(data);
    };
    
    this.eventEmitter.once(event, wrappedListener);
  }

  /**
   * 取消订阅事件
   */
  off<T extends EventData = EventData>(
    event: LifecycleEvent | string,
    listener: EventListener<T>
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener as EventListener);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
    this.eventEmitter.off(event, listener);
  }

  /**
   * 发布事件
   */
  async emit<T extends EventData = EventData>(
    event: LifecycleEvent | string,
    data: T
  ): Promise<void> {
    // 添加时间戳
    if (!data.timestamp) {
      data.timestamp = new Date();
    }

    // 创建完整的事件对象
    const eventObject = {
      type: event,
      ...data
    };

    // 记录事件历史
    this.addToHistory(event, data);

    // 异步处理监听器
    const listeners = this.listeners.get(event);
    if (listeners) {
      const promises = Array.from(listeners).map(async (listener) => {
        try {
          await listener(eventObject);
        } catch (error) {
          console.error(`事件监听器执行失败 [${event}]:`, error);
          // 不重新抛出错误，避免影响其他监听器
        }
      });
      await Promise.allSettled(promises);
    }

    // 发布到 EventEmitter（放在最后，避免错误传播）
    try {
      this.eventEmitter.emit(event, eventObject);
    } catch (error) {
      console.error(`EventEmitter 事件处理失败 [${event}]:`, error);
    }
  }

  /**
   * 发布应用事件
   */
  async emitAppEvent(
    event: LifecycleEvent,
    data: Partial<AppEventData> = {}
  ): Promise<void> {
    const eventData: AppEventData = {
      timestamp: new Date(),
      source: 'application',
      ...data
    };
    await this.emit(event, eventData);
  }

  /**
   * 发布模块事件
   */
  async emitModuleEvent(
    event: LifecycleEvent,
    module: Type<any> | string,
    data: Partial<ModuleEventData> = {}
  ): Promise<void> {
    const eventData: ModuleEventData = {
      timestamp: new Date(),
      source: 'module',
      module,
      moduleName: typeof module === 'function' ? module.name : module,
      ...data
    };
    await this.emit(event, eventData);
  }

  /**
   * 发布服务事件
   */
  async emitServiceEvent(
    event: LifecycleEvent,
    service: Type<any> | string,
    data: Partial<ServiceEventData> = {}
  ): Promise<void> {
    const eventData: ServiceEventData = {
      timestamp: new Date(),
      source: 'service',
      service,
      serviceName: typeof service === 'function' ? service.name : service,
      ...data
    };
    await this.emit(event, eventData);
  }

  /**
   * 发布请求事件
   */
  async emitRequestEvent(
    event: LifecycleEvent,
    requestId: string,
    data: Partial<RequestEventData> = {}
  ): Promise<void> {
    const eventData: RequestEventData = {
      timestamp: new Date(),
      source: 'request',
      requestId,
      ...data
    };
    await this.emit(event, eventData);
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(event: LifecycleEvent | string): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * 获取所有事件名称
   */
  getEventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 获取事件历史
   */
  getEventHistory(limit?: number): Array<{ event: string; data: EventData }> {
    if (limit) {
      return this.eventHistory.slice(-limit);
    }
    return [...this.eventHistory];
  }

  /**
   * 清除事件历史
   */
  clearEventHistory(): void {
    this.eventHistory.length = 0;
  }

  /**
   * 添加到事件历史
   */
  private addToHistory(event: string, data: EventData): void {
    this.eventHistory.push({ event, data });
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(event?: LifecycleEvent | string): void {
    if (event) {
      this.listeners.delete(event);
      this.eventEmitter.removeAllListeners(event);
    } else {
      this.listeners.clear();
      this.eventEmitter.removeAllListeners();
    }
  }

  /**
   * 获取事件历史（支持过滤）
   */
  getHistory(eventType?: string, since?: number): Array<{ type: string; timestamp: Date; data: any }> {
    let history = this.eventHistory.map(item => {
      const timestamp = item.data.timestamp instanceof Date 
        ? item.data.timestamp 
        : new Date(item.data.timestamp || Date.now());
      return {
        type: item.event,
        timestamp,
        data: item.data
      };
    });
    
    if (eventType) {
      history = history.filter(item => item.type.startsWith(eventType));
    }
    
    if (since) {
      history = history.filter(item => item.timestamp.getTime() >= since);
    }
    
    return history;
  }

  /**
   * 获取事件统计信息
   */
  getStatistics(): {
    totalEvents: number;
    totalSubscribers: number;
    eventsByType: Record<string, number>;
    subscribersByEvent: Record<string, number>;
  } {
    const eventsByType: Record<string, number> = {};
    const subscribersByEvent: Record<string, number> = {};
    
    // 统计事件历史
    for (const item of this.eventHistory) {
      eventsByType[item.event] = (eventsByType[item.event] || 0) + 1;
    }
    
    // 统计订阅者
    let totalSubscribers = 0;
    for (const [event, listeners] of this.listeners) {
      const count = listeners.size;
      subscribersByEvent[event] = count;
      totalSubscribers += count;
    }
    
    return {
      totalEvents: this.eventHistory.length,
      totalSubscribers,
      eventsByType,
      subscribersByEvent
    };
  }

  /**
   * 清空所有数据
   */
  clear(): void {
    this.removeAllListeners();
    this.clearEventHistory();
  }

  /**
   * 销毁事件总线
   */
  destroy(): void {
    this.clear();
  }
}

/**
 * 全局生命周期事件总线实例
 */
export const globalEventBus = new LifecycleEventBus();

/**
 * 事件总线装饰器
 * 用于自动注入事件总线到服务中
 */
export function InjectEventBus(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    Object.defineProperty(target, propertyKey, {
      get: () => globalEventBus,
      enumerable: true,
      configurable: true
    });
  };
}

/**
 * 事件监听器装饰器
 * 用于自动注册事件监听器
 */
export function OnEvent(event: LifecycleEvent | string): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 存储事件处理器元数据
    const handlers = Reflect.getMetadata('event:handlers', target.constructor) || [];
    handlers.push({ event, method: propertyKey });
    Reflect.defineMetadata('event:handlers', handlers, target.constructor);
    
    return descriptor;
  };
}