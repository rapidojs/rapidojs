import 'reflect-metadata';
import { Injectable } from '../decorators/injectable.decorator.js';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Fastify Logger 配置选项
 */
export interface LoggerOptions {
  /**
   * 是否启用文本格式输出（类似 one-line-logger）
   * 默认为 false，使用 JSON 格式
   */
  prettyPrint?: boolean;
  /**
   * 日志级别
   */
  level?: LogLevel | string;
  /**
   * 自定义日志格式化函数
   */
  customPrettifier?: (log: any) => string;
}

/**
 * RapidoJS 日志服务
 * 
 * 这是一个 Injectable 服务，提供统一的日志接口。
 * 它可以与 Fastify 的日志系统集成，支持 JSON 和文本格式输出。
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   constructor(private readonly logger: LoggerService) {}
 * 
 *   createUser(userData: any) {
 *     this.logger.log('Creating new user', 'UserService');
 *     // ...
 *     this.logger.debug('User created successfully', { userId: user.id });
 *   }
 * }
 * ```
 */
@Injectable()
export class LoggerService {
  private fastifyLogger: any;
  private context: string = 'Application';

  constructor() {
    // 初始化时将使用默认的控制台输出
    // 在应用启动时，可以通过 setFastifyLogger 设置实际的 Fastify logger
    this.fastifyLogger = console;
  }

  /**
   * 设置 Fastify Logger 实例
   * 这个方法应该在应用启动时调用，将 Fastify 的 logger 传递给服务
   * 
   * @param logger Fastify logger 实例
   */
  public setFastifyLogger(logger: any): void {
    this.fastifyLogger = logger;
  }

  /**
   * 设置全局日志上下文
   * 
   * @param context 上下文名称，通常是模块或服务名称
   */
  public setContext(context: string): void {
    this.context = context;
  }

  /**
   * 创建一个具有特定上下文的子 logger
   * 
   * @param context 上下文名称
   * @returns 新的 LoggerService 实例
   */
  public getSubLogger(context: string): LoggerService {
    const subLogger = new LoggerService();
    subLogger.setFastifyLogger(this.fastifyLogger);
    subLogger.setContext(context);
    return subLogger;
  }

  /**
   * 记录一般信息日志
   * 
   * @param message 日志消息
   * @param context 可选的上下文名称，会覆盖默认上下文
   * @param extra 额外的上下文数据
   */
  public log(message: string, context?: string, extra?: LogContext): void {
    this.info(message, context, extra);
  }

  /**
   * 记录信息级别日志
   * 
   * @param message 日志消息
   * @param context 可选的上下文名称
   * @param extra 额外的上下文数据
   */
  public info(message: string, context?: string, extra?: LogContext): void {
    const logData = this.formatLogData(message, context || this.context, extra);
    
    if (this.fastifyLogger && typeof this.fastifyLogger.info === 'function') {
      this.fastifyLogger.info(logData);
    } else {
      console.info(this.formatForConsole('INFO', logData));
    }
  }

  /**
   * 记录错误级别日志
   * 
   * @param message 日志消息或错误对象
   * @param trace 错误堆栈信息
   * @param context 可选的上下文名称
   * @param extra 额外的上下文数据
   */
  public error(message: string | Error, trace?: string, context?: string, extra?: LogContext): void {
    let logData: any;
    
    if (message instanceof Error) {
      logData = this.formatLogData(message.message, context || this.context, {
        ...extra,
        stack: message.stack,
        name: message.name,
      });
    } else {
      logData = this.formatLogData(message, context || this.context, {
        ...extra,
        stack: trace,
      });
    }

    if (this.fastifyLogger && typeof this.fastifyLogger.error === 'function') {
      this.fastifyLogger.error(logData);
    } else {
      console.error(this.formatForConsole('ERROR', logData));
    }
  }

  /**
   * 记录警告级别日志
   * 
   * @param message 日志消息
   * @param context 可选的上下文名称
   * @param extra 额外的上下文数据
   */
  public warn(message: string, context?: string, extra?: LogContext): void {
    const logData = this.formatLogData(message, context || this.context, extra);
    
    if (this.fastifyLogger && typeof this.fastifyLogger.warn === 'function') {
      this.fastifyLogger.warn(logData);
    } else {
      console.warn(this.formatForConsole('WARN', logData));
    }
  }

  /**
   * 记录调试级别日志
   * 
   * @param message 日志消息
   * @param context 可选的上下文名称
   * @param extra 额外的上下文数据
   */
  public debug(message: string, context?: string, extra?: LogContext): void {
    const logData = this.formatLogData(message, context || this.context, extra);
    
    if (this.fastifyLogger && typeof this.fastifyLogger.debug === 'function') {
      this.fastifyLogger.debug(logData);
    } else {
      console.debug(this.formatForConsole('DEBUG', logData));
    }
  }

  /**
   * 记录详细跟踪日志
   * 
   * @param message 日志消息
   * @param context 可选的上下文名称
   * @param extra 额外的上下文数据
   */
  public trace(message: string, context?: string, extra?: LogContext): void {
    const logData = this.formatLogData(message, context || this.context, extra);
    
    if (this.fastifyLogger && typeof this.fastifyLogger.trace === 'function') {
      this.fastifyLogger.trace(logData);
    } else {
      console.trace(this.formatForConsole('TRACE', logData));
    }
  }

  /**
   * 格式化日志数据
   * 
   * @private
   */
  private formatLogData(message: string, context: string, extra?: LogContext): any {
    const baseData = {
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    if (extra && Object.keys(extra).length > 0) {
      return { ...baseData, ...extra };
    }

    return baseData;
  }

  /**
   * 为控制台输出格式化日志
   * 
   * @private
   */
  private formatForConsole(level: string, data: any): string {
    const timestamp = data.timestamp || new Date().toISOString();
    const context = data.context || 'Application';
    const message = data.message || '';
    
    // 简化的单行格式，类似 one-line-logger 风格
    let logLine = `[${timestamp}] ${level} [${context}] ${message}`;
    
    // 如果有额外数据，添加到日志行
    const extraData = { ...data };
    delete extraData.message;
    delete extraData.context;
    delete extraData.timestamp;
    
    if (Object.keys(extraData).length > 0) {
      logLine += ` ${JSON.stringify(extraData)}`;
    }
    
    return logLine;
  }
}

/**
 * 创建 Fastify Logger 配置，支持文本格式输出
 * 
 * @param options 日志配置选项
 * @returns Fastify logger 配置对象
 */
export function createLoggerConfig(options: LoggerOptions = {}): any {
  const { prettyPrint = false, level = LogLevel.INFO, customPrettifier } = options;

  if (prettyPrint) {
    // 使用 transport 方式避免 prettyPrint 废弃问题
    return {
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'yyyy-mm-dd HH:MM:ss.l Z',  // 年月日时分秒毫秒
          ignore: 'hostname',  // 只忽略 hostname，保留 pid
          colorize: false,
          singleLine: true,
        },
      },
    };
  }

  // 默认 JSON 格式
  return {
    level,
    serializers: {
      req(request: any) {
        return {
          method: request.method,
          url: request.url,
          headers: request.headers,
        };
      },
      res(reply: any) {
        return {
          statusCode: reply.statusCode,
        };
      },
    },
  };
} 