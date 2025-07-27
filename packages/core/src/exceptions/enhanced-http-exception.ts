import { HttpException } from './http-exception.js';

/**
 * 增强的 HTTP 异常类
 * 支持错误码管理和异常链
 */
export class EnhancedHttpException extends HttpException {

  /**
   * 错误码
   */
  private readonly errorCode?: string;

  /**
   * 原始异常（异常链）
   */
  public readonly cause?: Error;

  /**
   * 错误上下文信息
   */
  private readonly context?: Record<string, any>;

  /**
   * 构造函数
   *
   * @param response 响应消息或对象
   * @param status HTTP 状态码
   * @param options 可选配置或错误码
   * @param context 上下文信息（兼容旧版本API）
   */
  constructor(
    response: string | object,
    status: number,
    options?: {
      errorCode?: string;
      cause?: Error;
      context?: Record<string, any>;
    } | string,
    context?: Record<string, any>
  ) {
    super(response, status);
    
    // 处理不同的参数格式
    if (typeof options === 'string') {
      // 旧版本API: (response, status, errorCode, context)
      this.errorCode = options;
      this.cause = undefined;
      this.context = context;
    } else if (options === undefined && context) {
      // 测试中的格式: (response, status, undefined, context)
      this.errorCode = undefined;
      this.cause = undefined;
      this.context = context;
    } else {
      // 新版本API: (response, status, options)
      this.errorCode = options?.errorCode;
      this.cause = options?.cause;
      this.context = options?.context;
    }
    
    this.initMessage();
    
    // 设置异常名称
    this.name = 'EnhancedHttpException';
    
    // 设置异常链
    if (this.cause && 'cause' in Error.prototype) {
      (this as any).cause = this.cause;
    }
  }

  /**
   * 初始化错误消息
   */
  public initMessage(): void {
    const response = this.getResponse();
    if (typeof response === 'string') {
      this.message = response;
    } else if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      typeof (response as any).message === 'string'
    ) {
      this.message = (response as any).message;
    } else if (this.constructor) {
      const defaultMessage = this.constructor.name.match(/[A-Z][a-z]+|[0-9]+/g)?.join(' ') || 'Error';
      this.message = defaultMessage;
    }
  }

  /**
   * 获取 HTTP 响应
   */
  public getResponse(): string | object {
    return super.getResponse();
  }

  /**
   * 获取 HTTP 状态码
   */
  public getStatus(): number {
    return super.getStatus();
  }

  /**
   * 获取错误码
   */
  public getErrorCode(): string | undefined {
    return this.errorCode;
  }

  /**
   * 获取原始异常
   */
  public getCause(): Error | undefined {
    return this.cause;
  }

  /**
   * 获取错误上下文
   */
  public getContext(): Record<string, any> {
    return this.context || {};
  }

  /**
   * 获取完整的错误信息（包括异常链）
   */
  public getFullErrorInfo(): {
    message: string;
    status: number;
    errorCode?: string;
    context?: Record<string, any>;
    cause?: {
      message: string;
      stack?: string;
      name: string;
    };
  } {
    const info: any = {
      message: this.message,
      status: this.getStatus(),
      errorCode: this.errorCode,
      context: this.context,
    };

    if (this.cause) {
      info.cause = {
        message: this.cause.message,
        stack: this.cause.stack,
        name: this.cause.name,
      };
    }

    return info;
  }

  /**
   * 转换为 JSON 格式
   */
  public toJSON(): {
    name: string;
    message: string;
    status: number;
    errorCode?: string;
    context: Record<string, any>;
    stack?: string;
    timestamp: string;
    cause?: {
      name: string;
      message: string;
      stack?: string;
    };
  } {
    return {
      name: this.name,
      message: this.message,
      status: this.getStatus(),
      errorCode: this.errorCode,
      context: this.context || {},
      stack: this.stack,
      timestamp: new Date().toISOString(),
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      } : undefined,
    };
  }

  /**
   * 添加异常链（实例方法）
   */
  public withCause(cause: Error): this {
    (this as any).cause = cause;
    return this;
  }

  /**
   * 添加上下文信息（实例方法）
   */
  public addContext(key: string, value: any): this {
    if (!this.context) {
      (this as any).context = {};
    }
    this.context![key] = value;
    return this;
  }

  /**
   * 设置错误码（实例方法）
   */
  public withErrorCode(errorCode: string): this {
    (this as any).errorCode = errorCode;
    return this;
  }

  /**
   * 创建带有错误码的异常
   */
  static withErrorCode(
    response: string | object,
    status: number,
    errorCode: string,
    context?: Record<string, any>
  ): EnhancedHttpException {
    return new EnhancedHttpException(response, status, { errorCode, context });
  }

  /**
   * 创建带有异常链的异常
   */
  static withCause(
    response: string | object,
    status: number,
    cause: Error,
    errorCode?: string,
    context?: Record<string, any>
  ): EnhancedHttpException {
    return new EnhancedHttpException(response, status, { errorCode, cause, context });
  }

  /**
   * 从现有异常创建 HTTP 异常
   */
  static fromError(
    error: Error,
    status: number = 500,
    errorCode?: string,
    context?: Record<string, any>
  ): EnhancedHttpException {
    return new EnhancedHttpException(
      error.message,
      status,
      { errorCode, cause: error, context }
    );
  }
}

