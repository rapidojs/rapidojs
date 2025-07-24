import 'reflect-metadata';
import { Injectable } from '../decorators/injectable.decorator.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * 日志级别枚举 - 与 Pino 日志级别对应
 */
export enum LogLevel {
  TRACE = 'trace',  // 10 - 最详细
  DEBUG = 'debug',  // 20 - 调试信息
  INFO = 'info',    // 30 - 一般信息 (默认)
  WARN = 'warn',    // 40 - 警告
  ERROR = 'error',  // 50 - 错误
  FATAL = 'fatal',  // 60 - 致命错误
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Logger 配置选项
 */
export interface LoggerOptions {
  /**
   * 日志级别
   */
  level?: LogLevel | string;
  /**
   * 是否强制开启 pretty print，默认会根据 NODE_ENV 自动判断
   */
  prettyPrint?: boolean;
}

/**
 * RapidoJS 日志服务
 *
 * 这是一个 Injectable 服务，提供统一的日志接口。
 * 它与 Fastify 的日志系统 (Pino) 集成，支持开发和生产环境的不同输出格式。
 *
 * @example
 * ```typescript
 * // 方式1: 使用依赖注入 (推荐)
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly logger: LoggerService) {
 *     this.logger.setContext(UserService.name);
 *   }
 * }
 *
 * // 方式2: 直接实例化并指定上下文
 * @Controller('/users')
 * export class UserController {
 *   private readonly logger = new LoggerService(UserController);
 *
 *   @Get('/')
 *   findAll() {
 *     this.logger.log('Finding all users'); // 输出: [UserController] Finding all users
 *   }
 * }
 * ```
 */
@Injectable()
export class LoggerService {
  private fastifyLogger: any;
  private context: string = 'Application';

  // 全局共享的 Fastify logger 实例
  private static globalFastifyLogger: any = null;

  constructor(context?: string | Function) {
    // 优先使用全局的 Fastify logger，如果没有则使用控制台
    this.fastifyLogger = LoggerService.globalFastifyLogger || console;

    // 支持传入上下文字符串或类构造函数
    if (context) {
      if (typeof context === 'function') {
        this.context = context.name;
      } else {
        this.context = context;
      }
    }
  }

  /**
   * 设置全局 Fastify Logger 实例
   * 这个方法应该在应用启动时调用，所有新创建的 LoggerService 实例都会使用这个 logger
   *
   * @param logger Fastify logger 实例
   */
  public static setGlobalFastifyLogger(logger: any): void {
    LoggerService.globalFastifyLogger = logger;
  }

  /**
   * 设置当前 logger 实例的上下文
   *
   * @param context 上下文名称，通常是模块或服务名称
   */
  public setContext(context: string): void {
    this.context = context;
  }

  /**
   * 记录一般信息日志
   */
  public log(message: string, context?: string, extra?: LogContext): void {
    this.info(message, context, extra);
  }

  /**
   * 记录信息级别日志
   */
  public info(message: string, context?: string, extra?: LogContext): void {
    const logContext = context || this.context || 'Application';
    this.fastifyLogger.info({ context: logContext, ...extra }, message);
  }

  /**
   * 记录错误级别日志
   */
  public error(message: string | Error, trace?: string, context?: string, extra?: LogContext): void {
    const logContext = context || this.context || 'Application';
    if (message instanceof Error) {
      this.fastifyLogger.error({ context: logContext, err: message, ...extra }, message.message);
    } else {
      this.fastifyLogger.error({ context: logContext, stack: trace, ...extra }, message);
    }
  }

  /**
   * 记录警告级别日志
   */
  public warn(message: string, context?: string, extra?: LogContext): void {
    const logContext = context || this.context || 'Application';
    this.fastifyLogger.warn({ context: logContext, ...extra }, message);
  }

  /**
   * 记录调试级别日志
   */
  public debug(message: string, context?: string, extra?: LogContext): void {
    const logContext = context || this.context || 'Application';
    this.fastifyLogger.debug({ context: logContext, ...extra }, message);
  }

  /**
   * 记录详细跟踪日志
   */
  public trace(message: string, context?: string, extra?: LogContext): void {
    const logContext = context || this.context || 'Application';
    this.fastifyLogger.trace({ context: logContext, ...extra }, message);
  }
}

/**
 * 创建 Fastify Logger 配置，支持环境自适应
 *
 * @param options 日志配置选项
 * @returns Fastify logger 配置对象
 */
export function createLoggerConfig(options: LoggerOptions = {}): any {
  const { level = LogLevel.INFO } = options;
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // 允许通过 options.prettyPrint 强制覆盖
  const usePrettyPrint = options.prettyPrint ?? isDevelopment;

  if (usePrettyPrint) {
    // 开发环境: 显示完整的调试信息，包括请求和响应详情
    return {
      level,
      formatters: {
        log(object: any) {
          if (!object.context) {
            object.context = 'Application';
          }
          return object;
        },
      },
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'hostname',
          messageFormat: '[{context}]: {msg}',
          hideObject: false,  // 显示所有对象详情
          singleLine: false,  // 多行显示，便于阅读
        },
      },
    };
  }

  // 生产环境: 输出标准 JSON
  return {
    level,
    formatters: {
      // 确保 context 字段存在
      log(object: any) {
        if (!object.context) {
          object.context = 'Application';
        }
        return object;
      },
    },
  };
} 