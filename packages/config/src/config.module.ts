import 'reflect-metadata';
import { Module } from '@rapidojs/core';
import { Type, Provider } from '@rapidojs/common';
import { ConfigService } from './services/config.service.js';
import { ConfigModuleOptions } from './types.js';
import { CONFIG_SERVICE_TOKEN } from './constants.js';

/**
 * 配置模块
 * 提供应用级别的配置管理功能
 */
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  /**
   * 创建根配置模块
   * @param options 配置选项
   * @returns 配置模块类型
   */
  static forRoot(options: ConfigModuleOptions = {}): Type<any> {
    const configService = new ConfigService(options);
    const configProvider: Provider = {
      provide: ConfigService,
      useValue: configService,
    };

    @Module({
      providers: [configProvider],
      exports: [ConfigService],
    })
    class DynamicConfigModule {}

    return DynamicConfigModule;
  }

  /**
   * 创建功能配置模块（用于特性模块中）
   * @param options 配置选项
   * @returns 配置模块类型
   */
  static forFeature(options: ConfigModuleOptions = {}): Type<any> {
    const configService = new ConfigService(options);
    const configProvider: Provider = {
      provide: ConfigService,
      useValue: configService,
    };

    @Module({
      providers: [configProvider],
      exports: [ConfigService],
    })
    class FeatureConfigModule {}

    return FeatureConfigModule;
  }
} 