/**
 * 错误码管理器
 */
export class ErrorCodeManager {
  private static readonly errorCodes = new Map<string, {
    status: number;
    message: string;
    description?: string;
  }>();

  /**
   * 注册错误码
   */
  static register(
    code: string,
    config: {
      status: number;
      message: string;
      description?: string;
    }
  ): void {
    this.errorCodes.set(code, config);
  }

  /**
   * 获取错误码配置
   */
  static get(code: string): {
    status: number;
    message: string;
    description?: string;
  } | undefined {
    return this.errorCodes.get(code);
  }

  /**
   * 创建带有预定义错误码的异常
   */
  static createException(
    code: string,
    context?: Record<string, any>,
    cause?: Error
  ): EnhancedHttpException {
    const config = this.get(code);
    if (!config) {
      throw new Error(`Error code ${code} is not registered`);
    }

    return new EnhancedHttpException(
      config.message,
      config.status,
      { errorCode: code, context, cause }
    );
  }

  /**
   * 获取错误码定义（别名方法）
   */
  static getErrorCode(code: string): {
    status: number;
    message: string;
    description?: string;
  } | undefined {
    return this.get(code);
  }

  /**
   * 获取所有注册的错误码
   */
  static getAllCodes(): Map<string, {
    status: number;
    message: string;
    description?: string;
  }> {
    return new Map(this.errorCodes);
  }

  /**
   * 获取所有注册的错误码（别名方法）
   */
  static getAllErrorCodes(): Record<string, {
    status: number;
    message: string;
    description?: string;
  }> {
    const result: Record<string, any> = {};
    this.errorCodes.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 清除所有注册的错误码
   */
  static clear(): void {
    this.errorCodes.clear();
  }
}

// 预定义一些常用错误码
ErrorCodeManager.register('VALIDATION_FAILED', {
  status: 400,
  message: '数据验证失败',
  description: '请求数据不符合验证规则'
});

ErrorCodeManager.register('UNAUTHORIZED_ACCESS', {
  status: 401,
  message: '未授权访问',
  description: '需要有效的身份验证'
});

ErrorCodeManager.register('FORBIDDEN_OPERATION', {
  status: 403,
  message: '禁止操作',
  description: '没有执行此操作的权限'
});

ErrorCodeManager.register('RESOURCE_NOT_FOUND', {
  status: 404,
  message: '资源未找到',
  description: '请求的资源不存在'
});

ErrorCodeManager.register('INTERNAL_SERVER_ERROR', {
  status: 500,
  message: '内部服务器错误',
  description: '服务器处理请求时发生错误'
});

ErrorCodeManager.register('SERVICE_UNAVAILABLE', {
  status: 503,
  message: '服务不可用',
  description: '服务暂时不可用'
});