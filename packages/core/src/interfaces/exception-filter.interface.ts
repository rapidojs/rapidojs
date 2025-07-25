import { ArgumentsHost } from '@rapidojs/common';

/**
 * Defines the interface for an exception filter.
 */
export interface ExceptionFilter<T = any> {
  /**
   * The method that handles the exception.
   *
   * @param exception The exception object.
   * @param host The arguments host object.
   */
  catch(exception: T, host: ArgumentsHost): void;
}
