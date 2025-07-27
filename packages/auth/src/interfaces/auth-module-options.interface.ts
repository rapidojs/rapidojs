import { DynamicModule, Provider, Type } from '@rapidojs/common';
import { FastifyJWTOptions } from '@fastify/jwt';

export interface AuthModuleAsyncOptions {
  imports?: (Type<any> | DynamicModule)[];
  useFactory: (...args: any[]) => Promise<FastifyJWTOptions> | FastifyJWTOptions;
  inject?: any[];
  providers?: Provider[];
} 