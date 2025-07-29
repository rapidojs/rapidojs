import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ControllerRegistrar } from './controller-registrar.js';
import { EnhancedDIContainer } from '../di/enhanced-container.js';
import { Type } from '../types.js';
import { AppConfig, StaticFileConfig } from '../interfaces/app-config.interface.js';
import { MODULE_METADATA, EXCEPTION_FILTER_METADATA } from '../constants.js';
import { HttpException } from '../exceptions/http-exception.js';
import { RapidoApp } from '../interfaces/rapido-app.interface.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { PipeTransform } from '../pipes/pipe-transform.interface.js';
import { CanActivate, LoggerService, Interceptor, OnApplicationBootstrap, BeforeApplicationShutdown, OnModuleInit, OnModuleDestroy, MultipartOptions } from '@rapidojs/common';
import { HttpExecutionContextImpl } from '../helpers/execution-context-impl.js';
import { MultipartPlugin } from '../plugins/multipart.plugin.js';

/**
 * The main factory for creating Rapido.js applications.
 */
export class RapidoFactory {
  /**
   * Creates and configures a Rapido.js application instance.
   *
   * @param rootModule - The root module of the application, containing controllers.
   * @param config - Optional application configuration.
   * @returns A promise that resolves to the configured RapidoApp instance.
   */
    public static async create(rootModule: Type<any>, config?: AppConfig): Promise<RapidoApp> {
    const app = fastify(config?.fastifyOptions) as unknown as FastifyInstance;
    const container = new EnhancedDIContainer();

    // Register the app instance so it can be injected
    container.registerProvider({ provide: 'APP_INSTANCE', useValue: app });

    // Set the global logger as soon as the app instance is created.
    // This ensures any LoggerService instantiated hereafter (manually or by DI)
    // gets the correct logger instance.
    if (app.log) {
      LoggerService.setGlobalFastifyLogger(app.log);
    }

    // 存储全局配置
    let globalFilters: (ExceptionFilter | Type<ExceptionFilter>)[] = [];
    let globalPipes: (PipeTransform | Type<PipeTransform>)[] = [];
    let globalGuards: (CanActivate | Type<CanActivate>)[] = [];
    let globalInterceptors: (Interceptor | Type<Interceptor>)[] = [];


    const registerStaticConfig = async (staticConfig: StaticFileConfig) => {
      try {
        const fastifyStatic = await import('@fastify/static');
        await app.register(fastifyStatic.default, {
          root: staticConfig.root,
          prefix: staticConfig.prefix,
          index: staticConfig.index === true ? 'index.html' : staticConfig.index,
          decorateReply: false, // Avoid conflicts when registering multiple times
        });
      } catch (error) {
        console.warn(`Failed to register @fastify/static for root ${staticConfig.root}. Make sure it is installed:`, error);
      }
    };

    // Register initial static file configurations
    if (config?.staticFiles && Array.isArray(config.staticFiles)) {
      for (const staticConfig of config.staticFiles) {
        await registerStaticConfig(staticConfig);
      }
    }

    // Decorate the app instance with the addStaticFiles method
    (app as any).addStaticFiles = async (config: StaticFileConfig) => {
      await registerStaticConfig(config);
    };

    // Decorate the app instance with the enableMultipart method
    (app as any).enableMultipart = async (options?: MultipartOptions) => {
      try {
        await MultipartPlugin.register(app, options);
      } catch (error) {
        console.warn('Failed to enable multipart support:', error);
        // 不抛出错误，允许应用程序继续运行
      }
    };

    await container.registerModule(rootModule);

    // Bootstrap eager providers
    const bootstrapProviders = container.getAllBootstrapProviders(rootModule);
    for (const provider of bootstrapProviders) {
      await container.resolve(provider);
    }

    // Call OnModuleInit lifecycle hooks
    const allProviders = container.getAllProviders(rootModule);
    for (const provider of allProviders) {
      try {
        const instance = await container.resolve(provider);
        if (instance && typeof (instance as any).onModuleInit === 'function') {
          await (instance as OnModuleInit).onModuleInit();
        }
      } catch (error) {
        // Ignore resolution errors for optional lifecycle hooks
      }
    }

    const controllers = container.getControllers(rootModule);

    // Helper functions for resolving instances
    const resolveFilter = async (filter: ExceptionFilter | Type<ExceptionFilter>): Promise<ExceptionFilter> => {
      if (typeof filter === 'function') {
        try {
          return await container.resolve(filter);
        } catch {
          return new filter();
        }
      }
      return filter;
    };

    const resolvePipe = async (pipe: PipeTransform | Type<PipeTransform>): Promise<PipeTransform> => {
      if (typeof pipe === 'function') {
        try {
          return await container.resolve(pipe);
        } catch {
          return new pipe();
        }
      }
      return pipe;
    };

    const resolveGuard = async (guard: CanActivate | Type<CanActivate>): Promise<CanActivate> => {
      if (typeof guard === 'function') {
        try {
          return await container.resolve(guard);
        } catch {
          return new guard();
        }
      }
      return guard;
    };

    const resolveInterceptor = async (interceptor: Interceptor | Type<Interceptor>): Promise<Interceptor> => {
      if (typeof interceptor === 'function') {
        try {
          return await container.resolve(interceptor);
        } catch {
          return new interceptor();
        }
      }
      return interceptor;
    };

    const canHandleException = (filter: ExceptionFilter, exception: Error): boolean => {
      const filterClass = filter.constructor as Type<ExceptionFilter>;
      const exceptionMetadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, filterClass);
      
      if (exceptionMetadata && Array.isArray(exceptionMetadata)) {
        return exceptionMetadata.some(exceptionType => exception instanceof exceptionType);
      }
      
      // 如果没有指定异常类型，默认捕获所有异常
      return true;
    };

