import 'reflect-metadata';
import { EXCEPTION_FILTER_METADATA } from '../constants.js';
import { Type } from '../types.js';

/**
 * Decorator that marks a class as an exception filter.
 * An exception filter handles exceptions thrown by route handlers.
 *
 * @param exceptions The exception types to be caught by this filter.
 */
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(EXCEPTION_FILTER_METADATA, exceptions, target);
  };
} 