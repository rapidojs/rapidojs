import { PipeTransform } from './interfaces.js';

/**
 * HTTP 方法枚举
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

/**
 * HTTP 方法类型（向后兼容）
 */
export type HttpMethodType = HttpMethod;

/**
 * Enum for supported parameter decorator types.
 */
export enum ParamType {
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADERS = 'headers',
  REQUEST = 'request',
  RESPONSE = 'response',
  CUSTOM = 'custom',
  UPLOADED_FILE = 'uploaded_file',
  UPLOADED_FILES = 'uploaded_files',
}

/**
 * Defines the metadata stored for a single decorated parameter.
 */
export interface ParamDefinition {
  index: number;
  type: ParamType;
  key?: string | undefined;
  factory?: (data: unknown, context: any) => any;
  data?: any;
}

/**
 * 通用类型构造器接口
 */
export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

/**
 * Defines the structure for storing route metadata.
 * This information is collected by method decorators (@Get, @Post, etc.)
 * and used by the ControllerRegistrar to register routes in Fastify.
 */
export interface RouteDefinition {
  /**
   * The path for the route, e.g., '/users/:id'.
   */
  path: string;

  /**
   * The HTTP method for the route.
   */
  method: HttpMethod;

  /**
   * The name of the controller method that handles this route.
   */
  methodName: string | symbol;
}

/**
 * 延迟引用类型，用于解决循环依赖
 */
export interface ForwardReference<T = any> {
  forwardRef: true;
  (): Type<T>;
}

/**
 * 模块可使用的类型，包括正常类型和延迟引用
 */
export type ModuleType = Type<any> | DynamicModule | ForwardReference<any>;

/**
 * 模块元数据接口，定义了模块的结构
 */
export interface ModuleMetadata {
  prefix?: string;
  routes?: RouteDefinition[];
  /**
   * 要导入的模块
   * 支持普通类型和 forwardRef 延迟引用
   */
  imports?: ModuleType[];
  
  /**
   * 模块中包含的控制器
   */
  controllers?: Type<any>[];
  
  /**
   * 模块中提供的服务
   */
  providers?: Provider[];
  
  /**
   * 模块导出的服务，可以被其他模块使用
   */
  exports?: Provider[];
}

/**
 * 提供者类型
 */
export type Provider = Type<any> | {
  provide: any;
  useValue?: any;
  useClass?: Type<any>;
  useFactory?: (...args: any[]) => any;
  inject?: any[];
};

/**
 * 动态模块接口
 */
export interface DynamicModule extends ModuleMetadata {
  module: Type<any>;
}