    let errorHandlerSet = false;

    const setupErrorHandler = () => {
      if (errorHandlerSet) {
        return; // 避免重复设置
      }
      
      app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
        // 首先尝试全局过滤器
        for (const filter of globalFilters) {
          const filterInstance = await resolveFilter(filter);
          if (canHandleException(filterInstance, error)) {
            const host = new HttpExecutionContextImpl(request, reply, null, null);
            return filterInstance.catch(error, host);
          }
        }

        // 然后尝试容器中注册的过滤器
        const containerFilter = container.findFilter(error);
        if (containerFilter) {
          const instance = await container.resolve(containerFilter);
          const host = new HttpExecutionContextImpl(request, reply, null, null);
          return instance.catch(error, host);
        }

        // 默认错误处理
        if (error instanceof HttpException) {
          const status = error.getStatus();
          const response = error.getResponse();

          if (typeof response === 'string') {
            reply.status(status).send({
              statusCode: status,
              error: error.constructor.name.replace(/Exception$/, ''),
              message: response
            });
          } else {
            reply.status(status).send({
              statusCode: status,
              ...(response as object)
            });
          }
        } else {
          request.log.error(error);
          reply.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred.'
          });
        }
      });
      
      errorHandlerSet = true;
    };

    // 添加全局方法到 app 实例
    (app as any).useGlobalFilters = (...filters: (ExceptionFilter | Type<ExceptionFilter>)[]): RapidoApp => {
      globalFilters.push(...filters);
      // 错误处理器已经在应用创建时设置，这里只需要更新过滤器列表
      return app as RapidoApp;
    };

    (app as any).useGlobalPipes = (...pipes: (PipeTransform | Type<PipeTransform>)[]): RapidoApp => {
      globalPipes.push(...pipes);
      return app as RapidoApp;
    };

    (app as any).useGlobalGuards = (...guards: (CanActivate | Type<CanActivate>)[]): RapidoApp => {
      globalGuards.push(...guards);
      return app as RapidoApp;
    };

    (app as any).useGlobalInterceptors = (...interceptors: (Interceptor | Type<Interceptor>)[]): RapidoApp => {
      globalInterceptors.push(...interceptors);
      return app as RapidoApp;
    };

    (app as any).getGlobalFilters = (): (ExceptionFilter | Type<ExceptionFilter>)[] => {
      return [...globalFilters];
    };

    (app as any).getGlobalPipes = (): (PipeTransform | Type<PipeTransform>)[] => {
      return [...globalPipes];
    };

    (app as any).getGlobalGuards = (): (CanActivate | Type<CanActivate>)[] => {
      return [...globalGuards];
    };

    (app as any).getGlobalInterceptors = (): (Interceptor | Type<Interceptor>)[] => {
      return [...globalInterceptors];
    };

    // 添加访问全局管道和守卫的方法给 ControllerRegistrar 使用
    (app as any).executeGlobalGuards = async (request: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
      if (globalGuards.length === 0) {
        return true;
      }

      const context = new HttpExecutionContextImpl(request, reply, null, null);

      for (const guard of globalGuards) {
        const guardInstance = await resolveGuard(guard);
        const canActivate = await guardInstance.canActivate(context);
        
        if (!canActivate) {
          return false;
        }
      }

      return true;
    };

    (app as any).applyGlobalPipes = async (value: any, metadata: any): Promise<any> => {
      let result = value;
      
      for (const pipe of globalPipes) {
        const pipeInstance = await resolvePipe(pipe);
        result = await pipeInstance.transform(result, metadata);
      }
      
      return result;
    };

    (app as any).getGlobalInterceptorsInstances = async (): Promise<Interceptor[]> => {
      const instances: Interceptor[] = [];
      for (const interceptor of globalInterceptors) {
        const instance = await resolveInterceptor(interceptor);
        instances.push(instance);
      }
      return instances;
    };

    // 立即设置错误处理器
    setupErrorHandler();

    // 注册控制器
    const registrar = new ControllerRegistrar(app as RapidoApp, container);
    await registrar.register(controllers);

    // Attach the container to the app instance
    (app as any).container = container;

    // Add lifecycle hook methods
    (app as any).callOnApplicationBootstrap = async (): Promise<void> => {
      const allProviders = container.getAllProviders(rootModule);
      for (const provider of allProviders) {
        try {
          const instance = await container.resolve(provider);
          if (instance && typeof (instance as any).onApplicationBootstrap === 'function') {
            await (instance as OnApplicationBootstrap).onApplicationBootstrap();
          }
        } catch (error) {
          // Ignore resolution errors for optional lifecycle hooks
        }
      }
    };

    (app as any).callBeforeApplicationShutdown = async (): Promise<void> => {
      const allProviders = container.getAllProviders(rootModule);
      for (const provider of allProviders) {
        try {
          const instance = await container.resolve(provider);
          if (instance && typeof (instance as any).beforeApplicationShutdown === 'function') {
            await (instance as BeforeApplicationShutdown).beforeApplicationShutdown();
          }
        } catch (error) {
          // Ignore resolution errors for optional lifecycle hooks
        }
      }
    };

    (app as any).callOnModuleDestroy = async (): Promise<void> => {
      const allProviders = container.getAllProviders(rootModule);
      for (const provider of allProviders) {
        try {
          const instance = await container.resolve(provider);
          if (instance && typeof (instance as any).onModuleDestroy === 'function') {
            await (instance as OnModuleDestroy).onModuleDestroy();
          }
        } catch (error) {
          // Ignore resolution errors for optional lifecycle hooks
        }
      }
    };

    // Override the listen method to automatically call lifecycle hooks
    const originalListen = app.listen.bind(app);
    (app as any).listen = async (...args: any[]): Promise<string> => {
      // Call OnApplicationBootstrap before starting the server
      await (app as any).callOnApplicationBootstrap();
      
      // Start the server
      const address = await originalListen(...args);
      
      // Set up graceful shutdown handlers
      const gracefulShutdown = async (signal: string) => {
        console.log(`Received ${signal}. Starting graceful shutdown...`);
        
        try {
          // Call BeforeApplicationShutdown lifecycle hooks
          await (app as any).callBeforeApplicationShutdown();
          
          // Call OnModuleDestroy lifecycle hooks
          await (app as any).callOnModuleDestroy();
          
          // Close the server
          await app.close();
          
          console.log('Graceful shutdown completed.');
          process.exit(0);
        } catch (error) {
          console.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      };
      
      // Register signal handlers for graceful shutdown
      process.once('SIGINT', () => gracefulShutdown('SIGINT'));
      process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
      
      return address;
    };

    return app as RapidoApp;
  }
}
