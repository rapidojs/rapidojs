import 'reflect-metadata';
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConfigService } from '@rapidojs/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  try {
    console.log('Starting bootstrap...');
    
    // 使用 RapidoFactory 的静态文件配置
    const app = await RapidoFactory.create(AppModule, {
      staticFiles: [
        {
          root: path.join(__dirname, '..', 'public'),
          prefix: '/public/',
          index: false
        }
      ]
    });
    
    console.log('App created successfully');

    // 从容器中获取 ConfigService 实例
    const configService = await app.container.resolve(ConfigService);
    const port = configService.get<number>('app.port');


    // 添加根路径重定向到测试页面
    app.get('/', async (request, reply) => {
      return reply.redirect('/public/index.html');
    });

    await app.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server listening on http://localhost:${port}`);
    console.log('📖 API 测试页面: http://localhost:3000');
    console.log('📚 多模块架构演示:');
    console.log('  👤 用户模块: /users');
    console.log('  📦 产品模块: /products');
    console.log('  🔐 认证模块: /auth');
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap().catch(err => {
  console.error('Unhandled bootstrap error:', err);
  process.exit(1);
});
