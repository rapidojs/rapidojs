import { Controller, Get } from '@rapidojs/core';
import { LoggerService } from '@rapidojs/common';

@Controller()
export class AppController {
  private readonly logger = new LoggerService(AppController);

  @Get('/health')
  getHealth(): object {
    this.logger.info('收到getHealth请求');
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
