import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ControllerRegistrar } from './controller-registrar.js';
import { DIContainer } from '../di/container.js';
import { Type } from '../types.js';
import { AppConfig, StaticFileConfig } from '../interfaces/app-config.interface.js';
import { MODULE_METADATA } from '../constants.js';
import { HttpException } from '../exceptions/http-exception.js';
import { HttpArgumentsHostImpl } from '../helpers/http-arguments-host.js';
import { RapidoApp, CanActivate } from '../interfaces/rapido-app.interface.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { PipeTransform } from '../pipes/pipe-transform.interface.js';
import { HttpExecutionContext } from '../helpers/execution-context.js';
import { EXCEPTION_FILTER_METADATA } from '../constants.js';
import { LoggerService } from '@rapidojs/common';

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
    const container = new DIContainer();

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

    await container.registerModule(rootModule);

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
            const host = new HttpArgumentsHostImpl(request, reply);
            return filterInstance.catch(error, host);
          }
        }

        // 然后尝试容器中注册的过滤器
        const containerFilter = container.findFilter(error);
        if (containerFilter) {
          const instance = await container.resolve(containerFilter);
          const host = new HttpArgumentsHostImpl(request, reply);
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

    (app as any).getGlobalFilters = (): (ExceptionFilter | Type<ExceptionFilter>)[] => {
      return [...globalFilters];
    };

    (app as any).getGlobalPipes = (): (PipeTransform | Type<PipeTransform>)[] => {
      return [...globalPipes];
    };

    (app as any).getGlobalGuards = (): (CanActivate | Type<CanActivate>)[] => {
      return [...globalGuards];
    };

    // 添加访问全局管道和守卫的方法给 ControllerRegistrar 使用
    (app as any).executeGlobalGuards = async (request: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
      if (globalGuards.length === 0) {
        return true;
      }

      const context = new HttpExecutionContext(request, reply);

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

    // 立即设置错误处理器
    setupErrorHandler();

    // 注册控制器
    const registrar = new ControllerRegistrar(app as RapidoApp, container);
    await registrar.register(controllers);

    // Attach the container to the app instance
    (app as any).container = container;

    return app as RapidoApp;
  }
}
