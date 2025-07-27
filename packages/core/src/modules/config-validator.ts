import { Type } from '../types.js';
import { ModuleType } from '../types.js';
import { isDynamicModule } from '../utils/module.utils.js';
import { MODULE_METADATA_KEY } from '../constants.js';

/**
 * 配置验证规则类型
 */
export type ValidationRule = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function';
  required?: boolean;
  default?: any;
  validator?: (value: any) => boolean | string;
  description?: string;
};

/**
 * 配置 Schema 接口
 */
export interface ConfigSchema {
  [key: string]: ValidationRule | ConfigSchema;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  normalizedConfig?: any;
}

/**
 * 验证错误接口
 */
export interface ValidationError {
  path: string;
  message: string;
  value?: any;
  rule?: ValidationRule;
}

/**
 * 验证警告接口
 */
export interface ValidationWarning {
  path: string;
  message: string;
  value?: any;
}

/**
 * 模块配置验证器常量
 */
export const CONFIG_SCHEMA_METADATA_KEY = Symbol('config_schema');

/**
 * 配置 Schema 装饰器
 * 用于为模块定义配置验证规则
 * 
 * @param schema 配置 Schema
 * 
 * @example
 * ```typescript
 * @ConfigSchema({
 *   host: { type: 'string', required: true, default: 'localhost' },
 *   port: { type: 'number', required: true, validator: (v) => v > 0 && v < 65536 },
 *   ssl: { type: 'boolean', default: false },
 *   options: {
 *     timeout: { type: 'number', default: 5000 },
 *     retries: { type: 'number', default: 3 }
 *   }
 * })
 * @Module({
 *   // ...
 * })
 * export class DatabaseModule {
 *   static forRoot(config: DatabaseConfig): DynamicModule {
 *     // 配置会自动验证
 *     return {
 *       module: DatabaseModule,
 *       providers: [
 *         { provide: 'DATABASE_CONFIG', useValue: config }
 *       ]
 *     };
 *   }
 * }
 * ```
 */
export function ConfigSchema(schema: ConfigSchema): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(CONFIG_SCHEMA_METADATA_KEY, schema, target);
  };
}

/**
 * 模块配置验证器
 */
export class ModuleConfigValidator {
  /**
   * 验证模块配置
   */
  static validateModuleConfig(
    module: ModuleType,
    config: any
  ): ValidationResult {
    const schema = this.getConfigSchema(module);
    
    if (!schema) {
      return {
        valid: true,
        errors: [],
        warnings: [{
          path: '',
          message: '模块未定义配置 Schema，跳过验证'
        }],
        normalizedConfig: config
      };
    }

    return this.validateConfig(config, schema);
  }

  /**
   * 获取模块的配置 Schema
   */
  private static getConfigSchema(module: ModuleType): ConfigSchema | undefined {
    if (isDynamicModule(module)) {
      // 动态模块可能在 module 属性上有 Schema
      return Reflect.getMetadata(CONFIG_SCHEMA_METADATA_KEY, module.module);
    }
    
    const resolvedModule = 'forwardRef' in module ? module() : module;
    return Reflect.getMetadata(CONFIG_SCHEMA_METADATA_KEY, resolvedModule);
  }

