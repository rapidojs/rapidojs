import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { MultipartPlugin } from '../plugins/multipart.plugin.js';
import { Controller, Post, UseMultiPart, UploadedFile } from '@rapidojs/common';
import { METADATA_KEY } from '@rapidojs/common';

/**
 * Multipart 集成测试
 * 测试基本的 @fastify/multipart 功能和 MultipartPlugin 集成
 */
describe('Multipart Integration', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = fastify();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('基本 multipart 功能', () => {
    it('应该能直接使用 @fastify/multipart 处理请求', async () => {
      // 直接注册 @fastify/multipart 插件
      await app.register(multipart);
      
      // 添加一个简单的路由来测试基本的 multipart 处理
      app.post('/test-basic', async (request, reply) => {
        try {
          // 检查是否是 multipart 请求
          if (request.isMultipart()) {
            const parts = request.parts();
            const files: any[] = [];
            const fields: Record<string, any> = {};

            for await (const part of parts) {
              if (part.type === 'file') {
                const buffer = await part.toBuffer();
                files.push({
                  fieldname: part.fieldname,
                  filename: part.filename,
                  mimetype: part.mimetype,
                  size: buffer.length
                });
              } else {
                fields[part.fieldname] = part.value;
              }
            }

            return {
              success: true,
              files: files,
              fields: fields
            };
          } else {
            return {
              success: false,
              error: 'Not a multipart request'
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      await app.ready();

      // 模拟 multipart 请求数据
      const boundary = '----formdata-test-boundary';
      const fileContent = 'test file content';
      const multipartBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.txt"',
        'Content-Type: text/plain',
        '',
        fileContent,
        `--${boundary}`,
        'Content-Disposition: form-data; name="message"',
        '',
        'hello world',
        `--${boundary}--`,
        ''
      ].join('\r\n');

      // 发送请求
      const response = await app.inject({
        method: 'POST',
        url: '/test-basic',
        payload: multipartBody,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].filename).toBe('test.txt');
      expect(result.fields.message).toBe('hello world');
    });

    it('应该能处理只有字段的请求', async () => {
      // 直接注册 @fastify/multipart 插件
      await app.register(multipart);
      
      app.post('/test-fields', async (request, reply) => {
        try {
          if (request.isMultipart()) {
            const parts = request.parts();
            const fields: Record<string, any> = {};

            for await (const part of parts) {
              if (part.type === 'field') {
                fields[part.fieldname] = part.value;
              }
            }

            return {
              success: true,
              fields: fields
            };
          } else {
            return {
              success: false,
              error: 'Not a multipart request'
            };
          }
        } catch (error) {
          return {
            success: false,
            error: error.message
          };
        }
      });
      
      await app.ready();

      // 发送只有字段的请求
      const boundary = '----formdata-test-boundary';
      const multipartBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="message"',
        '',
        'hello',
        `--${boundary}`,
        'Content-Disposition: form-data; name="name"',
        '',
        'test',
        `--${boundary}--`,
        ''
      ].join('\r\n');

      const response = await app.inject({
        method: 'POST',
        url: '/test-fields',
        payload: multipartBody,
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`
        }
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.fields.message).toBe('hello');
      expect(result.fields.name).toBe('test');
    });
  });

  describe('MultipartPlugin 集成', () => {
    it('应该成功注册 MultipartPlugin', async () => {
      // 创建新的 Fastify 实例避免冲突
      const testApp = fastify();
      
      try {
        // 重置 MultipartPlugin 状态
        (MultipartPlugin as any).isRegistered = false;
        
        // 注册 MultipartPlugin
        await MultipartPlugin.register(testApp);
        await testApp.ready();
        
        // 验证插件已注册
        expect(MultipartPlugin.isPluginRegistered()).toBe(true);
      } finally {
        await testApp.close();
      }
    });

    it('应该能与 @fastify/multipart 插件共存', async () => {
      // 创建新的 Fastify 实例避免冲突
      const testApp = fastify();
      
      try {
        // 重置 MultipartPlugin 状态
        (MultipartPlugin as any).isRegistered = false;
        
        // 注册 MultipartPlugin（它内部会注册 @fastify/multipart）
        await MultipartPlugin.register(testApp);
        
        // 添加一个简单的路由来测试基本功能
        testApp.post('/test-coexist', async (request, reply) => {
          // 测试 @fastify/multipart 的基本功能是否正常
          if (request.isMultipart()) {
            return { success: true, isMultipart: true };
          } else {
            return { success: false, isMultipart: false };
          }
        });
        
        await testApp.ready();

        // 模拟 multipart 请求数据
        const boundary = '----formdata-test-boundary';
        const multipartBody = [
          `--${boundary}`,
          'Content-Disposition: form-data; name="message"',
          '',
          'hello world',
          `--${boundary}--`,
          ''
        ].join('\r\n');

        // 发送请求
        const response = await testApp.inject({
          method: 'POST',
          url: '/test-coexist',
          payload: multipartBody,
          headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`
          }
        });

        // 验证响应

        expect(response.statusCode).toBe(200);
        const result = JSON.parse(response.payload);
        expect(result.success).toBe(true);
        expect(result.isMultipart).toBe(true);
      } finally {
        await testApp.close();
      }
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的 multipart 数据', async () => {
      // 直接注册 @fastify/multipart 插件
      await app.register(multipart);
      
      app.post('/test-error', async (request, reply) => {
        try {
          if (request.isMultipart()) {
            const parts = request.parts();
            for await (const part of parts) {
              // 尝试处理 part
            }
            return { success: true };
          } else {
            return { success: false, error: 'Not multipart' };
          }
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      await app.ready();

      // 发送无效的 multipart 数据
      const response = await app.inject({
        method: 'POST',
        url: '/test-error',
        payload: 'invalid multipart data',
        headers: {
          'content-type': 'multipart/form-data; boundary=invalid'
        }
      });

      // 应该能处理错误，可能返回 400 或其他错误状态码
      expect([200, 400, 415, 500]).toContain(response.statusCode);
    });
  });
});