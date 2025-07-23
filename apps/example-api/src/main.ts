import 'reflect-metadata';
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConfigService } from '@rapidojs/config';
import { LoggerService, LogLevel, createLoggerConfig } from '@rapidojs/common';
import { GlobalAuthGuard } from './modules/global-features/global-auth.guard.js';
import { GlobalLoggingPipe } from './modules/global-features/global-logging.pipe.js';
import { GlobalErrorFilter } from './modules/global-features/global-error.filter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  try {
    console.log('Starting bootstrap...');
    
    // 创建支持文本格式输出的 logger 配置
    const loggerConfig = createLoggerConfig({
      prettyPrint: true,  // 启用文本格式，类似 one-line-logger
      level: LogLevel.DEBUG,
    });
    
    // 使用 RapidoFactory 的静态文件配置
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
    
    // 配置全局功能 - 类似 NestJS 的方式
    app
      .useGlobalFilters(new GlobalErrorFilter())  // 全局错误处理
      .useGlobalGuards(new GlobalAuthGuard())     // 全局认证守卫
      .useGlobalPipes(new GlobalLoggingPipe());   // 全局日志管道
    
    console.log('Global features configured:');
    console.log('  🛡️  全局错误过滤器已启用');
    console.log('  🔐 全局认证守卫已启用 (需要 Bearer valid-api-key)');
    console.log('  📝 全局日志管道已启用');

    // 从容器中获取 ConfigService 实例
    const configService = await app.container.resolve(ConfigService);
    const port = configService.get<number>('app.port');
    const host = configService.get<string>('app.host', '127.0.0.1');


    // 添加根路径重定向到测试页面
    app.get('/', async (request, reply) => {
      return reply.redirect('/public/index.html');
    });

    await app.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
    console.log('📖 API 测试页面: http://${host}:${port}');
    console.log('📚 多模块架构演示:');
    console.log('  👤 用户模块: /users');
    console.log('  📦 产品模块: /products');
    console.log('  🔐 认证模块: /auth');
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
