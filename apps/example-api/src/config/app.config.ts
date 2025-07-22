import 'reflect-metadata';
import { Injectable } from '@rapidojs/core';
import { ConfigProperty, ConfigService, injectConfigProperties } from '@rapidojs/config';

/**
 * 应用配置类
 * 展示如何使用 @ConfigProperty 装饰器进行配置注入
 */
@Injectable()
export class AppConfig {
  @ConfigProperty('APP_NAME', { 
    defaultValue: 'RapidoJS API',
    description: '应用名称'
  })
  appName: string;

  @ConfigProperty('APP_PORT', {
    defaultValue: 3000,
    transform: (val: any) => parseInt(val, 10),
    description: '应用端口'
  })
  port: number;

  @ConfigProperty('APP_DEBUG', {
    defaultValue: false,
    transform: (val: any) => val === 'true' || val === true,
    description: '是否启用调试模式'
  })
  debug: boolean;

  constructor(configService: ConfigService) {
    // 自动注入配置属性
    injectConfigProperties(this, configService.getAll());
  }

  /**
   * 获取应用信息
   */
  getAppInfo() {
    return {
      name: this.appName,
      port: this.port,
      debug: this.debug,
    };
  }
}

/**
 * 数据库配置类
 */
@Injectable()
export class DatabaseConfig {
  @ConfigProperty('DATABASE_HOST', { 
    defaultValue: 'localhost'
  })
  host: string;

  @ConfigProperty('DATABASE_PORT', {
    defaultValue: 5432,
    transform: (val: any) => parseInt(val, 10)
  })
  port: number;

  @ConfigProperty('DATABASE_NAME', { 
    defaultValue: 'rapido_db'
  })
  name: string;

  @ConfigProperty('DATABASE_USER', { 
    defaultValue: 'postgres' 
  })
  user: string;

  @ConfigProperty('DATABASE_PASSWORD', { 
    defaultValue: 'default_password',
    description: '数据库密码（敏感信息）'
  })
  password: string;

  @ConfigProperty('database.ssl', {
    defaultValue: false,
    transform: (val: any) => val === 'true' || val === true
  })
  ssl: boolean;

  constructor(configService: ConfigService) {
    injectConfigProperties(this, configService.getAll());
  }

  /**
   * 获取数据库连接字符串
   */
  getConnectionString(): string {
    return `postgres://${this.user}:${this.password}@${this.host}:${this.port}/${this.name}${this.ssl ? '?ssl=true' : ''}`;
  }

  /**
   * 获取数据库配置信息（隐藏敏感信息）
   */
  getConnectionInfo() {
    return {
      host: this.host,
      port: this.port,
      name: this.name,
      user: this.user,
      ssl: this.ssl,
      // 密码不暴露
    };
  }
} 