import 'reflect-metadata';
import { injectable } from 'tsyringe';
import { METADATA_KEY } from '../constants.js';

// Define a type for a class constructor, which is what tsyringe's injectable expects.
type Constructor<T = any> = new (...args: any[]) => T;

/**
 * Decorator that marks a class as a Rapido controller.
 *
 * @param prefix - An optional path prefix for all routes defined in this controller.
 * @returns A class decorator.
 */
export function Controller(prefix = '/'): ClassDecorator {
  return (target: Function) => {
    // Mark the controller as injectable for DI
    injectable()(target as Constructor);

    // Store the prefix metadata on the controller class
    Reflect.defineMetadata(METADATA_KEY.CONTROLLER_PREFIX, prefix, target);
  };
} 