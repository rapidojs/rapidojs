import { createParamDecorator } from './param-decorator.factory.js';
import { ParamType, Type } from '../types.js';
import { METADATA_KEY } from '../constants.js';
import { ExecutionContext, PipeTransform } from '../interfaces.js';
import { Inject } from './inject.decorator.js';

function createParamDecoratorWithPipes(
  factory: (data: unknown, context: ExecutionContext) => any,
  paramType: ParamType,
) {
  return (...args: (string | undefined | PipeTransform | Type<PipeTransform>)[]): ParameterDecorator => {
    // 确定数据部分：第一个参数是字符串或 undefined 时作为 data
    const data = (typeof args[0] === 'string' || args[0] === undefined) ? args[0] : undefined;
    
    // 确定管道部分：如果第一个参数是 data，则从第二个参数开始；否则从第一个参数开始
    const pipeArgs = (typeof args[0] === 'string' || args[0] === undefined) ? args.slice(1) : args;
    
    // 过滤管道：排除 null，但包含其他 undefined（仅当它们不在第一个位置时）
    const pipes = pipeArgs.filter(
      arg => arg !== null && (
        typeof arg === 'function' || 
        typeof arg === 'undefined' || 
        (typeof arg === 'object' && 'transform' in arg)
      )
    ) as (PipeTransform | Type<PipeTransform>)[];

    return (target, key, index) => {
      // 设置参数元数据
      createParamDecorator(factory, paramType)(data)(target, key, index);

      // 设置管道元数据 - 注意这里使用 target 而不是 target.constructor
      if (pipes.length > 0 && key) {
        const existingPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, key) || {};
        existingPipes[index] = pipes;
        Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, existingPipes, target, key);
      }
    };
  };
}

export const Body = createParamDecoratorWithPipes((data, ctx) => ctx.switchToHttp().getRequest().body, ParamType.BODY);

export const Query = createParamDecoratorWithPipes((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.query[data as string] : request.query;
}, ParamType.QUERY);

export const Param = createParamDecoratorWithPipes((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.params[data as string] : request.params;
}, ParamType.PARAM);

export const Headers = createParamDecoratorWithPipes((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return data ? request.headers[data as string] : request.headers;
}, ParamType.HEADERS);

/**
 * Decorator to inject the Fastify instance.
 */
export function FastifyApp(): ParameterDecorator {
  return Inject('APP_INSTANCE');
}

export const Req = createParamDecorator((data, ctx) => ctx.switchToHttp().getRequest(), ParamType.REQUEST);
export const Res = createParamDecorator((data, ctx) => ctx.switchToHttp().getResponse(), ParamType.RESPONSE); 