import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ControllerRegistrar } from '../factory/controller-registrar.js';
import { IsEmail, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';

// 测试用的本地 DTO
class TestUserDto {
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

describe('Pipes Integration', () => {
  describe('DTO Detection', () => {
    it('should detect DTO classes correctly', () => {
      const registrar = new (ControllerRegistrar as any)();
      
      // Test with TestUserDto
      const isDto = registrar.isDtoClass(TestUserDto);
      console.log('TestUserDto is DTO:', isDto);
      
      // Test with primitive types
      expect(registrar.isDtoClass(String)).toBe(false);
      expect(registrar.isDtoClass(Number)).toBe(false);
      expect(registrar.isDtoClass(Boolean)).toBe(false);
      
      // Test with regular object
      expect(registrar.isDtoClass(Object)).toBe(false);
      
      // Test with undefined/null
      expect(registrar.isDtoClass(undefined)).toBe(false);
      expect(registrar.isDtoClass(null)).toBe(false);
    });

    it('should check metadata keys on DTO class', () => {
      const prototype = TestUserDto.prototype;
      const propertyNames = Object.getOwnPropertyNames(prototype);
      
      console.log('TestUserDto property names:', propertyNames);
      
      for (const prop of propertyNames) {
        if (prop === 'constructor') continue;
        
        const keys = Reflect.getMetadataKeys(prototype, prop) || [];
        console.log(`Property ${prop} metadata keys:`, keys);
        
        for (const key of keys) {
          const value = Reflect.getMetadata(key, prototype, prop);
          console.log(`  ${key}:`, value);
        }
      }
    });
  });
});
