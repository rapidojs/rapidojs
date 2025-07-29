import { Type, ForwardReference, Provider } from './types.js';

/**
 * Interface that must be implemented by all pipes.
 * Pipes are used to transform and validate data before it reaches the route handler.
 */
export interface PipeTransform<T = any, R = any> {
  /**
   * Method to implement a custom pipe. Called with two parameters
   *
   * @param value the value currently being processed
   * @param metadata metadata about the current argument being processed
   * @returns the transformed value
   */
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

/**
 * Metadata about the argument being processed by a pipe
 */
export interface ArgumentMetadata {
  /**
   * The type of the parameter (e.g., 'body', 'query', 'param', etc.)
   */
  type: 'body' | 'query' | 'param' | 'headers' | 'request' | 'response';
  
  /**
   * The metatype of the parameter (the class constructor if available)
   */
  metatype?: new (...args: any[]) => any;
  
  /**
   * The data key (for @Query('key'), @Param('key'), etc.)
   */
  data?: string;
}

/**
 * Provides access to the arguments of a request, specialized for different contexts.
 */
export interface ArgumentsHost {
  /**
   * Switches the context to an HTTP-specific context.
   */
  switchToHttp(): HttpArgumentsHost;
}

/**
 * Provides access to the HTTP-specific request and response objects.
 */
export interface HttpArgumentsHost {
  /**
   * Returns the underlying HTTP request object.
   */
  getRequest<T = any>(): T;
  /**
   * Returns the underlying HTTP response object.
   */
  getResponse<T = any>(): T;
}

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
 * An execution context provides details about the current request,
 * and extends ArgumentsHost to allow switching to specific contexts like HTTP.
 */
export interface ExecutionContext extends ArgumentsHost {
  /**
   * Returns the type of the controller class which the current handler belongs to.
   */
  getClass<T = any>(): T | null;

  /**
   * Returns a reference to the handler (method) that will be executed.
   */
  getHandler(): Function | null;

  /**
   * Returns the type of the execution context (e.g., 'http', 'ws', 'rpc').
   */
  getType(): string;
}

/**
 * Configuration options for validation pipe
 */
export interface ValidationPipeOptions {
  /**
   * If set to true, validator will strip validated (returned) object of any properties that do not use any validation decorators.
   */
  whitelist?: boolean;
  
  /**
   * If set to true, instead of stripping non-whitelisted properties validator will throw an exception.
   */
  forbidNonWhitelisted?: boolean;
  
  /**
   * If set to true, attempts to validate unknown objects fail immediately.
   */
  forbidUnknownValues?: boolean;
  
  /**
   * If set to true, class-transformer will attempt conversion based on TS reflected type.
   */
  transform?: boolean;
  
  /**
   * If set to true, validation will skip missing properties.
   */
  skipMissingProperties?: boolean;
  
  /**
   * If set to true, validation will skip null properties.
   */
  skipNullProperties?: boolean;
  
  /**
   * If set to true, validation will skip undefined properties.
   */
  skipUndefinedProperties?: boolean;
  
  /**
   * Groups to be used during validation of the object.
   */
  groups?: string[];
  
  /**
   * If set to true, the validation will not use default messages.
   */
  dismissDefaultMessages?: boolean;
  
  /**
   * Settings for the class-transformer.
   */
  transformOptions?: any;
  
  /**
   * Custom error message factory
   */
  errorHttpStatusCode?: number;
  
  /**
   * Expected error message
   */
  expectedType?: string;
}

/**
 * Type representing a pipe constructor or instance
 */
export type PipeMetadata = PipeTransform | (new (...args: any[]) => PipeTransform); 

/**
 * Interface for interceptors that can intercept and modify the execution flow
 */
export interface Interceptor<T = any, R = any> {
  /**
   * Intercepts the execution of a route handler
   * @param context - The execution context
   * @param next - The call handler to continue execution
   * @returns The result or a modified result
   */
  intercept(context: ExecutionContext, next: CallHandler<T>): R | Promise<R>;
}

/**
 * Interface for the call handler used in interceptors
 */
export interface CallHandler<T = any> {
  /**
   * Continues the execution and returns an observable-like object
   * @returns The result of the handler execution
   */
  handle(): Promise<T>;
}

/**
 * Type representing an interceptor constructor or instance
 */
export type InterceptorMetadata = Interceptor | (new (...args: any[]) => Interceptor);

/**
 * Lifecycle hook interface for application bootstrap
 */
export interface OnApplicationBootstrap {
  /**
   * Called after the application has been initialized
   */
  onApplicationBootstrap(): void | Promise<void>;
}

/**
 * Lifecycle hook interface for application shutdown
 */
export interface BeforeApplicationShutdown {
  /**
   * Called before the application shuts down
   */
  beforeApplicationShutdown(): void | Promise<void>;
}

/**
 * Lifecycle hook interface for module initialization
 */
export interface OnModuleInit {
  /**
   * Called after the module has been initialized
   */
  onModuleInit(): void | Promise<void>;
}

/**
 * Lifecycle hook interface for module destruction
 */
export interface OnModuleDestroy {
  /**
   * Called before the module is destroyed
   */
  onModuleDestroy(): void | Promise<void>;
}

export interface ModuleMetadata {
  imports?: Array<Type<any> | DynamicModule | ForwardReference>;
  controllers?: Type<any>[];
  providers?: Provider[];
  exports?: Array<Type<any> | DynamicModule | Provider>;
  bootstrap?: Array<Type<any> | string>;
}

export interface DynamicModule extends ModuleMetadata {
  // ... existing code ...
}