import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { ConfigProperty, getConfigPropertyMetadata, injectConfigProperties } from '../decorators/config-property.decorator.js';

describe('@ConfigProperty 装饰器', () => {
  it('应该正确存储属性元数据', () => {
    class TestConfig {
      @ConfigProperty('app.name', { defaultValue: 'MyApp' })
      appName: string;

      @ConfigProperty('app.port', { 
        defaultValue: 3000, 
        transform: (val) => parseInt(val, 10),
        required: true 
      })
      port: number;
    }

    const instance = new TestConfig();
    const metadata = getConfigPropertyMetadata(instance);

    expect(metadata).toHaveProperty('appName');
    expect(metadata.appName.key).toBe('app.name');
    expect(metadata.appName.defaultValue).toBe('MyApp');
    expect(metadata.appName.required).toBe(false);

    expect(metadata).toHaveProperty('port');
    expect(metadata.port.key).toBe('app.port');
    expect(metadata.port.defaultValue).toBe(3000);
    expect(metadata.port.required).toBe(true);
    expect(typeof metadata.port.transform).toBe('function');
  });

  it('应该正确注入配置值', () => {
    class DatabaseConfig {
      @ConfigProperty('database.host', { defaultValue: 'localhost' })
      host: string;

      @ConfigProperty('database.port', { 
        defaultValue: 5432,
        transform: (val) => parseInt(val, 10) 
      })
      port: number;

      @ConfigProperty('database.ssl', {
        defaultValue: false,
        transform: (val) => val === 'true' || val === true
      })
      ssl: boolean;
    }

    const configData = {
      database: {
        host: 'db.example.com',
        port: '5433',
        ssl: 'true'
      }
    };

    const instance = new DatabaseConfig();
    injectConfigProperties(instance, configData);

    expect(instance.host).toBe('db.example.com');
    expect(instance.port).toBe(5433); // 转换为数字
    expect(instance.ssl).toBe(true); // 转换为布尔值
  });

  it('应该使用默认值当配置不存在时', () => {
    class AppConfig {
      @ConfigProperty('app.debug', { defaultValue: false })
      debug: boolean;

      @ConfigProperty('app.timeout', { defaultValue: 30000 })
      timeout: number;
    }

    const configData = {}; // 空配置

    const instance = new AppConfig();
    injectConfigProperties(instance, configData);

    expect(instance.debug).toBe(false);
    expect(instance.timeout).toBe(30000);
  });

  it('应该在必需属性缺失时抛出错误', () => {
    class RequiredConfig {
      @ConfigProperty('required.value', { required: true })
      value: string;
    }

    const configData = {}; // 空配置

    const instance = new RequiredConfig();
    
    expect(() => {
      injectConfigProperties(instance, configData);
    }).toThrow('必需的配置属性 "required.value" 未找到');
  });

  it('应该支持嵌套配置键', () => {
    class NestedConfig {
      @ConfigProperty('deep.nested.value')
      deepValue: string;

      @ConfigProperty('array.0.item')
      arrayItem: string;
    }

    const configData = {
      deep: {
        nested: {
          value: 'found'
        }
      },
      array: [
        { item: 'first' }
      ]
    };

    const instance = new NestedConfig();
    injectConfigProperties(instance, configData);

    expect(instance.deepValue).toBe('found');
    expect(instance.arrayItem).toBe('first');
  });

  it('应该在转换函数失败时抛出错误', () => {
    class TransformConfig {
      @ConfigProperty('number.value', {
        transform: (val) => {
          const num = parseInt(val, 10);
          if (isNaN(num)) {
            throw new Error('不是有效数字');
          }
          return num;
        }
      })
      numberValue: number;
    }

    const configData = {
      number: {
        value: 'not-a-number'
      }
    };

    const instance = new TransformConfig();
    
    expect(() => {
      injectConfigProperties(instance, configData);
    }).toThrow('配置属性 "number.value" 转换失败');
  });

  it('应该支持多种数据类型的转换', () => {
    class TypeConfig {
      @ConfigProperty('string.value')
      stringValue: string;

      @ConfigProperty('number.value', {
        transform: (val) => parseFloat(val)
      })
      numberValue: number;

      @ConfigProperty('boolean.value', {
        transform: (val) => val === 'true' || val === true
      })
      booleanValue: boolean;

      @ConfigProperty('array.value', {
        transform: (val) => Array.isArray(val) ? val : val.split(',')
      })
      arrayValue: string[];
    }

    const configData = {
      string: { value: 'hello' },
      number: { value: '42.5' },
      boolean: { value: 'true' },
      array: { value: 'a,b,c' }
    };

    const instance = new TypeConfig();
    injectConfigProperties(instance, configData);

    expect(instance.stringValue).toBe('hello');
    expect(instance.numberValue).toBe(42.5);
    expect(instance.booleanValue).toBe(true);
    expect(instance.arrayValue).toEqual(['a', 'b', 'c']);
  });
}); 