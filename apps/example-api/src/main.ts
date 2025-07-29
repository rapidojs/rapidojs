import 'reflect-metadata';
import { RapidoFactory, MultipartPlugin } from '@rapidojs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { ConfigService } from '@rapidojs/config';
import { LoggerService, LogLevel, createLoggerConfig } from '@rapidojs/common';
import { GlobalAuthGuard } from './modules/global-features/global-auth.guard.js';
import { GlobalLoggingPipe } from './modules/global-features/global-logging.pipe.js';
import { GlobalErrorFilter } from './modules/global-features/global-error.filter.js';
import { GlobalLoggingInterceptor } from './modules/global-features/global-logging.interceptor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  try {
    console.log('Starting bootstrap...');
    
    // 创建环境自适应的 logger 配置
    const loggerConfig = createLoggerConfig({
      level: LogLevel.INFO,  // 改为 INFO 级别，这样 INFO 及以上级别的日志都会输出
    });
    
    // 创建应用但不立即注册控制器
    const app = await RapidoFactory.create(AppModule, {
      staticFiles: [
        {
          root: path.join(__dirname, '..', 'public'),
          prefix: '/public/',
          index: false
        }
      ],
      fastifyOptions: {
        logger: loggerConfig,
      },
    });
    
    console.log('App created successfully');

    // 启用 Multipart 支持
    try {
      await app.enableMultipart({
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB 默认文件大小限制
          files: 10 // 默认最多10个文件
        }
      });
      console.log('✅ Multipart support enabled');
    } catch (error) {
      console.warn('⚠️  Failed to enable multipart support:', error);
      console.warn('Server will continue without multipart support');
    }

    // 立即配置全局功能 - 在控制器注册之前
    app
      .useGlobalInterceptors(new GlobalLoggingInterceptor())
      .useGlobalFilters(new GlobalErrorFilter())  // 全局错误处理
      .useGlobalGuards(new GlobalAuthGuard())     // 全局认证守卫
      .useGlobalPipes(new GlobalLoggingPipe());   // 全局日志管道

    // 从容器中获取 ConfigService 实例 - 这里应该获取模块注册的实例
    let configService: ConfigService;
    try {
      configService = await app.container.resolve(ConfigService);
    } catch (error) {
      console.error('Failed to resolve ConfigService:', error);
      process.exit(1);
    }
    
    console.log('Global features configured:');
    console.log('  🛡️  全局错误过滤器已启用');
    console.log('  🔐 全局认证守卫已启用 (需要 Bearer valid-api-key)');
    console.log('  📝 全局日志管道已启用');
    

    
    const port = configService.get<number>('app.port');
    const host = configService.get<string>('app.host', '127.0.0.1');

    console.log('ConfigService 实例信息:');
    console.log('  端口号:', port);
    console.log('  主机:', host);
    console.log('  配置值:', {
      'app.port': configService.get('app.port'),
      'app.host': configService.get('app.host'),
      'app.name': configService.get('app.name'),
    });

    // 根路径由 AppController 处理
    console.log(`Attempting to listen on ${host}:${port}...`);
    
    try {
      await app.listen({ port, host });
      console.log(`🚀 Server listening on http://${host}:${port}`);
    } catch (listenError) {
      console.error('Failed to start server:', listenError);
      throw listenError;
    }
    console.log('📖 API 测试页面: http://${host}:${port}');
    console.log('📚 多模块架构演示:');
    console.log('  👤 用户模块: /users');
    console.log('  📦 产品模块: /products');
    console.log('  🔐 认证模块: /auth');
    console.log('  📁 文件上传模块: /upload');
    console.log('');
    console.log('🔑 认证说明:');
    console.log('  除了 / 和 /health 端点外，其他端点需要认证');
    console.log('  请在请求头中添加: Authorization: Bearer valid-api-key');
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap().catch(err => {
  console.error('Unhandled bootstrap error:', err);
  process.exit(1);
});
