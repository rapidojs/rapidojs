/**
 * LoggerService 集成示例
 * 
 * 这个文件展示了如何在 RapidoJS 应用中集成和使用 LoggerService
 */

// 示例 1: 在应用启动时配置文本格式日志
/*
import { RapidoFactory } from '@rapidojs/core';
import { LoggerService, LogLevel, createLoggerConfig } from '@rapidojs/common';

export async function createAppWithTextLogger() {
  // 创建支持文本格式输出的 logger 配置
  const loggerConfig = createLoggerConfig({
    prettyPrint: true,  // 启用文本格式，类似 one-line-logger
    level: LogLevel.DEBUG,
  });

  // 创建应用时传入 logger 配置
  const app = await RapidoFactory.create(AppModule, {
    fastifyOptions: {
      logger: loggerConfig,
    },
  });

  return app;
}
*/

// 示例 2: 在应用启动时配置 JSON 日志
/*
export async function createAppWithJsonLogger() {
  // 创建 JSON 格式的 logger 配置
  const loggerConfig = createLoggerConfig({
    prettyPrint: false,  // 使用 JSON 格式
    level: LogLevel.INFO,
  });

  const app = await RapidoFactory.create(AppModule, {
    fastifyOptions: {
      logger: loggerConfig,
    },
  });

  return app;
}
*/

// 示例 3: 在服务中使用 LoggerService
/*
@Injectable()
export class UserService {
  private readonly logger = new LoggerService();

  constructor() {
    this.logger.setContext('UserService');
  }

  async createUser(userData: any) {
    this.logger.log('开始创建用户', undefined, { userData });
    
    try {
      // 业务逻辑...
      const user = { id: 1, ...userData };
      
      this.logger.debug('用户创建成功', undefined, { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('用户创建失败', error instanceof Error ? error.stack : undefined, undefined, { userData });
      throw error;
    }
  }

  async findUser(id: number) {
    const subLogger = this.logger.getSubLogger('UserService.findUser');
    subLogger.debug('查找用户', undefined, { userId: id });
    
    // 查找逻辑...
    return { id, name: 'Test User' };
  }
}
*/

// 示例 4: 在控制器中使用 LoggerService
/*
@Controller('/users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService
  ) {
    this.logger.setContext('UserController');
  }

  @Post('/')
  async createUser(@Body() createUserDto: any) {
    this.logger.info('收到创建用户请求', undefined, { dto: createUserDto });
    
    try {
      const user = await this.userService.createUser(createUserDto);
      this.logger.info('用户创建成功', undefined, { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('创建用户失败', error);
      throw error;
    }
  }
}
*/

// 示例 5: 应用启动完整示例
/*
async function bootstrap() {
  // 创建应用，启用文本格式日志
  const app = await createAppWithTextLogger();
  
  // 获取 logger 服务实例并设置 Fastify logger
  const loggerService = app.container.resolve(LoggerService);
  loggerService.setFastifyLogger(app.log);
  
  // 启动应用
  await app.listen({ port: 3000 });
  
  // 应用启动日志
  loggerService.info('RapidoJS 应用启动成功', 'Bootstrap', { port: 3000 });
}
*/

// 导出配置函数供应用使用
// export { createLoggerConfig, LogLevel } from './logger.service.js'; 