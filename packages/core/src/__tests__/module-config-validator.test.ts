import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleConfigValidator, ConfigSchema, CONFIG_SCHEMA_METADATA_KEY } from '../modules/config-validator.js';
import { Module } from '@rapidojs/common';

describe('Module Config Validator', () => {
  describe('Basic Validation', () => {
    it('should validate string fields', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
        description: { type: 'string' as const, default: 'No description' }
      };
      
      const config = { name: 'test-service' };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedConfig.name).toBe('test-service');
      expect(result.normalizedConfig.description).toBe('No description');
    });

    it('should validate number fields', () => {
      const schema = {
        port: { type: 'number' as const, required: true },
        timeout: { type: 'number' as const, default: 5000 }
      };
      
      const config = { port: 3000 };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.port).toBe(3000);
      expect(result.normalizedConfig.timeout).toBe(5000);
    });

    it('should validate boolean fields', () => {
      const schema = {
        enabled: { type: 'boolean' as const, required: true },
        debug: { type: 'boolean' as const, default: false }
      };
      
      const config = { enabled: true };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.enabled).toBe(true);
      expect(result.normalizedConfig.debug).toBe(false);
    });

    it('should validate array fields', () => {
      const schema = {
        tags: { type: 'array' as const, default: [] },
        hosts: { type: 'array' as const, required: true }
      };
      
      const config = { hosts: ['localhost', '127.0.0.1'] };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.hosts).toEqual(['localhost', '127.0.0.1']);
      expect(result.normalizedConfig.tags).toEqual([]);
    });

    it('should validate object fields', () => {
      const schema = {
        database: { type: 'object' as const, required: true },
        cache: { type: 'object' as const, default: {} }
      };
      
      const config = { database: { host: 'localhost', port: 5432 } };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.database).toEqual({ host: 'localhost', port: 5432 });
      expect(result.normalizedConfig.cache).toEqual({});
    });
  });

  describe('Validation Errors', () => {
    it('should report missing required fields', () => {
      const schema = {
        name: { type: 'string' as const, required: true },
        port: { type: 'number' as const, required: true }
      };
      
      const config = { name: 'test' };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('port');
      expect(result.errors[0].message).toContain('必填');
    });

    it('should report type mismatches', () => {
      const schema = {
        port: { type: 'number' as const, required: true },
        enabled: { type: 'boolean' as const, required: true }
      };
      
      const config = { port: '3000', enabled: 'true' };
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('期望类型为');
      expect(result.errors[1].message).toContain('期望类型为');
    });
  });

  describe('Custom Validators', () => {
    it('should run custom validation functions', () => {
      const schema = {
        port: {
          type: 'number' as const,
          required: true,
          validator: (value: number) => value > 0 && value < 65536
        },
        email: {
          type: 'string' as const,
          required: true,
          validator: (value: string) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) || '邮箱格式不正确';
          }
        }
      };
      
      const validConfig = { port: 3000, email: 'test@example.com' };
      const validResult = ModuleConfigValidator.validateConfig(validConfig, schema);
      
      expect(validResult.valid).toBe(true);
      
      const invalidConfig = { port: 70000, email: 'invalid-email' };
      const invalidResult = ModuleConfigValidator.validateConfig(invalidConfig, schema);
      
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });
  });

  describe('Nested Object Validation', () => {
    it('should validate nested objects', () => {
      const schema = {
        database: {
          host: { type: 'string' as const, required: true },
          port: { type: 'number' as const, default: 5432 },
          credentials: {
            username: { type: 'string' as const, required: true },
            password: { type: 'string' as const, required: true }
          }
        }
      };
      
      const config = {
        database: {
          host: 'localhost',
          credentials: {
            username: 'admin',
            password: 'secret'
          }
        }
      };
      
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.database.host).toBe('localhost');
      expect(result.normalizedConfig.database.port).toBe(5432);
      expect(result.normalizedConfig.database.credentials.username).toBe('admin');
    });

    it('should report errors in nested objects with correct paths', () => {
      const schema = {
        database: {
          host: { type: 'string' as const, required: true },
          credentials: {
            username: { type: 'string' as const, required: true },
            password: { type: 'string' as const, required: true }
          }
        }
      };
      
      const config = {
        database: {
          host: 'localhost',
          credentials: {
            username: 'admin'
            // missing password
          }
        }
      };
      
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toBe('database.credentials.password');
    });
  });

  describe('Predefined Rules', () => {
    it('should use string rules with constraints', () => {
      const rule = ModuleConfigValidator.rules.string({
        required: true,
        minLength: 3,
        maxLength: 10,
        pattern: /^[a-zA-Z]+$/
      });
      
      const schema = { name: rule };
      
      // Valid case
      const validResult = ModuleConfigValidator.validateConfig(
        { name: 'hello' },
        schema
      );
      expect(validResult.valid).toBe(true);
      
      // Too short
      const shortResult = ModuleConfigValidator.validateConfig(
        { name: 'hi' },
        schema
      );
      expect(shortResult.valid).toBe(false);
      expect(shortResult.errors[0].message).toContain('不能少于');
      
      // Invalid pattern
      const patternResult = ModuleConfigValidator.validateConfig(
        { name: 'hello123' },
        schema
      );
      expect(patternResult.valid).toBe(false);
      expect(patternResult.errors[0].message).toContain('格式不匹配');
    });

    it('should use number rules with constraints', () => {
      const rule = ModuleConfigValidator.rules.number({
        required: true,
        min: 1,
        max: 100,
        integer: true
      });
      
      const schema = { count: rule };
      
      // Valid case
      const validResult = ModuleConfigValidator.validateConfig(
        { count: 50 },
        schema
      );
      expect(validResult.valid).toBe(true);
      
      // Too small
      const minResult = ModuleConfigValidator.validateConfig(
        { count: 0 },
        schema
      );
      expect(minResult.valid).toBe(false);
      
      // Not integer
      const integerResult = ModuleConfigValidator.validateConfig(
        { count: 50.5 },
        schema
      );
      expect(integerResult.valid).toBe(false);
      expect(integerResult.errors[0].message).toContain('整数');
    });

    it('should use port rule', () => {
      const rule = ModuleConfigValidator.rules.port({ required: true });
      const schema = { port: rule };
      
      // Valid port
      const validResult = ModuleConfigValidator.validateConfig(
        { port: 3000 },
        schema
      );
      expect(validResult.valid).toBe(true);
      
      // Invalid port
      const invalidResult = ModuleConfigValidator.validateConfig(
        { port: 70000 },
        schema
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].message).toContain('1-65535');
    });

    it('should use URL rule', () => {
      const rule = ModuleConfigValidator.rules.url({
        required: true,
        protocols: ['http', 'https']
      });
      const schema = { url: rule };
      
      // Valid URL
      const validResult = ModuleConfigValidator.validateConfig(
        { url: 'https://example.com' },
        schema
      );
      expect(validResult.valid).toBe(true);
      
      // Invalid protocol
      const protocolResult = ModuleConfigValidator.validateConfig(
        { url: 'ftp://example.com' },
        schema
      );
      expect(protocolResult.valid).toBe(false);
      expect(protocolResult.errors[0].message).toContain('协议必须是');
    });

    it('should use enum rule', () => {
      const rule = ModuleConfigValidator.rules.enum(
        ['development', 'production', 'test'],
        { required: true }
      );
      const schema = { env: rule };
      
      // Valid enum value
      const validResult = ModuleConfigValidator.validateConfig(
        { env: 'production' },
        schema
      );
      expect(validResult.valid).toBe(true);
      
      // Invalid enum value
      const invalidResult = ModuleConfigValidator.validateConfig(
        { env: 'staging' },
        schema
      );
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].message).toContain('必须是以下之一');
    });
  });

  describe('ConfigSchema Decorator', () => {
    it('should store schema metadata on class', () => {
      const schema = {
        host: { type: 'string' as const, required: true },
        port: { type: 'number' as const, default: 3000 }
      };
      
      @ConfigSchema(schema)
      @Module({})
      class TestModule {}
      
      const storedSchema = Reflect.getMetadata(CONFIG_SCHEMA_METADATA_KEY, TestModule);
      expect(storedSchema).toEqual(schema);
    });
  });

  describe('Module Config Validation', () => {
    it('should validate module configuration using decorator schema', () => {
      const schema = {
        database: {
          host: { type: 'string' as const, required: true },
          port: { type: 'number' as const, default: 5432 }
        },
        cache: {
          enabled: { type: 'boolean' as const, default: true },
          ttl: { type: 'number' as const, default: 3600 }
        }
      };
      
      @ConfigSchema(schema)
      @Module({})
      class DatabaseModule {
        static forRoot(config: any) {
          return {
            module: DatabaseModule,
            providers: [
              { provide: 'DATABASE_CONFIG', useValue: config }
            ]
          };
        }
      }
      
      const config = {
        database: {
          host: 'localhost'
        }
      };
      
      const result = ModuleConfigValidator.validateModuleConfig(DatabaseModule, config);
      
      expect(result.valid).toBe(true);
      expect(result.normalizedConfig.database.host).toBe('localhost');
      expect(result.normalizedConfig.database.port).toBe(5432);
      expect(result.normalizedConfig.cache.enabled).toBe(true);
    });

    it('should handle modules without schema', () => {
      @Module({})
      class SimpleModule {}
      
      const result = ModuleConfigValidator.validateModuleConfig(SimpleModule, { any: 'config' });
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('未定义配置 Schema');
    });
  });

  describe('Warnings', () => {
    it('should warn about unknown configuration fields', () => {
      const schema = {
        name: { type: 'string' as const, required: true }
      };
      
      const config = {
        name: 'test',
        unknownField: 'value',
        anotherUnknown: 123
      };
      
      const result = ModuleConfigValidator.validateConfig(config, schema);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].message).toContain('未知的配置字段');
      expect(result.warnings[1].message).toContain('未知的配置字段');
    });
  });
});