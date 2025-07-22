import 'reflect-metadata';
import { Controller, Get, Param } from '@rapidojs/core';
import { ConfigService } from '@rapidojs/config';
import { AppConfig, DatabaseConfig } from '../../config/app.config.js';

@Controller('/api/config')
export class ConfigController {
  constructor(
    private readonly configService: ConfigService,
    private readonly appConfig: AppConfig,
    private readonly databaseConfig: DatabaseConfig,
  ) {}

  /**
   * 获取应用配置信息
   */
  @Get('/app')
  getAppConfig() {
    return {
      success: true,
      data: this.appConfig.getAppInfo(),
    };
  }

  /**
   * 获取数据库配置信息（隐藏敏感信息）
   */
  @Get('/database')
  getDatabaseConfig() {
    return {
      success: true,
      data: this.databaseConfig.getConnectionInfo(),
    };
  }

  /**
   * 获取特定配置值
   */
  @Get('/value/:key')
  getConfigValue(@Param('key') key: string) {
    const value = this.configService.get(key);
    
    return {
      success: true,
      data: {
        key,
        value: value !== undefined ? value : null,
        exists: this.configService.has(key),
      },
    };
  }

  /**
   * 获取所有公开的配置信息（隐藏敏感信息）
   */
  @Get('/all')
  getAllConfig() {
    const allConfig = this.configService.getAll();
    
    // 过滤掉敏感信息
    const publicConfig = Object.keys(allConfig).reduce((acc, key) => {
      if (!this.isSensitiveKey(key)) {
        acc[key] = allConfig[key];
      } else {
        acc[key] = '[HIDDEN]';
      }
      return acc;
    }, {} as Record<string, any>);

    return {
      success: true,
      data: publicConfig,
    };
  }

  /**
   * 检查是否为敏感配置键
   */
  private isSensitiveKey(key: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /auth/i,
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(key));
  }
} 