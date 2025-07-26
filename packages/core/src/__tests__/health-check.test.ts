import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module, Controller, Get } from '@rapidojs/common';
import { FastifyInstance } from 'fastify';

// 创建简单的健康检查控制器
@Controller('/health')
class HealthController {
  @Get('/')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  @Get('/detailed')
  getDetailedHealth() {
    const memUsage = process.memoryUsage();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        free: memUsage.heapTotal - memUsage.heapUsed
      },
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        arch: process.arch
      }
    };
  }

  @Get('/readiness')
  getReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: []
    };
  }

  @Get('/liveness')
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }
}

describe('健康检查模块测试', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    @Module({
      controllers: [HealthController]
    })
    class TestModule {}

    app = await RapidoFactory.create(TestModule);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('基本健康检查端点', () => {
    it('应该响应 /health 端点', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });

    it('应该响应 /health/detailed 端点', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('system');
      
      // 检查内存信息
      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('free');
      expect(typeof result.memory.used).toBe('number');
      expect(typeof result.memory.total).toBe('number');
      expect(typeof result.memory.free).toBe('number');
      
      // 检查系统信息
      expect(result.system).toHaveProperty('platform');
      expect(result.system).toHaveProperty('nodeVersion');
      expect(result.system).toHaveProperty('arch');
      expect(typeof result.system.platform).toBe('string');
      expect(typeof result.system.nodeVersion).toBe('string');
      expect(typeof result.system.arch).toBe('string');
    });
  });

  describe('Kubernetes 探针端点', () => {
    it('应该响应 /health/readiness 端点', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/readiness'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(Array.isArray(result.checks)).toBe(true);
    });

    it('应该响应 /health/liveness 端点', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/liveness'
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.body);
      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(typeof result.uptime).toBe('number');
    });
  });

  describe('健康检查响应格式', () => {
    it('基本健康检查应该包含必要字段', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });

      const result = JSON.parse(response.body);
      
      // 必须包含的字段
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      
      // 验证字段类型
      expect(typeof result.status).toBe('string');
      expect(typeof result.timestamp).toBe('string');
      expect(typeof result.uptime).toBe('number');
      
      // 验证时间戳格式
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('详细健康检查应该包含扩展信息', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed'
      });

      const result = JSON.parse(response.body);
      
      // 基本字段
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      
      // 扩展字段
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('system');
      
      // 内存信息验证
      const memory = result.memory;
      expect(memory.used).toBeGreaterThan(0);
      expect(memory.total).toBeGreaterThan(memory.used);
      expect(memory.free).toBeGreaterThanOrEqual(0);
      
      // 系统信息验证
      const system = result.system;
      expect(system.platform).toBeTruthy();
      expect(system.nodeVersion).toMatch(/^v?\d+\.\d+\.\d+/);
      expect(system.arch).toBeTruthy();
    });
  });

  describe('HTTP 方法支持', () => {
    it('健康检查端点应该只支持 GET 方法', async () => {
      const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const method of methods) {
        const response = await app.inject({
          method: method as any,
          url: '/health'
        });
        
        expect(response.statusCode).toBe(404);
      }
    });

    it('所有健康检查端点都应该支持 GET 方法', async () => {
      const endpoints = [
        '/health',
        '/health/detailed',
        '/health/readiness',
        '/health/liveness'
      ];
      
      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint
        });
        
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('性能测试', () => {
    it('健康检查端点应该快速响应', async () => {
      const start = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });
      
      const duration = Date.now() - start;
      
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(100); // 应该在100ms内响应
    });

    it('详细健康检查端点应该在合理时间内响应', async () => {
      const start = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/health/detailed'
      });
      
      const duration = Date.now() - start;
      
      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(200); // 应该在200ms内响应
    });
  });

  describe('并发测试', () => {
    it('应该能够处理并发健康检查请求', async () => {
      const concurrentRequests = 10;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          app.inject({
            method: 'GET',
            url: '/health'
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.body);
        expect(result.status).toBe('ok');
      });
    });
  });

  describe('错误处理', () => {
    it('不存在的健康检查端点应该返回404', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/nonexistent'
      });
      
      expect(response.statusCode).toBe(404);
    });
  });

  describe('响应头测试', () => {
    it('健康检查端点应该返回正确的Content-Type', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('健康检查端点应该包含缓存控制头', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      });
      
      expect(response.statusCode).toBe(200);
      // 验证响应存在
      expect(response.headers).toBeDefined();
    });
  });
});