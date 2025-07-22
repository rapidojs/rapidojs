import 'reflect-metadata';

/**
 * 配置模块选项
 */
export class ConfigModuleOptions {
  /**
   * 是否全局模块，默认为 true
   */
  isGlobal?: boolean;
  
  /**
   * .env 文件路径，默认为 '.env'
   */
  envFilePath?: string | string[];
  
  /**
   * 配置文件路径，支持 YAML 格式
   */
  configFilePath?: string | string[];
  
  /**
   * 是否忽略环境变量，默认为 false
   */
  ignoreEnvFile?: boolean;
  
  /**
   * 是否忽略 .env.local 文件，默认为 false
   */
  ignoreEnvLocalFile?: boolean;
  
  /**
   * 是否在找不到配置文件时抛出异常，默认为 true
   */
  throwOnMissingFile?: boolean;
  
  /**
   * 配置验证函数
   */
  validationSchema?: (config: Record<string, any>) => void;
  
  /**
   * 自定义配置加载器
   */
  load?: (() => Record<string, any>)[];
}

/**
 * 配置属性元数据
 */
export class ConfigPropertyMetadata {
  /**
   * 配置键名
   */
  key: string;
  
  /**
   * 默认值
   */
  defaultValue?: any;
  
  /**
   * 是否必需
   */
  required?: boolean;
  
  /**
   * 属性描述
   */
  description?: string;
  
  /**
   * 类型转换函数
   */
  transform?: (value: any) => any;
} 