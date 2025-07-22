import 'reflect-metadata';
import { ModuleMetadata } from '../types.js';

export const MODULE_METADATA_KEY = 'rapido:module';

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, target);
  };
}
