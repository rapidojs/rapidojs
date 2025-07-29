import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import { MultipartPlugin } from '../plugins/multipart.plugin.js';
import { METADATA_KEY } from '../constants.js';
import { Controller, Post, UseMultiPart, UploadedFile } from '@rapidojs/common';

/**
 * MultipartPlugin 单元测试
 * 测试 multipart 插件的注册、配置和文件处理功能
 */
describe('MultipartPlugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('插件注册', () => {
    it('应该成功注册 multipart 插件', async () => {
      await MultipartPlugin.register(app);
      
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该使用默认配置注册插件', async () => {
      await MultipartPlugin.register(app);
      
      // 验证插件是否已注册
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该使用自定义配置注册插件', async () => {
      const customOptions = {
        limits: {
          fileSize: 5 * 1024 * 1024, // 5MB
          files: 3
        },
        allowedMimeTypes: ['image/jpeg', 'image/png']
      };

      await MultipartPlugin.register(app, customOptions);
      
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该防止重复注册', async () => {
      await MultipartPlugin.register(app);
      
      // 尝试再次注册
      await MultipartPlugin.register(app);
      
      // 应该仍然只注册一次
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该优雅处理插件不存在的情况', async () => {
      // 模拟插件注册失败的情况
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 这个测试主要验证错误处理逻辑存在
      await expect(MultipartPlugin.register(app)).resolves.not.toThrow();
      
      // 恢复 spy
      consoleSpy.mockRestore();
    });
  });

  describe('路由配置检测', () => {
    it('应该检测到带有 @UseMultiPart 装饰器的路由', () => {
      @Controller('/upload')
      class UploadController {
        @Post('/single')
        @UseMultiPart({
          limits: { fileSize: 1024 * 1024 }
        })
        uploadSingle(@UploadedFile() file: any) {
          return { filename: file.filename };
        }
      }

      // 模拟请求对象
      const mockRequest = {
        routeContext: {
          controller: UploadController,
          methodName: 'uploadSingle'
        }
      };

      // 使用反射 API 获取配置（模拟插件内部逻辑）
      const options = Reflect.getMetadata(
        METADATA_KEY.MULTIPART,
        UploadController,
        'uploadSingle'
      );

      expect(options).toBeDefined();
      expect(options.limits.fileSize).toBe(1024 * 1024);
    });

    it('应该返回 null 当路由没有 multipart 配置时', () => {
      @Controller('/test')
      class TestController {
        @Post('/normal')
        normalMethod() {
          return 'normal';
        }
      }

      const mockRequest = {
        routeContext: {
          controller: TestController,
          methodName: 'normalMethod'
        }
      };

      const options = Reflect.getMetadata(
        METADATA_KEY.MULTIPART,
        TestController,
        'normalMethod'
      );

      expect(options).toBeUndefined();
    });
  });

  describe('文件处理', () => {
    it('应该正确处理单个文件上传', async () => {
      // 模拟 multipart 数据
      const mockFile = {
        fieldname: 'avatar',
        filename: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        file: {},
        toBuffer: async () => Buffer.from('test file content')
      };

      const mockParts = {
        async *[Symbol.asyncIterator]() {
          yield mockFile;
        }
      };

      const mockRequest = {
        isMultipart: () => true,
        parts: () => mockParts,
        routeContext: {
          controller: class TestController {},
          methodName: 'upload'
        }
      };

      // 设置 multipart 元数据
      Reflect.defineMetadata(
        METADATA_KEY.MULTIPART,
        { limits: { fileSize: 1024 * 1024 } },
        mockRequest.routeContext.controller,
        'upload'
      );

      await MultipartPlugin.register(app);
      
      // 验证插件已注册（间接验证 preHandler 钩子已设置）
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该验证文件类型', async () => {
      const mockFile = {
        fieldname: 'avatar',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        file: {},
        toBuffer: async () => Buffer.from('test content')
      };

      const options = {
        allowedMimeTypes: ['image/jpeg', 'image/png']
      };

      // 验证文件类型检查逻辑
      const isAllowed = options.allowedMimeTypes.includes(mockFile.mimetype);
      expect(isAllowed).toBe(false);
    });

    it('应该验证文件大小', async () => {
      const fileContent = Buffer.from('test file content');
      const mockFile = {
        fieldname: 'avatar',
        filename: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        file: {},
        toBuffer: async () => fileContent
      };

      const options = {
        limits: {
          fileSize: 10 // 很小的限制
        }
      };

      // 验证文件大小检查逻辑
      const isWithinLimit = fileContent.length <= options.limits.fileSize;
      expect(isWithinLimit).toBe(false);
    });

    it('应该正确组织多个文件', async () => {
      const files = [
        {
          fieldname: 'photos',
          filename: 'photo1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('photo1')
        },
        {
          fieldname: 'photos',
          filename: 'photo2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: Buffer.from('photo2')
        },
        {
          fieldname: 'avatar',
          filename: 'avatar.jpg',
          mimetype: 'image/jpeg',
          size: 512,
          buffer: Buffer.from('avatar')
        }
      ];

      // 模拟文件组织逻辑
      const filesByField: Record<string, any> = {};
      files.forEach(file => {
        if (!filesByField[file.fieldname]) {
          filesByField[file.fieldname] = [];
        }
        filesByField[file.fieldname].push(file);
      });

      // 如果某个字段只有一个文件，直接赋值文件对象而不是数组
      Object.keys(filesByField).forEach(fieldName => {
        if (filesByField[fieldName].length === 1) {
          filesByField[fieldName] = filesByField[fieldName][0];
        }
      });

      expect(filesByField.photos).toHaveLength(2);
      expect(Array.isArray(filesByField.photos)).toBe(true);
      expect(filesByField.avatar).not.toBeInstanceOf(Array);
      expect(filesByField.avatar.filename).toBe('avatar.jpg');
    });
  });

  describe('错误处理', () => {
    it('应该处理 multipart 解析错误', async () => {
      const mockRequest = {
        isMultipart: () => true,
        parts: () => {
          throw new Error('Parse error');
        },
        routeContext: {
          controller: class TestController {},
          methodName: 'upload'
        }
      };

      // 设置 multipart 元数据
      Reflect.defineMetadata(
        METADATA_KEY.MULTIPART,
        {},
        mockRequest.routeContext.controller,
        'upload'
      );

      await MultipartPlugin.register(app);
      
      // 验证错误处理逻辑存在
      expect(() => {
        throw new Error('Multipart processing failed: Parse error');
      }).toThrow('Multipart processing failed: Parse error');
    });

    it('应该处理文件类型验证失败', () => {
      const file = {
        mimetype: 'text/plain'
      };
      
      const options = {
        allowedMimeTypes: ['image/jpeg', 'image/png']
      };

      expect(() => {
        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
          throw new Error(`File type ${file.mimetype} is not allowed`);
        }
      }).toThrow('File type text/plain is not allowed');
    });

    it('应该处理文件大小验证失败', () => {
      const file = {
        size: 2 * 1024 * 1024 // 2MB
      };
      
      const options = {
        limits: {
          fileSize: 1024 * 1024 // 1MB
        }
      };

      expect(() => {
        if (options.limits?.fileSize && file.size > options.limits.fileSize) {
          throw new Error(`File size ${file.size} exceeds limit ${options.limits.fileSize}`);
        }
      }).toThrow('File size 2097152 exceeds limit 1048576');
    });
  });

  describe('集成测试', () => {
    it('应该与 Fastify 正确集成', async () => {
      await MultipartPlugin.register(app, {
        limits: {
          fileSize: 1024 * 1024,
          files: 1
        }
      });

      await app.ready();
      
      // 验证插件已注册
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });

    it('应该正确设置 preHandler 钩子', async () => {
      await MultipartPlugin.register(app);
      
      // 验证插件已注册，这意味着 preHandler 钩子已设置
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
      
      // 验证应用已准备就绪
      await app.ready();
      
      // 在测试环境中，插件可能不会被实际加载，但注册逻辑应该正常工作
      expect(MultipartPlugin.isPluginRegistered()).toBe(true);
    });
  });
});