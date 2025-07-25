import { createParamDecorator } from './param-decorator.factory.js';
import { ParamType } from '../types.js';
import { METADATA_KEY } from '../constants.js';
import { PipeMetadata } from '../interfaces.js';

// Re-implement all parameter decorators using the factory to ensure consistency
// with support for NestJS-style pipe parameters

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

export const Req = createParamDecorator((data, ctx) => ctx.switchToHttp().getRequest(), ParamType.REQUEST);
export const Res = createParamDecorator((data, ctx) => ctx.switchToHttp().getResponse(), ParamType.RESPONSE);

/**
 * 创建支持管道参数的参数装饰器
 */
function createParamDecoratorWithPipes(
  factory: (data: unknown, context: any) => any,
  paramType: ParamType,
): (...args: any[]) => ParameterDecorator {
  return (...args: any[]): ParameterDecorator => {
    let data: any;
    let pipes: PipeMetadata[] = [];
    
    if (args.length === 0) {
      // @Query() - 无参数
      data = undefined;
    } else if (args.length === 1) {
      if (typeof args[0] === 'string' || args[0] === undefined) {
        // @Query('key') - 只有 key
        data = args[0];
      } else {
        // @Query(ParseIntPipe) - 只有管道
        data = undefined;
        pipes = [args[0]];
      }
    } else {
      // @Query('key', ParseIntPipe) - key 和管道
      data = args[0];
      pipes = args.slice(1);
    }
    
    return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
      // 应用原始的参数装饰器逻辑
      const paramDecorator = createParamDecorator(factory, paramType)(data);
      paramDecorator(target, propertyKey, parameterIndex);
      
      // 存储管道元数据
      if (pipes.length > 0 && propertyKey) {
        const existingPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, target, propertyKey) || {};
        existingPipes[parameterIndex] = pipes;
        Reflect.defineMetadata(METADATA_KEY.PARAM_PIPES, existingPipes, target, propertyKey);
      }
    };
  };
} 