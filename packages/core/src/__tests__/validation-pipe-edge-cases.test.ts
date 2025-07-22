import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationPipe } from '../pipes/validation.pipe.js';
import { ArgumentMetadata } from '../pipes/pipe-transform.interface.js';

// 模拟 class-validator 和 class-transformer
vi.mock('class-validator', () => ({
  validate: vi.fn(),
  plainToClass: vi.fn()
}));

vi.mock('class-transformer', () => ({
  plainToClass: vi.fn()
}));

// 重新导入模拟后的函数
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

// 测试 DTO 类
class TestDto {
  name: string;
  age: number;
}

class NestedDto {
  user: TestDto;
  tags: string[];
}

describe('ValidationPipe 边界情况测试', () => {
  let pipe: ValidationPipe;
  
  beforeEach(() => {
    pipe = new ValidationPipe();
    // 重置所有模拟
    vi.clearAllMocks();
  });

  describe('基本数据类型处理', () => {
    it('应该直接返回 String 类型的值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: undefined
      };
      
      const result = await pipe.transform('test', metadata);
      expect(result).toBe('test');
      expect(validate).not.toHaveBeenCalled();
    });

    it('应该直接返回 Number 类型的值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Number,
        data: undefined
      };
      
      const result = await pipe.transform(123, metadata);
      expect(result).toBe(123);
      expect(validate).not.toHaveBeenCalled();
    });

    it('应该直接返回 Boolean 类型的值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Boolean,
        data: undefined
      };
      
      const result = await pipe.transform(true, metadata);
      expect(result).toBe(true);
      expect(validate).not.toHaveBeenCalled();
    });

    it('应该直接返回 Array 类型的值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Array,
        data: undefined
      };
      
      const testArray = [1, 2, 3];
      const result = await pipe.transform(testArray, metadata);
      expect(result).toBe(testArray);
      expect(validate).not.toHaveBeenCalled();
    });

    it('应该直接返回 Object 类型的值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Object,
        data: undefined
      };
      
      const testObject = { key: 'value' };
      const result = await pipe.transform(testObject, metadata);
      expect(result).toBe(testObject);
      expect(validate).not.toHaveBeenCalled();
    });
  });

  describe('原始类型转换', () => {
    it('应该转换字符串 "true" 为布尔值 true (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('true', metadata);
      expect(result).toBe(true);
    });

    it('应该转换字符串 "false" 为布尔值 false (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('false', metadata);
      expect(result).toBe(false);
    });

    it('应该转换字符串 "1" 为布尔值 true (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('1', metadata);
      expect(result).toBe(true);
    });

    it('应该转换字符串 "0" 为布尔值 false (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('0', metadata);
      expect(result).toBe(false);
    });

    it('应该保持非标准布尔值字符串不变', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Boolean,
        data: 'active'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('maybe', metadata);
      expect(result).toBe('maybe');
    });

    it('应该转换有效的数字字符串 (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Number,
        data: 'count'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('42', metadata);
      expect(result).toBe(42);
    });

    it('应该转换有效的浮点数字符串 (query 参数)', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Number,
        data: 'price'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('19.99', metadata);
      expect(result).toBe(19.99);
    });

    it('应该保持无效数字字符串不变', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Number,
        data: 'count'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('abc', metadata);
      expect(result).toBe('abc');
    });

    it('应该转换 param 类型的数字', async () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Number,
        data: 'id'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('123', metadata);
      expect(result).toBe(123);
    });

    it('应该跳过非 param/query 类型的转换', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Number,
        data: 'value'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('123', metadata);
      expect(result).toBe('123'); // 应该保持字符串
    });

    it('应该跳过没有 data 的参数转换', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Number,
        data: undefined
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      const result = await pipeWithTransform.transform('123', metadata);
      expect(result).toBe('123'); // 应该保持字符串
    });
  });

  describe('验证错误处理', () => {
    it('应该在验证失败时抛出异常', async () => {
      const mockErrors = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            isString: 'name must be a string'
          }
        }
      ];
      
      (validate as any).mockResolvedValue(mockErrors);
      (plainToClass as any).mockReturnValue({ name: '' });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: undefined
      };
      
      await expect(pipe.transform({ name: '' }, metadata))
        .rejects.toThrow('Validation failed: name should not be empty, name must be a string');
    });

    it('应该处理嵌套验证错误', async () => {
      const mockErrors = [
        {
          property: 'user',
          constraints: {
            isNotEmpty: 'user should not be empty'
          },
          children: [
            {
              property: 'name',
              constraints: {
                isString: 'name must be a string'
              }
            }
          ]
        }
      ];
      
      (validate as any).mockResolvedValue(mockErrors);
      (plainToClass as any).mockReturnValue({ user: { name: 123 } });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: NestedDto,
        data: undefined
      };
      
      await expect(pipe.transform({ user: { name: 123 } }, metadata))
        .rejects.toThrow('Validation failed: user should not be empty, name must be a string');
    });

    it('应该处理只有 children 错误的情况', async () => {
      const mockErrors = [
        {
          property: 'user',
          children: [
            {
              property: 'name',
              constraints: {
                isString: 'name must be a string'
              }
            }
          ]
        }
      ];
      
      (validate as any).mockResolvedValue(mockErrors);
      (plainToClass as any).mockReturnValue({ user: { name: 123 } });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: NestedDto,
        data: undefined
      };
      
      await expect(pipe.transform({ user: { name: 123 } }, metadata))
        .rejects.toThrow('Validation failed: name must be a string');
    });

    it('应该处理只有 constraints 的错误', async () => {
      const mockErrors = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty'
          }
        }
      ];
      
      (validate as any).mockResolvedValue(mockErrors);
      (plainToClass as any).mockReturnValue({ name: '' });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: undefined
      };
      
      await expect(pipe.transform({ name: '' }, metadata))
        .rejects.toThrow('Validation failed: name should not be empty');
    });

    it('应该处理空错误数组的情况', async () => {
      const mockErrors = [
        {
          property: 'field',
          // 没有 constraints 或 children
        }
      ];
      
      (validate as any).mockResolvedValue(mockErrors);
      (plainToClass as any).mockReturnValue({ field: 'value' });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: undefined
      };
      
      await expect(pipe.transform({ field: 'value' }, metadata))
        .rejects.toThrow('Validation failed: ');
    });
  });

  describe('transform 选项处理', () => {
         it('应该在禁用 transform 时跳过 plainToClass', async () => {
       (validate as any).mockResolvedValue([]);
       
       const pipeWithoutTransform = new ValidationPipe({ transform: false });
       
       const metadata: ArgumentMetadata = {
         type: 'body',
         metatype: TestDto,
         data: undefined
       };
       
       const inputValue = { name: 'test', age: 25 };
       const result = await pipeWithoutTransform.transform(inputValue, metadata);
       
       expect(plainToClass).not.toHaveBeenCalled();
       expect(result).toBe(inputValue);
     });

    it('应该在启用 transform 时使用 plainToClass', async () => {
      const transformedObject = { name: 'test', age: 25 };
      (validate as any).mockResolvedValue([]);
      (plainToClass as any).mockReturnValue(transformedObject);
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: undefined
      };
      
      const inputValue = { name: 'test', age: '25' };
      const result = await pipeWithTransform.transform(inputValue, metadata);
      
      expect(plainToClass).toHaveBeenCalledWith(TestDto, inputValue, undefined);
      expect(result).toBe(transformedObject);
    });

    it('应该传递 transformOptions 给 plainToClass', async () => {
      const transformOptions = { excludeExtraneousValues: true };
      const transformedObject = { name: 'test' };
      
      (validate as any).mockResolvedValue([]);
      (plainToClass as any).mockReturnValue(transformedObject);
      
      const pipeWithOptions = new ValidationPipe({
        transform: true,
        transformOptions
      });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestDto,
        data: undefined
      };
      
      const inputValue = { name: 'test', extraField: 'ignored' };
      const result = await pipeWithOptions.transform(inputValue, metadata);
      
      expect(plainToClass).toHaveBeenCalledWith(TestDto, inputValue, transformOptions);
      expect(result).toBe(transformedObject);
    });
  });

  describe('边界情况', () => {
    it('应该处理 null 值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: undefined
      };
      
      const result = await pipe.transform(null, metadata);
      expect(result).toBe(null);
    });

    it('应该处理 undefined 值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: undefined
      };
      
      const result = await pipe.transform(undefined, metadata);
      expect(result).toBe(undefined);
    });

    it('应该处理空字符串', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: undefined
      };
      
      const result = await pipe.transform('', metadata);
      expect(result).toBe('');
    });

    it('应该处理数字 0', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Number,
        data: undefined
      };
      
      const result = await pipe.transform(0, metadata);
      expect(result).toBe(0);
    });

    it('应该处理布尔值 false', async () => {
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: Boolean,
        data: undefined
      };
      
      const result = await pipe.transform(false, metadata);
      expect(result).toBe(false);
    });

    it('应该处理特殊数字值', async () => {
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: Number,
        data: 'value'
      };
      
      const pipeWithTransform = new ValidationPipe({ transform: true });
      
      // 测试 NaN
      const nanResult = await pipeWithTransform.transform('NaN', metadata);
      expect(nanResult).toBe('NaN'); // 应该保持字符串
      
      // 测试 Infinity
      const infResult = await pipeWithTransform.transform('Infinity', metadata);
      expect(infResult).toBe(Infinity);
      
      // 测试负数
      const negResult = await pipeWithTransform.transform('-42', metadata);
      expect(negResult).toBe(-42);
    });

    it('应该处理深层嵌套的验证错误', async () => {
      const deeplyNestedErrors = [
        {
          property: 'level1',
          children: [
            {
              property: 'level2',
              children: [
                {
                  property: 'level3',
                  constraints: {
                    isString: 'level3 must be a string'
                  }
                }
              ]
            }
          ]
        }
      ];
      
      (validate as any).mockResolvedValue(deeplyNestedErrors);
      (plainToClass as any).mockReturnValue({ level1: { level2: { level3: 123 } } });
      
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: class DeepDto {},
        data: undefined
      };
      
      await expect(pipe.transform({ level1: { level2: { level3: 123 } } }, metadata))
        .rejects.toThrow('Validation failed: level3 must be a string');
    });
  });
}); 