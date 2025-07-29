import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { UseMultiPart, UploadedFile, UploadedFiles } from '../decorators/multipart.decorators.js';
import { METADATA_KEY } from '../constants.js';
import { ParamType } from '../types.js';
import { ROUTE_ARGS_METADATA } from '../constants.js';

/**
 * Multipart 装饰器单元测试
 * 测试 @UseMultiPart、@UploadedFile 和 @UploadedFiles 装饰器的功能
 */
describe('Multipart Decorators', () => {
  let TestController: any;

  beforeEach(() => {
    // 创建测试控制器类
    TestController = class {
      testMethod() {}
      uploadSingle() {}
      uploadMultiple() {}
    };
  });

  describe('@UseMultiPart', () => {
    it('应该设置 multipart 元数据到方法上', () => {
      const options = {
        limits: {
          fileSize: 5 * 1024 * 1024,
          files: 3
        },
        allowedMimeTypes: ['image/jpeg', 'image/png']
      };

      // 应用装饰器
      const decorator = UseMultiPart(options);
      const descriptor = { value: TestController.prototype.testMethod };
      decorator(TestController.prototype, 'testMethod', descriptor);

      // 验证元数据是否正确设置
      const metadata = Reflect.getMetadata(
        METADATA_KEY.MULTIPART,
        TestController,
        'testMethod'
      );

      expect(metadata).toEqual(options);
    });

    it('应该使用默认配置当没有提供选项时', () => {
      const decorator = UseMultiPart();
      const descriptor = { value: TestController.prototype.testMethod };
      decorator(TestController.prototype, 'testMethod', descriptor);

      const metadata = Reflect.getMetadata(
        METADATA_KEY.MULTIPART,
        TestController,
        'testMethod'
      );

      expect(metadata).toEqual({});
    });

    it('应该支持链式调用其他装饰器', () => {
      const options = { limits: { fileSize: 1024 * 1024 } };
      
      // 模拟其他装饰器
      const otherDecorator = (target: any, propertyKey: string) => {
        Reflect.defineMetadata('other', 'value', target, propertyKey);
      };

      // 应用多个装饰器
      const multipartDecorator = UseMultiPart(options);
      const descriptor = { value: TestController.prototype.testMethod };
      
      multipartDecorator(TestController.prototype, 'testMethod', descriptor);
      otherDecorator(TestController.prototype, 'testMethod');

      // 验证两个装饰器的元数据都存在
      const multipartMetadata = Reflect.getMetadata(
        METADATA_KEY.MULTIPART,
        TestController,
        'testMethod'
      );
      const otherMetadata = Reflect.getMetadata(
        'other',
        TestController.prototype,
        'testMethod'
      );

      expect(multipartMetadata).toEqual(options);
      expect(otherMetadata).toBe('value');
    });
  });

  describe('@UploadedFile', () => {
    it('应该创建参数装饰器用于单个文件上传', () => {
      // 模拟参数装饰器的应用
      const paramIndex = 0;
      const decorator = UploadedFile('avatar');
      
      // 应用装饰器
      decorator(TestController.prototype, 'uploadSingle', paramIndex);

      // 获取参数元数据
      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadSingle'
      ) || {};

      const key = `${ParamType.UPLOADED_FILE}:${paramIndex}`;
      expect(paramsMetadata[key]).toBeDefined();
      expect(paramsMetadata[key].type).toBe(ParamType.UPLOADED_FILE);
      expect(paramsMetadata[key].index).toBe(paramIndex);
      expect(paramsMetadata[key].factory).toBeDefined();
    });

    it('应该支持不指定字段名', () => {
      const paramIndex = 0;
      const decorator = UploadedFile();
      
      decorator(TestController.prototype, 'uploadSingle', paramIndex);

      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadSingle'
      ) || {};

      const key = `${ParamType.UPLOADED_FILE}:${paramIndex}`;
      expect(paramsMetadata[key]).toBeDefined();
      expect(paramsMetadata[key].type).toBe(ParamType.UPLOADED_FILE);
    });

    it('应该支持多个参数装饰器', () => {
      const decorator1 = UploadedFile('file1');
      const decorator2 = UploadedFile('file2');
      
      decorator1(TestController.prototype, 'uploadSingle', 0);
      decorator2(TestController.prototype, 'uploadSingle', 1);

      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadSingle'
      ) || {};

      const key0 = `${ParamType.UPLOADED_FILE}:0`;
      const key1 = `${ParamType.UPLOADED_FILE}:1`;
      expect(paramsMetadata[key0]).toBeDefined();
      expect(paramsMetadata[key1]).toBeDefined();
      expect(paramsMetadata[key0].type).toBe(ParamType.UPLOADED_FILE);
      expect(paramsMetadata[key1].type).toBe(ParamType.UPLOADED_FILE);
    });
  });

  describe('@UploadedFiles', () => {
    it('应该创建参数装饰器用于多个文件上传', () => {
      const paramIndex = 0;
      const decorator = UploadedFiles('photos');
      
      decorator(TestController.prototype, 'uploadMultiple', paramIndex);

      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadMultiple'
      ) || {};

      const key = `${ParamType.UPLOADED_FILES}:${paramIndex}`;
      expect(paramsMetadata[key]).toBeDefined();
      expect(paramsMetadata[key].type).toBe(ParamType.UPLOADED_FILES);
      expect(paramsMetadata[key].index).toBe(paramIndex);
      expect(paramsMetadata[key].factory).toBeDefined();
    });

    it('应该支持不指定字段名获取所有文件', () => {
      const paramIndex = 0;
      const decorator = UploadedFiles();
      
      decorator(TestController.prototype, 'uploadMultiple', paramIndex);

      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadMultiple'
      ) || {};

      const key = `${ParamType.UPLOADED_FILES}:${paramIndex}`;
      expect(paramsMetadata[key]).toBeDefined();
      expect(paramsMetadata[key].type).toBe(ParamType.UPLOADED_FILES);
    });
  });

  describe('装饰器工厂函数', () => {
    it('应该正确处理执行上下文', () => {
      // 模拟执行上下文
      const mockRequest = {
        files: {
          avatar: {
            fieldname: 'avatar',
            filename: 'test.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('test')
          },
          photos: [
            {
              fieldname: 'photos',
              filename: 'photo1.jpg',
              mimetype: 'image/jpeg',
              size: 2048,
              buffer: Buffer.from('photo1')
            },
            {
              fieldname: 'photos',
              filename: 'photo2.jpg',
              mimetype: 'image/jpeg',
              size: 3072,
              buffer: Buffer.from('photo2')
            }
          ]
        }
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest
        })
      };

      // 测试 UploadedFile 工厂函数
      const uploadedFileDecorator = UploadedFile('avatar');
      uploadedFileDecorator(TestController.prototype, 'uploadSingle', 0);
      
      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadSingle'
      ) || {};

      const key = `${ParamType.UPLOADED_FILE}:0`;
      const factory = paramsMetadata[key].factory;
      const result = factory('avatar', mockContext);

      expect(result).toEqual(mockRequest.files.avatar);
    });

    it('应该处理没有文件的情况', () => {
      const mockRequest = { files: null };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest
        })
      };

      const uploadedFileDecorator = UploadedFile('avatar');
      uploadedFileDecorator(TestController.prototype, 'uploadSingle', 0);
      
      const paramsMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        TestController,
        'uploadSingle'
      ) || {};

      const key = `${ParamType.UPLOADED_FILE}:0`;
      if (paramsMetadata[key] && paramsMetadata[key].factory) {
        const factory = paramsMetadata[key].factory;
        const result = factory('avatar', mockContext);
        expect(result).toBeNull();
      } else {
        // 如果没有工厂函数，跳过这个测试
        expect(paramsMetadata[key]).toBeDefined();
      }
    });
  });
});