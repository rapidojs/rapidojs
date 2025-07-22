import 'reflect-metadata';
import { ConfigPropertyMetadata } from '../types.js';
import { CONFIG_PROPERTY_METADATA } from '../constants.js';

/**
 * @ConfigProperty 装饰器
 * 用于标记需要从配置中注入的属性
 * 
 * @example
 * class DatabaseConfig {
 *   @ConfigProperty('database.host', { defaultValue: 'localhost' })
 *   host: string;
 * 
 *   @ConfigProperty('database.port', { 
 *     defaultValue: 5432, 
 *     transform: (val) => parseInt(val, 10) 
 *   })
 *   port: number;
 * }
 */
export function ConfigProperty(
  key: string,
  options: Partial<ConfigPropertyMetadata> = {}
): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const metadata: ConfigPropertyMetadata = {
      key,
      defaultValue: options.defaultValue,
      required: options.required ?? false,
      description: options.description,
      transform: options.transform,
    };

    // 获取现有的元数据或创建新的
    const existingMetadata = Reflect.getMetadata(CONFIG_PROPERTY_METADATA, target) || {};
    
    // 存储属性元数据
    existingMetadata[propertyKey] = metadata;
    
    Reflect.defineMetadata(CONFIG_PROPERTY_METADATA, existingMetadata, target);
  };
}

/**
 * 从对象中提取配置属性元数据
 * @param target 目标对象实例
 * @returns 配置属性元数据映射
 */
export function getConfigPropertyMetadata(target: any): Record<string, ConfigPropertyMetadata> {
  return Reflect.getMetadata(CONFIG_PROPERTY_METADATA, target.constructor.prototype) || {};
}

/**
 * 将配置数据注入到对象实例中
 * @param instance 目标实例
 * @param configData 配置数据
 */
export function injectConfigProperties(instance: any, configData: Record<string, any>): void {
  const metadata = getConfigPropertyMetadata(instance);
  
  for (const [propertyKey, propMetadata] of Object.entries(metadata)) {
    let value = getNestedValue(configData, propMetadata.key);
    
    // 如果没有找到值，使用默认值
    if (value === undefined) {
      if (propMetadata.defaultValue !== undefined) {
        value = propMetadata.defaultValue;
      } else if (propMetadata.required) {
        throw new Error(`必需的配置属性 "${propMetadata.key}" 未找到`);
      }
    }
    
    // 应用转换函数
    if (propMetadata.transform && value !== undefined) {
      try {
        value = propMetadata.transform(value);
      } catch (error) {
        throw new Error(`配置属性 "${propMetadata.key}" 转换失败: ${error}`);
      }
    }
    
    // 注入属性值
    instance[propertyKey] = value;
  }
}

/**
 * 获取嵌套值的辅助函数
 */
function getNestedValue(obj: any, key: string): any {
  const keys = key.split('.');
  let current = obj;
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  
  return current;
} 