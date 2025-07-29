import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LifecycleEventBus, globalEventBus, OnEvent } from '../lifecycle/event-bus.js';
import { Injectable } from '@rapidojs/common';

describe('Lifecycle Event Bus', () => {
  let eventBus: LifecycleEventBus;

  beforeEach(() => {
    eventBus = new LifecycleEventBus();
    globalEventBus.clear();
  });

  describe('Event Subscription and Publishing', () => {
    it('should subscribe and receive events', () => {
      const events: any[] = [];
      
      eventBus.on('application:bootstrap', (event) => {
        events.push(event);
      });
      
      eventBus.emit('application:bootstrap', {
        timestamp: Date.now(),
        data: { appName: 'test-app' }
      });
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('application:bootstrap');
      expect(events[0].data.appName).toBe('test-app');
    });

    it('should support multiple subscribers for the same event', () => {
      const events1: any[] = [];
      const events2: any[] = [];
      
      eventBus.on('module:loaded', (event) => events1.push(event));
      eventBus.on('module:loaded', (event) => events2.push(event));
      
      eventBus.emit('module:loaded', {
        timestamp: Date.now(),
        data: { moduleName: 'TestModule' }
      });
      
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0].data.moduleName).toBe('TestModule');
      expect(events2[0].data.moduleName).toBe('TestModule');
    });

    it('should unsubscribe events correctly', () => {
      const events: any[] = [];
      
      const subscription = eventBus.on('service:created', (event) => {
        events.push(event);
      });
      
      eventBus.emit('service:created', {
        timestamp: Date.now(),
        data: { serviceName: 'TestService' }
      });
      
      expect(events).toHaveLength(1);
      
      subscription.unsubscribe();
      
      eventBus.emit('service:created', {
        timestamp: Date.now(),
        data: { serviceName: 'AnotherService' }
      });
      
      expect(events).toHaveLength(1); // 应该还是 1，因为已经取消订阅
    });
  });

  describe('Event History', () => {
    it('should maintain event history', () => {
      eventBus.emit('application:bootstrap', {
        timestamp: Date.now(),
        data: { appName: 'test-app' }
      });
      
      eventBus.emit('module:loaded', {
        timestamp: Date.now(),
        data: { moduleName: 'TestModule' }
      });
      
      const history = eventBus.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('application:bootstrap');
      expect(history[1].type).toBe('module:loaded');
    });

    it('should limit history size', () => {
      const limitedEventBus = new LifecycleEventBus({ maxHistorySize: 2 });
      
      limitedEventBus.emit('event:1', { timestamp: Date.now(), data: {} });
      limitedEventBus.emit('event:2', { timestamp: Date.now(), data: {} });
      limitedEventBus.emit('event:3', { timestamp: Date.now(), data: {} });
      
      const history = limitedEventBus.getHistory();
      expect(history.length).toBeLessThanOrEqual(2);
      // 检查最新的事件是否在历史中
      const eventTypes = history.map(h => h.type);
      expect(eventTypes).toContain('event:3');
    });

    it('should clear history', () => {
      eventBus.emit('test:event', { timestamp: Date.now(), data: {} });
      expect(eventBus.getHistory()).toHaveLength(1);
      
      eventBus.clearEventHistory();
      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', () => {
      eventBus.emit('application:bootstrap', { timestamp: Date.now(), data: {} });
      eventBus.emit('module:loaded', { timestamp: Date.now(), data: {} });
      eventBus.emit('application:shutdown', { timestamp: Date.now(), data: {} });
      
      const appEvents = eventBus.getHistory('application');
      expect(appEvents).toHaveLength(2);
      expect(appEvents[0].type).toBe('application:bootstrap');
      expect(appEvents[1].type).toBe('application:shutdown');
    });

    it('should filter events by time range', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      eventBus.emit('old:event', { timestamp: oneHourAgo, data: {} });
      eventBus.emit('new:event', { timestamp: now, data: {} });
      
      const recentEvents = eventBus.getHistory(undefined, now - 1800000); // 30 minutes ago
      expect(recentEvents).toHaveLength(1);
      expect(recentEvents[0].type).toBe('new:event');
    });
  });

  describe('OnEvent Decorator', () => {
    it('should register event handlers using decorator', () => {
      const events: any[] = [];
      
      @Injectable()
      class TestService {
        @OnEvent('test:decorated')
        handleTestEvent(event: any) {
          events.push(event);
        }
      }
      
      const service = new TestService();
      
      // 模拟装饰器注册过程
      const handlers = Reflect.getMetadata('event:handlers', TestService) || [];
      expect(handlers).toHaveLength(1);
      expect(handlers[0].event).toBe('test:decorated');
      expect(handlers[0].method).toBe('handleTestEvent');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in event handlers gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const successEvents: any[] = [];
      
      eventBus.on('error:test', () => {
        throw new Error('Handler error');
      });
      
      eventBus.on('error:test', (event) => {
        successEvents.push(event);
      });
      
      eventBus.emit('error:test', { timestamp: Date.now(), data: {} });
      
      // 错误不应该阻止其他处理器执行
      expect(successEvents).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should handle many subscribers efficiently', () => {
      const subscriberCount = 1000;
      const events: any[] = [];
      
      // 为性能测试设置更高的监听器限制
      (eventBus as any).eventEmitter.setMaxListeners(subscriberCount + 10);
      
      // 添加大量订阅者
      for (let i = 0; i < subscriberCount; i++) {
        eventBus.on('performance:test', (event) => {
          events.push(event);
        });
      }
      
      const startTime = Date.now();
      eventBus.emit('performance:test', { timestamp: Date.now(), data: {} });
      const endTime = Date.now();
      
      expect(events).toHaveLength(subscriberCount);
      expect(endTime - startTime).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });

  describe('Global Event Bus', () => {
    it('should provide a global event bus instance', () => {
      expect(globalEventBus).toBeInstanceOf(LifecycleEventBus);
      
      const events: any[] = [];
      globalEventBus.on('global:test', (event) => events.push(event));
      globalEventBus.emit('global:test', { timestamp: Date.now(), data: {} });
      
      expect(events).toHaveLength(1);
    });
  });

  describe('Event Statistics', () => {
    it('should provide event statistics', () => {
      eventBus.emit('stats:event1', { timestamp: Date.now(), data: {} });
      eventBus.emit('stats:event2', { timestamp: Date.now(), data: {} });
      eventBus.emit('stats:event1', { timestamp: Date.now(), data: {} });
      
      const stats = eventBus.getStatistics();
      
      expect(stats.totalEvents).toBe(3);
      expect(stats.eventsByType['stats:event1']).toBe(2);
      expect(stats.eventsByType['stats:event2']).toBe(1);
      expect(stats.totalSubscribers).toBe(0); // 没有订阅者
    });

    it('should track subscriber statistics', () => {
      eventBus.on('subscriber:test', () => {});
      eventBus.on('subscriber:test', () => {});
      eventBus.on('another:test', () => {});
      
      const stats = eventBus.getStatistics();
      
      expect(stats.totalSubscribers).toBe(3);
      expect(stats.subscribersByEvent['subscriber:test']).toBe(2);
      expect(stats.subscribersByEvent['another:test']).toBe(1);
    });
  });

  describe('Async Event Handling', () => {
    it('should handle async event handlers', async () => {
      const events: any[] = [];
      
      eventBus.on('async:test', async (event) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        events.push(event);
      });
      
      await eventBus.emit('async:test', { timestamp: Date.now(), data: {} });
      
      expect(events).toHaveLength(1);
    });
  });
})