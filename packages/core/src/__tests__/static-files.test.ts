import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RapidoFactory } from '../factory/rapido.factory.js';
import { Module, Get } from '../decorators/index.js';
import { Controller } from '../decorators/controller.decorator.js';
import { AppConfig, StaticFileConfig } from '../interfaces/app-config.interface.js';
import { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import os from 'os';

// 测试控制器
@Controller('/api')
class TestController {
  @Get('/test')
  test() {
    return { message: 'API working' };
  }
}

@Module({
  controllers: [TestController]
})
class TestModule {}

describe('静态文件服务', () => {
  let app: FastifyInstance & { addStaticFiles: (config: StaticFileConfig) => Promise<void> };
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // 创建临时目录和测试文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rapido-static-test-'));
    testFilePath = path.join(tempDir, 'test.html');
    fs.writeFileSync(testFilePath, '<html><body>Hello Static</body></html>');
    
    // 创建子目录和文件
    const subDir = path.join(tempDir, 'assets');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, 'style.css'), 'body { color: red; }');
    
    // 创建默认文件
    fs.writeFileSync(path.join(tempDir, 'index.html'), '<html><body>Index Page</body></html>');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    
    // 清理临时目录
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('应用配置中的静态文件', () => {
    it('应该支持单个静态文件配置', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试静态文件访问
      const response = await app.inject({
        method: 'GET',
        url: '/public/test.html'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Hello Static');
    });

    it('应该支持多个静态文件配置', async () => {
      // 创建第二个临时目录
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'rapido-static-test2-'));
      fs.writeFileSync(path.join(tempDir2, 'app.js'), 'console.log("Hello JS");');

      const config: AppConfig = {
        staticFiles: [
          {
            root: tempDir,
            prefix: '/public/'
          },
          {
            root: tempDir2,
            prefix: '/js/'
          }
        ]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试第一个配置
      const response1 = await app.inject({
        method: 'GET',
        url: '/public/test.html'
      });

      expect(response1.statusCode).toBe(200);
      expect(response1.body).toContain('Hello Static');

      // 测试第二个配置
      const response2 = await app.inject({
        method: 'GET',
        url: '/js/app.js'
      });

      expect(response2.statusCode).toBe(200);
      expect(response2.body).toContain('Hello JS');

      // 清理第二个临时目录
      fs.rmSync(tempDir2, { recursive: true, force: true });
    });

    it('应该支持默认 prefix', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir
          // 没有 prefix，应该使用默认值
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试默认 prefix (应该是根路径)
      const response = await app.inject({
        method: 'GET',
        url: '/test.html'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Hello Static');
    });

    it('应该支持 index 文件配置', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/',
          index: true // 启用默认 index.html
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试 index 文件
      const response = await app.inject({
        method: 'GET',
        url: '/public/'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Index Page');
    });

    it('应该支持自定义 index 文件', async () => {
      // 创建自定义 index 文件
      fs.writeFileSync(path.join(tempDir, 'custom.html'), '<html><body>Custom Index</body></html>');

      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/',
          index: 'custom.html'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试自定义 index 文件
      const response = await app.inject({
        method: 'GET',
        url: '/public/'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Custom Index');
    });

    it('应该支持多个 index 文件候选', async () => {
      // 删除 index.html，创建 default.html
      fs.unlinkSync(path.join(tempDir, 'index.html'));
      fs.writeFileSync(path.join(tempDir, 'default.html'), '<html><body>Default Page</body></html>');

      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/',
          index: ['index.html', 'default.html', 'home.html']
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 应该找到 default.html（第二个候选）
      const response = await app.inject({
        method: 'GET',
        url: '/public/'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Default Page');
    });

    it('应该禁用 index 文件', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/',
          index: false // 禁用 index 文件
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 访问目录应该返回错误
      const response = await app.inject({
        method: 'GET',
        url: '/public/'
      });

      expect(response.statusCode).not.toBe(200);
    });
  });

  describe('动态添加静态文件配置', () => {
    beforeEach(async () => {
      app = await RapidoFactory.create(TestModule);
    });

    it('应该支持运行时添加静态文件配置', async () => {
      // 动态添加静态文件配置
      await app.addStaticFiles({
        root: tempDir,
        prefix: '/runtime/'
      });

      // 测试动态添加的配置
      const response = await app.inject({
        method: 'GET',
        url: '/runtime/test.html'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Hello Static');
    });

    it('应该支持多次动态添加配置', async () => {
      // 创建第二个临时目录
      const tempDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'rapido-static-test2-'));
      fs.writeFileSync(path.join(tempDir2, 'data.json'), '{"message": "Hello JSON"}');

      // 第一次添加
      await app.addStaticFiles({
        root: tempDir,
        prefix: '/files1/'
      });

      // 第二次添加
      await app.addStaticFiles({
        root: tempDir2,
        prefix: '/files2/'
      });

      // 测试两个配置
      const response1 = await app.inject({
        method: 'GET',
        url: '/files1/test.html'
      });

      const response2 = await app.inject({
        method: 'GET',
        url: '/files2/data.json'
      });

      expect(response1.statusCode).toBe(200);
      expect(response1.body).toContain('Hello Static');

      expect(response2.statusCode).toBe(200);
      expect(response2.body).toContain('Hello JSON');

      // 清理第二个临时目录
      fs.rmSync(tempDir2, { recursive: true, force: true });
    });

    it('动态添加的配置应该支持 index 选项', async () => {
      await app.addStaticFiles({
        root: tempDir,
        prefix: '/dynamic/',
        index: true
      });

      // 测试 index 文件
      const response = await app.inject({
        method: 'GET',
        url: '/dynamic/'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Index Page');
    });
  });

  describe('静态文件与 API 路由共存', () => {
    it('API 路由和静态文件应该可以共存', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试 API 路由
      const apiResponse = await app.inject({
        method: 'GET',
        url: '/api/test'
      });

      expect(apiResponse.statusCode).toBe(200);
      expect(JSON.parse(apiResponse.body)).toEqual({ message: 'API working' });

      // 测试静态文件
      const staticResponse = await app.inject({
        method: 'GET',
        url: '/public/test.html'
      });

      expect(staticResponse.statusCode).toBe(200);
      expect(staticResponse.body).toContain('Hello Static');
    });

    it('不同的前缀不应该冲突', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/api-docs/' // 与 API 前缀不同
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // API 应该正常工作
      const apiResponse = await app.inject({
        method: 'GET',
        url: '/api/test'
      });

      expect(apiResponse.statusCode).toBe(200);

      // 静态文件应该正常工作
      const staticResponse = await app.inject({
        method: 'GET',
        url: '/api-docs/test.html'
      });

      expect(staticResponse.statusCode).toBe(200);
    });
  });

  describe('错误处理', () => {
    it('不存在的静态文件应该返回 404', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      const response = await app.inject({
        method: 'GET',
        url: '/public/nonexistent.html'
      });

      expect(response.statusCode).toBe(404);
    });

    it('应该处理无效的根目录', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: '/nonexistent/directory',
          prefix: '/public/'
        }]
      };

      // 应该不会抛出异常，但会有警告
      expect(async () => {
        app = await RapidoFactory.create(TestModule, config);
      }).not.toThrow();
    });

    it('空的静态文件配置应该被忽略', async () => {
      const config: AppConfig = {
        staticFiles: []
      };

      app = await RapidoFactory.create(TestModule, config);

      // API 应该正常工作
      const response = await app.inject({
        method: 'GET',
        url: '/api/test'
      });

      expect(response.statusCode).toBe(200);
    });

    it('undefined 静态文件配置应该被处理', async () => {
      const config: AppConfig = {
        staticFiles: undefined
      };

      app = await RapidoFactory.create(TestModule, config);

      // API 应该正常工作
      const response = await app.inject({
        method: 'GET',
        url: '/api/test'
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Fastify 选项集成', () => {
    it('应该与 Fastify 选项兼容', async () => {
      const config: AppConfig = {
        fastifyOptions: {
          logger: false,
          disableRequestLogging: true
        },
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试静态文件仍然工作
      const response = await app.inject({
        method: 'GET',
        url: '/public/test.html'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Hello Static');
    });
  });

  describe('边界情况', () => {
    it('应该处理特殊字符的文件名', async () => {
      // 创建带特殊字符的文件
      const specialFile = path.join(tempDir, 'test file with spaces.txt');
      fs.writeFileSync(specialFile, 'Special content');

      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试访问（需要 URL 编码）
      const response = await app.inject({
        method: 'GET',
        url: '/public/test%20file%20with%20spaces.txt'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('Special content');
    });

    it('应该正确处理子目录', async () => {
      const config: AppConfig = {
        staticFiles: [{
          root: tempDir,
          prefix: '/public/'
        }]
      };

      app = await RapidoFactory.create(TestModule, config);

      // 测试子目录中的文件
      const response = await app.inject({
        method: 'GET',
        url: '/public/assets/style.css'
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('color: red');
    });
  });
}); 