import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Type } from '../types.js';
import { ExceptionFilter } from './exception-filter.interface.js';
import { PipeTransform } from '../pipes/pipe-transform.interface.js';
import { CanActivate, ExecutionContext, Interceptor } from '@rapidojs/common';
import { DIContainer } from '../di/container.js';
import { StaticFileConfig } from './app-config.interface.js';

// 重新导出基础接口以保持向后兼容
export type { CanActivate, ExecutionContext } from '../types.js';

/**
 * An extended execution context specific to Fastify.
 */
export interface FastifyExecutionContext extends ExecutionContext {
  getRequest<T = FastifyRequest>(): T;
  getResponse<T = FastifyReply>(): T;
}

/**
 * Enhanced Rapido application interface with global methods
 * Extends Fastify instance while adding framework-specific functionality
 */
export interface RapidoApp extends FastifyInstance {
  /**
   * The dependency injection container
   */
  container: DIContainer;

  /**
   * Add static file serving configuration
   * @param config - Static file configuration
   */
  addStaticFiles(config: StaticFileConfig): Promise<void>;

  /**
   * Registers exception filters as global filters (will be used within
   * every HTTP route handler). Filters are applied in the order provided.
   * 
   * @param filters - Exception filter classes or instances
   * @returns The application instance for method chaining
   * 
   * @example
   * ```typescript
   * app.useGlobalFilters(new HttpExceptionFilter(), ValidationExceptionFilter);
   * ```
   */
  useGlobalFilters(...filters: (ExceptionFilter | Type<ExceptionFilter>)[]): this;

  /**
   * Registers pipes as global pipes (will be used within every HTTP route handler).
   * Pipes are applied in the order provided and will be executed before any
   * method-level or parameter-level pipes.
   * 
   * @param pipes - Pipe classes or instances
   * @returns The application instance for method chaining
   * 
   * @example
   * ```typescript
   * app.useGlobalPipes(new ValidationPipe(), new TransformPipe());
   * ```
   */
  useGlobalPipes(...pipes: (PipeTransform | Type<PipeTransform>)[]): this;

  /**
   * Registers guards as global guards (will be used within every HTTP route handler).
   * Guards are executed before pipes and route handlers. All guards must return true
   * for the request to proceed.
   * 
   * @param guards - Guard classes or instances
   * @returns The application instance for method chaining
   * 
   * @example
   * ```typescript
   * app.useGlobalGuards(new AuthGuard(), new RolesGuard());
   * ```
   */
  useGlobalGuards(...guards: (CanActivate | Type<CanActivate>)[]): this;

  /**
   * Get all registered global filters
   */
  getGlobalFilters(): (ExceptionFilter | Type<ExceptionFilter>)[];

  /**
   * Get all registered global pipes
   */
  getGlobalPipes(): (PipeTransform | Type<PipeTransform>)[];

  /**
   * Get all registered global guards
   */
  getGlobalGuards(): (CanActivate | Type<CanActivate>)[];

  /**
   * Registers interceptors as global interceptors (will be used within every HTTP route handler).
   * Interceptors are executed around the route handler and can transform the request/response.
   * 
   * @param interceptors - Interceptor classes or instances
   * @returns The application instance for method chaining
   * 
   * @example
   * ```typescript
   * app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
   * ```
   */
  useGlobalInterceptors(...interceptors: (Interceptor | Type<Interceptor>)[]): this;

  /**
   * Get all registered global interceptors
   */
  getGlobalInterceptors(): (Interceptor | Type<Interceptor>)[];

  /**
   * Get instances of all global interceptors
   */
  getGlobalInterceptorsInstances(): Promise<Interceptor[]>;

  /**
   * Call OnApplicationBootstrap lifecycle hooks on all providers
   */
  callOnApplicationBootstrap(): Promise<void>;

  /**
   * Call BeforeApplicationShutdown lifecycle hooks on all providers
   */
  callBeforeApplicationShutdown(): Promise<void>;

  /**
   * Call OnModuleDestroy lifecycle hooks on all providers
   */
  callOnModuleDestroy(): Promise<void>;
}