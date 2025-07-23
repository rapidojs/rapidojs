import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';

/**
 * Decorator that marks a class as a Rapido controller.
 *
 * @param prefix - An optional path prefix for all routes defined in this controller.
 * @returns A class decorator.
 */
export function Controller(prefix = '/'): ClassDecorator {
  return (target: Function) => {
    // Store the prefix metadata on the controller class
    Reflect.defineMetadata(METADATA_KEY.CONTROLLER_PREFIX, prefix, target);
  };
} 