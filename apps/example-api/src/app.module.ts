import { Module } from '@rapidojs/core';
import { AppController } from './app.controller.js';

// Import configuration module
import { AppConfigModule } from './config/config.module.js';

// Import feature modules
import { UserModule } from './modules/user/user.module.js';
import { ProductModule } from './modules/product/product.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ExceptionsModule } from './modules/exceptions/exceptions.module.js';
import { ConfigDemoModule } from './modules/config/config.module.js';

@Module({
  imports: [
    AppConfigModule, // 配置模块必须首先导入
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
