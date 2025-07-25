import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { 
  ParseIntPipe, 
  ParseFloatPipe, 
  ParseBoolPipe, 
  ParseUUIDPipe, 
  ParseArrayPipe 
} from '../pipes/built-in.pipes.js';
import { ValidationPipe, ValidationException } from '../pipes/validation.pipe.js';
import { ArgumentMetadata } from '@rapidojs/common';
import { IsEmail, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

// 测试用的 DTO 类
class TestDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}

describe('Pipes', () => {
  describe('Built-in Pipes', () => {
    describe('ParseIntPipe', () => {
      const pipe = new ParseIntPipe();
      const metadata: ArgumentMetadata = { type: 'query', data: 'id' };

      it('should parse valid integer strings', () => {
        expect(pipe.transform('123', metadata)).toBe(123);
        expect(pipe.transform('0', metadata)).toBe(0);
        expect(pipe.transform('-456', metadata)).toBe(-456);
      });

      it('should throw error for invalid integer strings', () => {
        expect(() => pipe.transform('abc', metadata)).toThrow('Validation failed (numeric string is expected). Received: abc');
        expect(() => pipe.transform('', metadata)).toThrow();
        expect(() => pipe.transform('not-a-number', metadata)).toThrow();
      });

      it('should parse decimal strings to integers (truncating)', () => {
        // parseInt('12.34') returns 12, which is expected behavior
        expect(pipe.transform('12.34', metadata)).toBe(12);
        expect(pipe.transform('99.99', metadata)).toBe(99);
      });
    });

    describe('ParseFloatPipe', () => {
      const pipe = new ParseFloatPipe();
      const metadata: ArgumentMetadata = { type: 'query', data: 'price' };

      it('should parse valid float strings', () => {
        expect(pipe.transform('123.45', metadata)).toBe(123.45);
        expect(pipe.transform('0.0', metadata)).toBe(0.0);
        expect(pipe.transform('-456.78', metadata)).toBe(-456.78);
        expect(pipe.transform('123', metadata)).toBe(123);
      });

      it('should throw error for invalid float strings', () => {
        expect(() => pipe.transform('abc', metadata)).toThrow('Validation failed (numeric string is expected). Received: abc');
        expect(() => pipe.transform('', metadata)).toThrow();
      });
    });

    describe('ParseBoolPipe', () => {
      const pipe = new ParseBoolPipe();
      const metadata: ArgumentMetadata = { type: 'query', data: 'active' };

      it('should parse valid boolean strings', () => {
        expect(pipe.transform('true', metadata)).toBe(true);
        expect(pipe.transform('1', metadata)).toBe(true);
        expect(pipe.transform('false', metadata)).toBe(false);
        expect(pipe.transform('0', metadata)).toBe(false);
      });

      it('should throw error for invalid boolean strings', () => {
        expect(() => pipe.transform('yes', metadata)).toThrow('Validation failed (boolean string is expected). Received: yes');
        expect(() => pipe.transform('no', metadata)).toThrow();
        expect(() => pipe.transform('2', metadata)).toThrow();
      });
    });

    describe('ParseUUIDPipe', () => {
      const pipe = new ParseUUIDPipe();
      const metadata: ArgumentMetadata = { type: 'param', data: 'id' };

      it('should validate valid UUIDs', () => {
        const validUUID = '550e8400-e29b-41d4-a716-446655440000';
        expect(pipe.transform(validUUID, metadata)).toBe(validUUID);
      });

      it('should throw error for invalid UUIDs', () => {
        expect(() => pipe.transform('invalid-uuid', metadata)).toThrow('Validation failed (uuid is expected). Received: invalid-uuid');
        expect(() => pipe.transform('123', metadata)).toThrow();
        expect(() => pipe.transform('', metadata)).toThrow();
      });
    });

    describe('ParseArrayPipe', () => {
      it('should parse comma-separated strings into arrays', () => {
        const pipe = new ParseArrayPipe();
        const metadata: ArgumentMetadata = { type: 'query', data: 'tags' };
        
        expect(pipe.transform('a,b,c', metadata)).toEqual(['a', 'b', 'c']);
        expect(pipe.transform('single', metadata)).toEqual(['single']);
        expect(pipe.transform('', metadata)).toEqual(['']);
      });

      it('should support custom separators', () => {
        const pipe = new ParseArrayPipe({ separator: '|' });
        const metadata: ArgumentMetadata = { type: 'query', data: 'tags' };
        
        expect(pipe.transform('a|b|c', metadata)).toEqual(['a', 'b', 'c']);
      });

      it('should apply item pipe to each element', () => {
        const pipe = new ParseArrayPipe({ items: new ParseIntPipe() });
        const metadata: ArgumentMetadata = { type: 'query', data: 'numbers' };
        
        expect(pipe.transform('1,2,3', metadata)).toEqual([1, 2, 3]);
      });
    });
  });

  describe('ValidationPipe', () => {
    it('should validate and transform valid objects', async () => {
      const pipe = new ValidationPipe();
      const metadata: ArgumentMetadata = { 
        type: 'body', 
        metatype: TestDto 
      };
      
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };

      const result = await pipe.transform(validData, metadata);
      expect(result).toBeInstanceOf(TestDto);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(25);
    });

    it('should throw ValidationException for invalid objects', async () => {
      const pipe = new ValidationPipe();
      const metadata: ArgumentMetadata = { 
        type: 'body', 
        metatype: TestDto 
      };
      
      const invalidData = {
        name: '', // 空字符串，违反 @IsNotEmpty
        email: 'invalid-email', // 无效邮箱
        age: 150 // 超过最大值
      };

      await expect(pipe.transform(invalidData, metadata)).rejects.toThrow(ValidationException);
    });

    it('should skip validation for primitive types', async () => {
      const pipe = new ValidationPipe();
      const metadata: ArgumentMetadata = { 
        type: 'query', 
        metatype: String 
      };
      
      const result = await pipe.transform('test', metadata);
      expect(result).toBe('test');
    });

    it('should transform primitive values when enabled', async () => {
      const pipe = new ValidationPipe({ transform: true });
      
      // 测试布尔值转换
      let metadata: ArgumentMetadata = { 
        type: 'query', 
        metatype: Boolean,
        data: 'active'
      };
      expect(await pipe.transform('true', metadata)).toBe(true);
      expect(await pipe.transform('false', metadata)).toBe(false);
      
      // 测试数字转换
      metadata = { 
        type: 'param', 
        metatype: Number,
        data: 'id'
      };
      expect(await pipe.transform('123', metadata)).toBe(123);
    });

    it('should handle optional properties correctly', async () => {
      const pipe = new ValidationPipe();
      const metadata: ArgumentMetadata = { 
        type: 'body', 
        metatype: TestDto 
      };
      
      const dataWithoutAge = {
        name: 'John Doe',
        email: 'john@example.com'
        // age 是可选的
      };

      const result = await pipe.transform(dataWithoutAge, metadata);
      expect(result).toBeInstanceOf(TestDto);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBeUndefined();
    });
  });

  describe('Pipe Error Handling', () => {
    it('should provide meaningful error messages', () => {
      const pipe = new ParseIntPipe();
      const metadata: ArgumentMetadata = { type: 'query', data: 'count' };
      
      try {
        pipe.transform('not-a-number', metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Validation failed');
        expect((error as Error).message).toContain('not-a-number');
      }
    });

    it('should handle ValidationException properly', async () => {
      const pipe = new ValidationPipe();
      const metadata: ArgumentMetadata = { 
        type: 'body', 
        metatype: TestDto 
      };
      
      const invalidData = {
        name: '',
        email: 'invalid'
      };

      try {
        await pipe.transform(invalidData, metadata);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationException);
        expect((error as ValidationException).message).toContain('Validation failed');
      }
    });
  });
});
