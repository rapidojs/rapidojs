import 'reflect-metadata';
import { METADATA_KEY } from '../constants.js';
import { ParamDefinition, ParamType } from '../types.js';
import { PipeTransform } from '../pipes/pipe-transform.interface.js';

// Type for pipe constructor
type PipeConstructor = new (...args: any[]) => PipeTransform;

// This is the core function that attaches metadata to the controller method.
function applyMetadata(
  target: Object,
  propertyKey: string | symbol,
  parameterIndex: number,
  type: ParamType,
  key?: string,
  pipe?: PipeConstructor | PipeTransform,
) {
  const params: ParamDefinition[] = Reflect.getMetadata(METADATA_KEY.PARAMS, target, propertyKey) || [];
  params.push({ index: parameterIndex, type, key });
  Reflect.defineMetadata(METADATA_KEY.PARAMS, params, target, propertyKey);
  
  // Store pipe metadata if provided
  if (pipe) {
    const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, propertyKey) || {};
    paramPipes[parameterIndex] = [pipe];
    Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, paramPipes, target, propertyKey);
  }
}

// Factory for decorators that do not take arguments, e.g., @Body
function createDecorator(type: ParamType): ParameterDecorator {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    // We must check for propertyKey to be defined, as this decorator is for method parameters only.
    if (!propertyKey) return;
    applyMetadata(target, propertyKey, parameterIndex, type);
  };
}

// Factory for decorators that can optionally take a string key, e.g., @Query('id')
function createDecoratorWithOptionalKey(type: ParamType) {
  return (key?: string): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
      if (!propertyKey) return;
      applyMetadata(target, propertyKey, parameterIndex, type, key);
    };
  };
}

// Factory for decorators that support pipes, e.g., @Query('id', ParseIntPipe)
function createDecoratorWithPipe(type: ParamType) {
  return (key?: string, pipe?: PipeConstructor | PipeTransform): ParameterDecorator => {
    return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number) => {
      if (!propertyKey) return;
      applyMetadata(target, propertyKey, parameterIndex, type, key, pipe);
    };
  };
}

// Enhanced decorators that support both key and pipe
export const Query = createDecoratorWithPipe(ParamType.QUERY);
export const Param = createDecoratorWithPipe(ParamType.PARAM);
export const Headers = createDecoratorWithPipe(ParamType.HEADERS);

export const Body = createDecoratorWithPipe(ParamType.BODY);

// Simple decorators without pipe support
export const Req = createDecorator(ParamType.REQUEST);
export const Res = createDecorator(ParamType.RESPONSE);
