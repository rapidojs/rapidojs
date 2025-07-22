import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ControllerRegistrar } from './controller-registrar.js';
import { DIContainer } from '../di/container.js';
import { Type } from '../types.js';
import { AppConfig, StaticFileConfig } from '../interfaces/app-config.interface.js';
import { MODULE_METADATA } from '../constants.js';
import { HttpException } from '../exceptions/http-exception.js';
import { HttpArgumentsHostImpl } from '../helpers/http-arguments-host.js';

/**
 * The main factory for creating Rapido.js applications.
 */
export class RapidoFactory {
  /**
   * Creates and configures a Rapido.js application instance.
   *
   * @param rootModule - The root module of the application, containing controllers.
   * @param config - Optional application configuration.
   * @returns A promise that resolves to the configured Fastify instance.
   */
    public static async create(rootModule: Type<any>, config?: AppConfig): Promise<FastifyInstance & { addStaticFiles: (config: StaticFileConfig) => Promise<void> }> {
    const app = fastify(config?.fastifyOptions) as unknown as FastifyInstance;

        app.setErrorHandler(async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const filter = container.findFilter(error);
      if (filter) {
        const instance = await container.resolve(filter);
        const host = new HttpArgumentsHostImpl(request, reply);
        return instance.catch(error, host);
      }

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

    const container = new DIContainer();
    await container.registerModule(rootModule);

    const controllers = container.getControllers(rootModule);

    const registrar = new ControllerRegistrar(app, container);
    await registrar.register(controllers);

    return app as FastifyInstance & { addStaticFiles: (config: StaticFileConfig) => Promise<void> };
  }
}
