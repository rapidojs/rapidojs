import 'reflect-metadata';
import { ModuleMetadata } from '../types.js';
import { MODULE_METADATA_KEY } from '../constants.js';

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
  };
} 