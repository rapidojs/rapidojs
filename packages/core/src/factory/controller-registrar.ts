import { FastifyInstance } from 'fastify';
import { METADATA_KEY } from '../constants.js';
import { RouteDefinition, Type } from '../types.js';
import { ParamDefinition, ParamType, CanActivate, PipeMetadata, PUBLIC_ROUTE_METADATA, GUARDS_METADATA, MODULE_METADATA_KEY, ROUTE_ARGS_METADATA, ModuleMetadata, INTERCEPTORS_METADATA, Interceptor, CallHandler, InterceptorMetadata } from '@rapidojs/common';
import { IContainer } from '../di/container.interface.js';
import { PipeTransform, ArgumentMetadata } from '../pipes/pipe-transform.interface.js';
import { ValidationPipe } from '../pipes/validation.pipe.js';
import { RapidoApp } from '../interfaces/rapido-app.interface.js';
import { HttpExecutionContextImpl } from '../helpers/execution-context-impl.js';


/**
 * Scans controllers, reads metadata, and registers routes with Fastify.
 */
export class ControllerRegistrar {
    constructor(
    private readonly fastify: FastifyInstance | RapidoApp,
    private readonly container: IContainer,
  ) {}

  /**
   * 统一处理容器解析，确保返回 Promise
   */
  private async resolveFromContainer<T>(target: any): Promise<T> {
    const result = this.container.resolve<T>(target);
    return result instanceof Promise ? result : Promise.resolve(result);
  }

  /**
   * Registers a list of controllers with the Fastify instance.
   * @param controllers - An array of controller classes to register.
   */
    public async register(controllers: Type<any>[]): Promise<void> {
    for (const controller of controllers) {
      await this.registerController(controller);
    }
  }

    private async registerController(controller: Type<any>): Promise<void> {
    // 使用新的统一元数据系统
    const moduleMetadata: ModuleMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, controller);
    
    if (!moduleMetadata?.prefix) {
      return; // Silently ignore classes without @Controller decorator
    }
    const controllerInstance = await this.resolveFromContainer(controller);

    const prefix = moduleMetadata.prefix || '/';
    const routes: RouteDefinition[] = moduleMetadata.routes || [];

    if (!routes || !routes.length) {
      return; // This class might not have any routes defined.
    }

    for (const route of routes) {
      const fullPath = this.joinPaths(prefix, route.path);
      const paramsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, route.methodName) || {};
      const params = Object.values(paramsMetadata) as ParamDefinition[];
      
      const guardsExecutor = await this.createGuardsExecutor(controller, route.methodName);
      const interceptorsExecutor = await this.createInterceptorsExecutor(controller, route.methodName);

      const handler = async (request: any, reply: any) => {
        try {
          const canActivate = await guardsExecutor(request, reply);
          if (!canActivate) {
            // Guards have already sent the response, so we just return.
            return;
          }

          const context = new HttpExecutionContextImpl(request, reply, controller, (controller.prototype as any)[route.methodName]);
          
          // Execute interceptors
          const result = await interceptorsExecutor(context, async () => {
            const args = await this.extractArguments(request, reply, params, controller, route.methodName);
            const methodResult = await (controllerInstance as any)[route.methodName](...args);
            return methodResult;
          });
          
          return result;
        } catch (error) {
          // 重新抛出异常，让 Fastify 的错误处理器处理
          throw error;
        }
      };

      const fastifyMethod = route.method.toLowerCase() as keyof FastifyInstance;

