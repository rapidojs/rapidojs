import 'reflect-metadata';
import { MODULE_METADATA_KEY } from '../constants.js';

export const Controller = (prefix: string): ClassDecorator => {
  return (target: object) => {
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, target) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, { ...metadata, prefix }, target);
  };
}; 