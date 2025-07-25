import { DynamicModule, Module, Provider } from '@rapidojs/common';
import { FastifyInstance } from 'fastify';
import fastifyJwt, { FastifyJWTOptions } from '@fastify/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthModuleAsyncOptions } from './interfaces/auth-module-options.interface.js';

export const JWT_OPTIONS = Symbol('JWT_OPTIONS');

@Module({
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {
  public static forRoot(options: FastifyJWTOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: JWT_OPTIONS,
      useValue: options,
    };

    const jwtProvider: Provider = {
      provide: 'fastify-jwt-instance',
      useFactory: (app: FastifyInstance, opts: FastifyJWTOptions) => {
        app.register(fastifyJwt as any, opts);
      },
      inject: [Symbol.for('APP_INSTANCE'), JWT_OPTIONS],
    };

    return {
      module: AuthModule,
      providers: [optionsProvider, jwtProvider],
      exports: [],
    };
  }

  public static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: JWT_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const jwtProvider: Provider = {
      provide: 'fastify-jwt-instance',
      useFactory: (app: FastifyInstance, opts: FastifyJWTOptions) => {
        app.register(fastifyJwt as any, opts);
      },
      inject: [Symbol.for('APP_INSTANCE'), JWT_OPTIONS],
    };

    return {
      module: AuthModule,
      imports: options.imports || [],
      providers: [optionsProvider, jwtProvider, ...(options.providers || [])],
      exports: [],
    };
  }
} 