import 'reflect-metadata';

/**
 * 条件注入装饰器常量
 */
export const CONDITIONAL_METADATA_KEY = Symbol('conditional');

/**
 * 条件配置接口
 */
export interface ConditionalConfig {
  /** 环境变量名 */
  env?: string;
  /** 配置键名 */
  config?: string;
  /** 期望的值 */
  value?: any;
  /** 自定义条件函数 */
  condition?: () => boolean;
}

/**
 * 条件注入装饰器
 * 只有当指定条件满足时，才会注册该服务到 DI 容器
 * 
 * @param config 条件配置
 * 
 * @example
 * ```typescript
 * // 只在生产环境注册
 * @ConditionalOn({ env: 'NODE_ENV', value: 'production' })
 * @Injectable()
 * class ProductionService {
 *   // ...
 * }
 * 
 * // 根据配置注册
 * @ConditionalOn({ config: 'feature.redis', value: true })
 * @Injectable()
 * class RedisService {
 *   // ...
 * }
 * 
 * // 自定义条件
 * @ConditionalOn({ condition: () => process.platform === 'darwin' })
 * @Injectable()
 * class MacOSService {
 *   // ...
 * }
 * ```
 */
export function ConditionalOn(config: ConditionalConfig): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(CONDITIONAL_METADATA_KEY, config, target);
  };
}

/**
 * 检查类是否有条件注入配置
 */
export function getConditionalConfig(target: any): ConditionalConfig | undefined {
  return Reflect.getMetadata(CONDITIONAL_METADATA_KEY, target);
}

/**
 * 获取条件注入元数据
 */
export function getConditionalMetadata(target: any): ConditionalConfig | undefined {
  return Reflect.getMetadata(CONDITIONAL_METADATA_KEY, target);
}

/**
 * 检查条件是否满足
 */
export function checkCondition(config: ConditionalConfig): boolean {
  // 检查环境变量条件
  if (config.env) {
    const envValue = process.env[config.env];
    return envValue === config.value;
  }
  
  // 检查配置条件
  if (config.config) {
    // 这里可以扩展为从实际配置系统获取值
    // 目前简单地从环境变量获取
    const configValue = process.env[config.config.replace('.', '_').toUpperCase()];
    return configValue === String(config.value);
  }
  
  // 检查自定义条件
  if (config.condition) {
    try {
      return config.condition();
    } catch (error) {
      console.warn(`条件检查失败: ${error}`);
      return false;
    }
  }
  
  return true;
}