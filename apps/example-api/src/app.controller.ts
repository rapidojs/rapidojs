import { Controller, Get, LoggerService } from '@rapidojs/common';

@Controller('/')
export class AppController {
  private readonly logger = new LoggerService(AppController);

  @Get('/')
  getRoot(): object {
    this.logger.info('收到根路径请求');
    return { 
      message: 'Welcome to RapidoJS Example API',
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        users: '/users',
        products: '/products',
        auth: '/auth'
      }
    };
  }
}
