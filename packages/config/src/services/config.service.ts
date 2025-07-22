import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { config as dotenvConfig } from 'dotenv';
import { Injectable } from '@rapidojs/core';
import { ConfigModuleOptions } from '../types.js';

// 本地定义 IConfigService 接口
interface IConfigService {
  get<T = any>(key: string): T | undefined;
  get<T = any>(key: string, defaultValue: T): T;
  getAll(): Record<string, any>;
  has(key: string): boolean;
  set(key: string, value: any): void;
}

/**
 * 配置服务实现类
 * 支持 .env 文件和 YAML 配置文件的读取和管理
 */
@Injectable()
export class ConfigService implements IConfigService {
  private configData: Record<string, any> = {};
  private options: ConfigModuleOptions;

  constructor(options: ConfigModuleOptions = {}) {
    this.options = {
      isGlobal: true,
      envFilePath: '.env',
      ignoreEnvFile: false,
      ignoreEnvLocalFile: false,
      throwOnMissingFile: true,
      ...options,
    };

    this.loadConfiguration();
  }

  /**
   * 加载配置数据
   */
  private loadConfiguration(): void {
    // 1. 加载现有的环境变量
    this.loadProcessEnv();

    // 2. 加载 .env 文件（会覆盖现有的环境变量）
    this.loadEnvFiles();

    // 3. 加载 YAML 配置文件
    this.loadConfigFiles();

    // 4. 加载自定义配置
    this.loadCustomConfigs();

    // 5. 验证配置（如果提供了验证函数）
    if (this.options.validationSchema) {
      try {
        this.options.validationSchema(this.configData);
      } catch (error) {
        throw new Error(`配置验证失败: ${error}`);
      }
    }
  }

  /**
   * 加载现有的进程环境变量
   */
  private loadProcessEnv(): void {
    if (!this.options.ignoreEnvFile) {
      this.configData = { ...this.configData, ...process.env };
    }
  }

  /**
   * 加载 .env 文件
   */
  private loadEnvFiles(): void {
    if (this.options.ignoreEnvFile) {
      return;
    }

    // 确保 envFilePath 有默认值
    const envFilePath = this.options.envFilePath || '.env';
    const envPaths = Array.isArray(envFilePath) 
      ? envFilePath 
      : [envFilePath];

    // 加载 .env 文件
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const result = dotenvConfig({ path: envPath });
        if (result.parsed) {
          this.configData = { ...this.configData, ...result.parsed };
        }
      } else if (this.options.throwOnMissingFile) {
        throw new Error(`找不到环境配置文件: ${envPath}`);
      }
    }

    // 加载 .env.local 文件
    if (!this.options.ignoreEnvLocalFile) {
      for (const envPath of envPaths) {
        const localEnvPath = envPath.replace(/\.env$/, '.env.local');
        if (fs.existsSync(localEnvPath)) {
          const result = dotenvConfig({ path: localEnvPath });
          if (result.parsed) {
            // .env.local 文件的优先级更高
            this.configData = { ...this.configData, ...result.parsed };
          }
        }
      }
    }
  }

  /**
   * 加载 YAML 配置文件
   */
  private loadConfigFiles(): void {
    if (!this.options.configFilePath) {
      return;
    }

    const configPaths = Array.isArray(this.options.configFilePath) 
      ? this.options.configFilePath 
      : [this.options.configFilePath];

    for (const configPath of configPaths) {
      if (fs.existsSync(configPath)) {
        try {
          const fileContent = fs.readFileSync(configPath, 'utf8');
          let parsedConfig: any;

          // 根据文件扩展名决定解析方式
          const ext = path.extname(configPath).toLowerCase();
          
          if (ext === '.yaml' || ext === '.yml') {
            parsedConfig = yaml.load(fileContent);
          } else if (ext === '.json') {
            parsedConfig = JSON.parse(fileContent);
          } else {
            // 默认尝试 YAML 解析
            parsedConfig = yaml.load(fileContent);
          }

          if (parsedConfig && typeof parsedConfig === 'object') {
            this.configData = this.mergeDeep(this.configData, parsedConfig);
          }
        } catch (error) {
          throw new Error(`解析配置文件失败 ${configPath}: ${error}`);
        }
      } else if (this.options.throwOnMissingFile) {
        throw new Error(`找不到配置文件: ${configPath}`);
      }
    }
  }

  /**
   * 加载自定义配置
   */
  private loadCustomConfigs(): void {
    if (!this.options.load || !Array.isArray(this.options.load)) {
      return;
    }

    for (const loadFn of this.options.load) {
      try {
        const customConfig = loadFn();
        if (customConfig && typeof customConfig === 'object') {
          this.configData = this.mergeDeep(this.configData, customConfig);
        }
      } catch (error) {
        throw new Error(`加载自定义配置失败: ${error}`);
      }
    }
  }

  /**
   * 深度合并对象
   */
  private mergeDeep(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          result[key] &&
          typeof result[key] === 'object' &&
          !Array.isArray(result[key])
        ) {
          result[key] = this.mergeDeep(result[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }

  /**
   * 获取配置值，支持嵌套键（如 'database.host'）
   */
  public get<T = any>(key: string): T | undefined;
  public get<T = any>(key: string, defaultValue: T): T;
  public get<T = any>(key: string, defaultValue?: T): T | undefined {
    const value = this.getNestedValue(this.configData, key);
    return value !== undefined ? value : defaultValue;
  }

  /**
   * 获取所有配置
   */
  public getAll(): Record<string, any> {
    return { ...this.configData };
  }

  /**
   * 检查配置键是否存在
   */
  public has(key: string): boolean {
    return this.getNestedValue(this.configData, key) !== undefined;
  }

  /**
   * 设置配置值（仅在内存中）
   */
  public set(key: string, value: any): void {
    this.setNestedValue(this.configData, key, value);
  }

  /**
   * 获取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
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

  /**
   * 设置嵌套值
   */
  private setNestedValue(obj: any, key: string, value: any): void {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[keys[keys.length - 1]] = value;
  }
} 