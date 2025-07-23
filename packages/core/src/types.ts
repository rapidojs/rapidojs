import { HttpMethod } from '@rapidojs/common';
import { ForwardReference } from './di/forward-ref.js';

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
 * Enum for supported parameter decorator types.
 */
export enum ParamType {
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADERS = 'headers',
  REQUEST = 'request',
  RESPONSE = 'response',
}

/**
 * Defines the metadata stored for a single decorated parameter.
 */
export interface ParamDefinition {
  index: number;
  type: ParamType;
    key?: string | undefined;
}

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

/**
 * 模块可使用的类型，包括正常类型和延迟引用
 */
export type ModuleType = Type<any> | ForwardReference<any>;

/**
 * 模块元数据接口，定义了模块的结构
 */
export interface ModuleMetadata {
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

export type Provider = Type<any> | {
  provide: any;
  useValue: any;
};

