import { Module } from '@rapidojs/core';
import { AppController } from './app.controller.js';
import { ConfigModule } from '@rapidojs/config';
import { LoggerService } from '@rapidojs/common';

// Import feature modules
import { UserModule } from './modules/user/user.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { AuthModule as RapidoAuthModule } from '@rapidojs/auth';
import { AuthModule } from './modules/auth/auth.module.js';
import { ConfigService } from '@rapidojs/config';
import { ExceptionsModule } from './modules/exceptions/exceptions.module.js';
import { ConfigDemoModule } from './modules/config/config.module.js';

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
      isGlobal: true,
      configFilePath: './config/app.yaml',
    }),
    RapidoAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'a-very-secret-key'),
      }),
      inject: [ConfigService],
    }),
    UserModule, 
    ProductModule, 
    AuthModule, 
    ExceptionsModule,
    ConfigDemoModule, // 配置演示模块
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
