import { Controller, Get } from '@rapidojs/core';

@Controller()
export class AppController {
  @Get('/health')
  getHealth(): object {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
