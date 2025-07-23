import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { StaticFileConfig } from './app-config.interface.js';
import { ExceptionFilter } from './exception-filter.interface.js';
import { PipeTransform } from '../pipes/pipe-transform.interface.js';
import { DIContainer } from '../di/container.js';
import { Type } from '../types.js';

/**
 * Guard interface for route protection
 */
export interface CanActivate {
  /**
   * Determines whether the request should be allowed to proceed
   * @param context - The execution context containing request information
   * @returns boolean or Promise<boolean> indicating if access should be granted
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/**
 * Execution context interface providing access to request/response
 */
export interface ExecutionContext {
  /**
   * Get the underlying Fastify request object
   */
  getRequest<T = FastifyRequest>(): T;
  
  /**
   * Get the underlying Fastify response object
   */
  getResponse<T = FastifyReply>(): T;
  
  /**
   * Get additional context data
   */
  getContext(): any;
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
} 