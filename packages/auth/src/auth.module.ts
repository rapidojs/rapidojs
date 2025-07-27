import { DynamicModule, Module, Provider, Type } from '@rapidojs/common';
import { FastifyInstance } from 'fastify';
import fastifyJwt, { FastifyJWTOptions } from '@fastify/jwt';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthModuleAsyncOptions } from './interfaces/auth-module-options.interface.js';

@Module({
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {
  public static forRoot(options: FastifyJWTOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: 'JWT_OPTIONS',
      useValue: options,
    };

    const jwtProvider: Provider = {
      provide: 'fastify-jwt-instance',
      useFactory: async (app: FastifyInstance, opts: FastifyJWTOptions) => {
        await app.register(fastifyJwt as any, opts);
        return app;
      },
      inject: ['APP_INSTANCE', 'JWT_OPTIONS'],
    };

    return {
      module: AuthModule,
      providers: [optionsProvider, jwtProvider],
      exports: [jwtProvider],
      bootstrap: ['fastify-jwt-instance'],
    } as any;
  }

  public static forRootAsync(options: AuthModuleAsyncOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: 'JWT_OPTIONS',
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const jwtProvider: Provider = {
      provide: 'fastify-jwt-instance',
      useFactory: async (app: FastifyInstance, opts: FastifyJWTOptions) => {
        await app.register(fastifyJwt as any, opts);
        return app;
      },
      inject: ['APP_INSTANCE', 'JWT_OPTIONS'],
    };

    return {
      module: AuthModule,
      imports: options.imports || [],
      providers: [...(options.providers || []), optionsProvider, jwtProvider],
      exports: [jwtProvider],
      bootstrap: ['fastify-jwt-instance'],
    } as any;
  }
} 