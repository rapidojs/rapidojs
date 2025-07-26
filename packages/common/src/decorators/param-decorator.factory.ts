import 'reflect-metadata';
import { ROUTE_ARGS_METADATA } from '../constants.js';
import { ExecutionContext } from '../interfaces.js';
import { ParamType } from '../enums.js';

export function createParamDecorator(
  factory: (data: unknown, context: ExecutionContext) => any,
  paramType?: ParamType,
): (data?: any) => ParameterDecorator {
  return (data?: any): ParameterDecorator => (target, key, index) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key!) || {};
    
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      {
        ...args,
        [`${paramType}:${index}`]: {
          index,
          factory,
          data,
          type: paramType,
        },
      },
      target.constructor,
      key!
    );
  };
} 