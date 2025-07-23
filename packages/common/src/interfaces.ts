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
 * Uses generic types to avoid specific HTTP framework dependencies
 */
export interface ExecutionContext<TRequest = any, TResponse = any> {
  /**
   * Get the underlying HTTP request object
   */
  getRequest<T = TRequest>(): T;
  
  /**
   * Get the underlying HTTP response object
   */
  getResponse<T = TResponse>(): T;
  
  /**
   * Get additional context data
   */
  getContext(): any;
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