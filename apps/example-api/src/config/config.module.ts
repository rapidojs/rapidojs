import 'reflect-metadata';
import { Module } from '@rapidojs/core';
import { ConfigModule } from '@rapidojs/config';
import { AppConfig, DatabaseConfig } from './app.config.js';

/**
 * 配置验证函数
 * 确保关键配置项存在且有效
 */
function validateConfig(config: Record<string, any>): void {
  const required = ['APP_NAME', 'APP_PORT'];
  
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`缺少必需的配置项: ${key}`);
    }
  }

  // 验证端口号
  const port = parseInt(config.APP_PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`无效的端口号: ${config.APP_PORT}`);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '.env.local'],
      configFilePath: 'config/app.yaml',
      validationSchema: validateConfig,
      throwOnMissingFile: false, // 在开发环境中允许文件不存在
    }),
  ],
  providers: [AppConfig, DatabaseConfig],
  exports: [AppConfig, DatabaseConfig],
})
export class AppConfigModule {} 