  /**
   * 验证配置对象
   */
  static validateConfig(
    config: any,
    schema: ConfigSchema,
    path: string = ''
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const normalizedConfig: any = {};

    // 验证 schema 中定义的每个字段
    for (const [key, rule] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${key}` : key;
      const value = config?.[key];

      if (this.isValidationRule(rule)) {
        const result = this.validateField(value, rule, fieldPath);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        
        if (result.normalizedValue !== undefined) {
          normalizedConfig[key] = result.normalizedValue;
        }
      } else {
        // 嵌套对象验证
        const nestedResult = this.validateConfig(value || {}, rule, fieldPath);
        errors.push(...nestedResult.errors);
        warnings.push(...nestedResult.warnings);
        
        // 只有当嵌套结果不为空对象时才添加到normalizedConfig
        if (nestedResult.normalizedConfig !== undefined && Object.keys(nestedResult.normalizedConfig).length > 0) {
          normalizedConfig[key] = nestedResult.normalizedConfig;
        }
      }
    }

    // 检查配置中是否有未定义的字段
    if (config && typeof config === 'object') {
      for (const key of Object.keys(config)) {
        if (!(key in schema)) {
          warnings.push({
            path: path ? `${path}.${key}` : key,
            message: `未知的配置字段 '${key}'`,
            value: config[key]
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      normalizedConfig
    };
  }

  /**
   * 验证单个字段
   */
  private static validateField(
    value: any,
    rule: ValidationRule,
    path: string
  ): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    normalizedValue?: any;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let normalizedValue = value;

    // 检查必填字段
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        path,
        message: `字段 '${path}' 是必填的`,
        rule
      });
      return { errors, warnings };
    }

    // 应用默认值
    if (value === undefined && rule.default !== undefined) {
      normalizedValue = typeof rule.default === 'function' ? rule.default() : rule.default;
    }

    // 如果值为 undefined 且不是必填，跳过类型检查
    if (normalizedValue === undefined) {
      return { errors, warnings, normalizedValue };
    }

    // 类型验证
    const typeError = this.validateType(normalizedValue, rule.type, path);
    if (typeError) {
      errors.push(typeError);
      return { errors, warnings };
    }

    // 自定义验证器
    if (rule.validator) {
      try {
        const validationResult = rule.validator(normalizedValue);
        if (validationResult === false) {
          errors.push({
            path,
            message: `字段 '${path}' 验证失败`,
            value: normalizedValue,
            rule
          });
        } else if (typeof validationResult === 'string') {
          errors.push({
            path,
            message: validationResult,
            value: normalizedValue,
            rule
          });
        }
      } catch (error) {
        errors.push({
          path,
          message: `字段 '${path}' 验证器执行失败: ${error}`,
          value: normalizedValue,
          rule
        });
      }
    }

    return { errors, warnings, normalizedValue };
  }

  /**
   * 验证类型
   */
  private static validateType(
    value: any,
    expectedType: ValidationRule['type'],
    path: string
  ): ValidationError | null {
    const actualType = this.getValueType(value);
    
    if (actualType !== expectedType) {
      return {
        path,
        message: `字段 '${path}' 期望类型为 '${expectedType}'，实际类型为 '${actualType}'`,
        value
      };
    }
    
    return null;
  }

  /**
   * 获取值的类型
   */
  private static getValueType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * 检查是否为验证规则
   */
  private static isValidationRule(obj: any): obj is ValidationRule {
    return obj && typeof obj === 'object' && 'type' in obj;
  }

  /**
   * 创建预定义的验证规则
   */
  static rules = {
    /**
     * 字符串规则
     */
    string: (options?: {
      required?: boolean;
      default?: string;
      minLength?: number;
      maxLength?: number;
      pattern?: RegExp;
    }): ValidationRule => ({
      type: 'string',
      required: options?.required,
      default: options?.default,
      validator: (value: string) => {
        if (options?.minLength && value.length < options.minLength) {
          return `字符串长度不能少于 ${options.minLength} 个字符`;
        }
        if (options?.maxLength && value.length > options.maxLength) {
          return `字符串长度不能超过 ${options.maxLength} 个字符`;
        }
        if (options?.pattern && !options.pattern.test(value)) {
          return `字符串格式不匹配`;
        }
        return true;
      }
    }),

    /**
     * 数字规则
     */
    number: (options?: {
      required?: boolean;
      default?: number;
      min?: number;
      max?: number;
      integer?: boolean;
    }): ValidationRule => ({
      type: 'number',
      required: options?.required,
      default: options?.default,
      validator: (value: number) => {
        if (options?.integer && !Number.isInteger(value)) {
          return '必须是整数';
        }
        if (options?.min !== undefined && value < options.min) {
          return `数值不能小于 ${options.min}`;
        }
        if (options?.max !== undefined && value > options.max) {
          return `数值不能大于 ${options.max}`;
        }
        return true;
      }
    }),

    /**
     * 布尔规则
     */
    boolean: (options?: {
      required?: boolean;
      default?: boolean;
    }): ValidationRule => ({
      type: 'boolean',
      required: options?.required,
      default: options?.default
    }),

    /**
     * 数组规则
     */
    array: (options?: {
      required?: boolean;
      default?: any[];
      minLength?: number;
      maxLength?: number;
      itemType?: ValidationRule['type'];
    }): ValidationRule => ({
      type: 'array',
      required: options?.required,
      default: options?.default,
      validator: (value: any[]) => {
        if (options?.minLength && value.length < options.minLength) {
          return `数组长度不能少于 ${options.minLength} 个元素`;
        }
        if (options?.maxLength && value.length > options.maxLength) {
          return `数组长度不能超过 ${options.maxLength} 个元素`;
        }
        if (options?.itemType) {
          for (let i = 0; i < value.length; i++) {
            const itemType = ModuleConfigValidator.getValueType(value[i]);
            if (itemType !== options.itemType) {
              return `数组第 ${i} 个元素类型错误，期望 '${options.itemType}'，实际 '${itemType}'`;
            }
          }
        }
        return true;
      }
    }),

    /**
     * 对象规则
     */
    object: (options?: {
      required?: boolean;
      default?: object;
    }): ValidationRule => ({
      type: 'object',
      required: options?.required,
      default: options?.default
    }),

    /**
     * 枚举规则
     */
    enum: <T>(values: T[], options?: {
      required?: boolean;
      default?: T;
    }): ValidationRule => ({
      type: 'string',
      required: options?.required,
      default: options?.default,
      validator: (value: T) => {
        if (!values.includes(value)) {
          return `值必须是以下之一: ${values.join(', ')}`;
        }
        return true;
      }
    }),

    /**
     * URL 规则
     */
    url: (options?: {
      required?: boolean;
      default?: string;
      protocols?: string[];
    }): ValidationRule => ({
      type: 'string',
      required: options?.required,
      default: options?.default,
      validator: (value: string) => {
        try {
          const url = new URL(value);
          if (options?.protocols && !options.protocols.includes(url.protocol.slice(0, -1))) {
            return `URL 协议必须是以下之一: ${options.protocols.join(', ')}`;
          }
          return true;
        } catch {
          return '必须是有效的 URL';
        }
      }
    }),

    /**
     * 端口号规则
     */
    port: (options?: {
      required?: boolean;
      default?: number;
    }): ValidationRule => ({
      type: 'number',
      required: options?.required,
      default: options?.default,
      validator: (value: number) => {
        if (!Number.isInteger(value) || value < 1 || value > 65535) {
          return '端口号必须是 1-65535 之间的整数';
        }
        return true;
      }
    })
  };
}