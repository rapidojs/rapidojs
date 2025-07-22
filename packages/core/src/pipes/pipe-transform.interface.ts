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