      if (typeof (this.fastify as any)[fastifyMethod] === 'function') {
        // 设置路由配置，包含控制器和方法信息
        const routeConfig = {
          preHandler: async (request: any, reply: any) => {
            // 在 preHandler 中设置路由上下文，确保在其他钩子之前执行
            (request as any).routeContext = {
              controller,
              methodName: route.methodName
            };
          }
        };
        
        (this.fastify as any)[fastifyMethod](fullPath, routeConfig, handler);
      } else {
        console.warn(`Unsupported HTTP method: ${route.method} for path ${fullPath}`);
      }
    }
  }

  private async createGuardsExecutor(
    controller: Type<any>,
    methodName: string | symbol
  ): Promise<(request: any, reply: any) => Promise<boolean>> {
    const isPublic = Reflect.getMetadata(PUBLIC_ROUTE_METADATA, (controller.prototype as any)[methodName]);
    if (isPublic) {
      return async () => true;
    }

    const classGuards = Reflect.getMetadata(GUARDS_METADATA, controller) || [];
    const methodGuards = Reflect.getMetadata(GUARDS_METADATA, (controller.prototype as any)[methodName]) || [];
    
    const guards = [...classGuards, ...methodGuards];

    return async (request: any, reply: any): Promise<boolean> => {
      // 首先执行全局守卫
      if ('executeGlobalGuards' in this.fastify) {
        const globalCanActivate = await (this.fastify as any).executeGlobalGuards(request, reply);
        if (!globalCanActivate) {
          reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Access denied by guard'
          });
          return false;
        }
      }

      // 然后执行控制器和方法级别的守卫
      if (guards.length === 0) {
        return true;
      }

      const context = new HttpExecutionContextImpl(request, reply, controller, (controller.prototype as any)[methodName]);

      for (const guard of guards) {
        const guardInstance = (await this.resolveFromContainer(guard)) as CanActivate;
        const canActivateResult = await guardInstance.canActivate(context);

        if (!canActivateResult) {
          reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Access denied by guard'
          });
          return false;
        }
      }
      return true;
    };
  }

  private async createInterceptorsExecutor(
    controller: Type<any>,
    methodName: string | symbol
  ): Promise<(context: any, next: () => Promise<any>) => Promise<any>> {
    // 返回一个动态执行器，在运行时获取全局拦截器
    return async (context: any, next: () => Promise<any>): Promise<any> => {
      // 在运行时动态获取全局拦截器
      let globalInterceptors: (Interceptor | Type<Interceptor>)[] = [];
      if ('getGlobalInterceptors' in this.fastify) {
        globalInterceptors = (this.fastify as any).getGlobalInterceptors();
      }

      // Get class and method interceptors
      const classInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, controller) || [];
      const methodInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, controller.prototype, methodName) || [];
      
      // Combine all interceptors: global -> class -> method
      const allInterceptors = [...globalInterceptors, ...classInterceptors, ...methodInterceptors];
      
      // Debug: 输出拦截器信息（仅在有拦截器时）
      // if (allInterceptors.length > 0) {
      //   process.stdout.write(`\n🔧 [拦截器执行] ${controller.name}.${String(methodName)} - 全局: ${globalInterceptors.length}, 总计: ${allInterceptors.length}\n`);
      // }

      if (allInterceptors.length === 0) {
        return next();
      }

      // Create the interceptor chain
      let index = 0;
      
      const executeInterceptor = async (): Promise<any> => {
        if (index >= allInterceptors.length) {
          return next();
        }
        
        const interceptor = allInterceptors[index++];
        const interceptorInstance = await this.createInterceptorInstance(interceptor);
        
        const callHandler: CallHandler = {
          handle: executeInterceptor
        };
        
        return await interceptorInstance.intercept(context, callHandler);
      };
      
      return executeInterceptor();
    };
  }

  /**
   * Create interceptor instance from metadata
   */
  private async createInterceptorInstance(interceptor: Interceptor | Type<Interceptor>): Promise<Interceptor> {
    if (typeof interceptor === 'function') {
      // Interceptor constructor - resolve through DI container
      return await this.resolveFromContainer(interceptor) as Interceptor;
    } else {
      // Interceptor instance
      return interceptor;
    }
  }

  private joinPaths(prefix: string, path: string): string {
    // Ensure the prefix starts with a slash if it's not empty
    const effectivePrefix = prefix && !prefix.startsWith('/') ? `/${prefix}` : prefix;

    // Ensure the path starts with a slash
    const effectivePath = path.startsWith('/') ? path : `/${path}`;

    // Join and clean up the path
    let fullPath = `${effectivePrefix}${effectivePath}`.replace(/\/\//g, '/');

    // Handle the root case and remove trailing slash for non-root paths
    if (fullPath.length > 1 && fullPath.endsWith('/')) {
      fullPath = fullPath.slice(0, -1);
    }

    return fullPath || '/';
  }

    private async extractArguments(request: any, reply: any, params: ParamDefinition[], controller: Type<any>, methodName: string | symbol): Promise<any[]> {
    if (!params.length) {
      return [];
    }

    const args = new Array(params.length);
    const context = new HttpExecutionContextImpl(request, reply, controller, (controller.prototype as any)[methodName]);
    
    // Get method-level and class-level pipes
    const methodPipes: PipeMetadata[] = Reflect.getMetadata(METADATA_KEY.PIPES, controller.prototype, methodName) || [];
    const classPipes: PipeMetadata[] = Reflect.getMetadata(METADATA_KEY.PIPES, controller) || [];
    const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, controller.prototype, methodName) || {};
    
    for (const param of params.sort((a, b) => a.index - b.index)) {
      if (!param.factory) continue; // Should not happen with the new decorator implementation
      
      let result;
      // Special handling for @Res() decorator to pass the raw reply object
      if (param.type === 'response') {
        result = reply;
      } else if (param.type === 'uploaded_file' || param.type === 'uploaded_files') {
        // For multipart file uploads, we need to ensure the request has been processed
        // The multipart plugin should have already parsed the files
        result = await param.factory(param.data, context);
      } else {
        result = await param.factory(param.data, context);
      }
      
      const metatype = this.getParamType(controller.prototype, methodName, param.index);
      const effectivePipes = this.getEffectivePipes(metatype, classPipes, methodPipes, paramPipes[param.index] || []);
      
      result = await this.applyPipes(result, {
        type: param.type as any, // TODO: Fix this any
        data: param.data,
        metatype: metatype
      }, effectivePipes);
      
      args[param.index] = result;
    }
    return args;
  }

  /**
   * Apply pipes to a value
   */
  private async applyPipes(value: any, metadata: ArgumentMetadata, pipes: PipeMetadata[]): Promise<any> {
    let result = value;
    
    for (const pipe of pipes) {
      const pipeInstance = this.createPipeInstance(pipe);
      result = await pipeInstance.transform(result, metadata);
    }
    
    return result;
  }

  /**
   * Create pipe instance from metadata
   */
  private createPipeInstance(pipe: PipeMetadata): PipeTransform {
    if (typeof pipe === 'function') {
      // Pipe constructor
      return new pipe();
    } else {
      // Pipe instance
      return pipe;
    }
  }

  /**
   * Get parameter type from TypeScript metadata
   */
  private getParamType(target: any, propertyKey: string | symbol, parameterIndex: number): any {
    const types = Reflect.getMetadata('design:paramtypes', target, propertyKey);
    return types ? types[parameterIndex] : undefined;
  }

  /**
   * Get effective pipes for a parameter, automatically adding ValidationPipe for DTO classes
   */
  private getEffectivePipes(metatype: any, classPipes: PipeMetadata[], methodPipes: PipeMetadata[], paramPipes: PipeMetadata[]): PipeMetadata[] {
    // 获取全局管道
    let globalPipes: PipeMetadata[] = [];
    if ('getGlobalPipes' in this.fastify) {
      globalPipes = (this.fastify as any).getGlobalPipes();
    }

    // 管道执行顺序：全局管道 -> 类级管道 -> 方法级管道 -> 参数级管道
    const allPipes = [...globalPipes, ...classPipes, ...methodPipes, ...paramPipes];
    
    // Check if this is a DTO class and if ValidationPipe is not already present
    if (this.isDtoClass(metatype) && !this.hasValidationPipe(allPipes)) {
      // Add ValidationPipe automatically for DTO classes

      allPipes.unshift(new ValidationPipe());
    }
    
    return allPipes;
  }

  /**
   * Check if a class is a DTO class (has validation decorators or follows DTO naming pattern)
   */
  private isDtoClass(metatype: any): boolean {
    if (!metatype || typeof metatype !== 'function') {
      return false;
    }
    
    // Check if it's a primitive type
    if (metatype === String || metatype === Number || metatype === Boolean || metatype === Array || metatype === Object) {
      return false;
    }
    
    const className = metatype.name;
    
    // 1. Check for DTO naming patterns
    const dtoPatterns = [/Dto$/, /DTO$/, /Request$/, /Response$/, /Input$/, /Output$/];
    const matchesPattern = dtoPatterns.some(pattern => pattern.test(className));
    
    if (matchesPattern) {
      return true;
    }
    
    // 2. Check for validation metadata (class-validator)
    const classKeys = Reflect.getMetadataKeys(metatype) || [];
    const hasValidatorMetadata = classKeys.some(key => 
      key && key.toString().includes('validator')
    );
    
    if (hasValidatorMetadata) {
      return true;
    }
    
    // 3. Check prototype for validation metadata
    const prototype = metatype.prototype;
    if (prototype) {
      const prototypeKeys = Reflect.getMetadataKeys(prototype) || [];
      const hasPrototypeValidatorMetadata = prototypeKeys.some(key => 
        key && key.toString().includes('validator')
      );
      
      if (hasPrototypeValidatorMetadata) {
        return true;
      }
      
      // 4. Check if any properties have validation metadata
      // Get property names from TypeScript metadata
      const paramTypes = Reflect.getMetadata('design:paramtypes', metatype) || [];
      const propertyNames = Object.getOwnPropertyNames(prototype);
      
      // Also check for properties defined with decorators
      for (const propName of propertyNames) {
        if (propName === 'constructor') continue;
        
        const propKeys = Reflect.getMetadataKeys(prototype, propName) || [];
        const hasPropertyValidatorMetadata = propKeys.some(key => 
          key && (key.toString().includes('validator') || key.toString().includes('class-validator'))
        );
        
        if (hasPropertyValidatorMetadata) {
          return true;
        }
      }
    }
    
    // 5. Fallback: if the class has any metadata at all and is not a built-in class,
    // and has a reasonable name, consider it a potential DTO
    if (classKeys.length > 0 && className && className.length > 2 && 
        !className.startsWith('HTML') && !className.startsWith('Web')) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if ValidationPipe is already present in the pipes array
   */
  private hasValidationPipe(pipes: PipeMetadata[]): boolean {
    
    return pipes.some(pipe => {
      // Check if it's a constructor function
      if (typeof pipe === 'function') {
        return pipe === ValidationPipe;
      }
      // Check if it's an instance
      if (typeof pipe === 'object' && pipe.constructor) {
        return pipe.constructor === ValidationPipe;
      }
      return false;
    });
  }
}
