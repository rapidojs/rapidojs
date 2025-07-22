import { FastifyInstance } from 'fastify';
import { METADATA_KEY, CONTROLLER_METADATA, CONTROLLER_PREFIX, ROUTE_METADATA, PARAM_METADATA, BODY_METADATA, QUERY_METADATA, HEADERS_METADATA, PIPE_METADATA } from '../constants.js';
import { RouteDefinition, ParamDefinition, ParamType, Type } from '../types.js';
import { DIContainer } from '../di/container.js';
import { PipeTransform, ArgumentMetadata } from '../pipes/pipe-transform.interface.js';
import { ValidationPipe } from '../pipes/validation.pipe.js';
import { PipeMetadata } from '../decorators/pipe.decorators.js';



/**
 * Scans controllers, reads metadata, and registers routes with Fastify.
 */
export class ControllerRegistrar {
    constructor(
    private readonly fastify: FastifyInstance,
    private readonly container: DIContainer,
  ) {}

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
    const isController = Reflect.getMetadata(METADATA_KEY.CONTROLLER_PREFIX, controller) !== undefined;
    if (!isController) {
      return; // Silently ignore classes without @Controller decorator
    }
        const controllerInstance = await this.container.resolve(controller);

    const prefix = Reflect.getMetadata(METADATA_KEY.CONTROLLER_PREFIX, controller) || '/';
    const routes: RouteDefinition[] = Reflect.getMetadata(METADATA_KEY.ROUTES, controller);

    if (!routes || !routes.length) {
      return; // This class might not have any routes defined.
    }

    for (const route of routes) {
      const fullPath = this.joinPaths(prefix, route.path);
      const params: ParamDefinition[] = Reflect.getMetadata(METADATA_KEY.PARAMS, controller.prototype, route.methodName) || [];

      const handler = async (request: any, reply: any) => {
        const args = await this.extractArguments(request, reply, params, controller, route.methodName);
        const result = await (controllerInstance as any)[route.methodName](...args);
        return result;
      };

      const fastifyMethod = route.method.toLowerCase() as keyof FastifyInstance;

      if (typeof (this.fastify as any)[fastifyMethod] === 'function') {
        (this.fastify as any)[fastifyMethod](fullPath, {}, handler);
      } else {
        console.warn(`Unsupported HTTP method: ${route.method} for path ${fullPath}`);
      }
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
      return [request, reply];
    }

    const args = [];
    
    // Get method-level and class-level pipes
    const methodPipes: PipeMetadata[] = Reflect.getMetadata(METADATA_KEY.PIPES, controller.prototype, methodName) || [];
    const classPipes: PipeMetadata[] = Reflect.getMetadata(METADATA_KEY.PIPES, controller) || [];
    const paramPipes = Reflect.getMetadata(METADATA_KEY.PARAM_PIPES, controller.prototype, methodName) || {};
    
    for (const param of params.sort((a, b) => a.index - b.index)) {
      switch (param.type) {
        case ParamType.REQUEST:
          args[param.index] = request;
          break;
        case ParamType.RESPONSE:
          args[param.index] = reply;
          break;
        case ParamType.BODY:
          let bodyValue = request.body;
          const bodyMetatype = this.getParamType(controller.prototype, methodName, param.index);
          const bodyEffectivePipes = this.getEffectivePipes(bodyMetatype, classPipes, methodPipes, paramPipes[param.index] || []);
          bodyValue = await this.applyPipes(bodyValue, {
            type: 'body',
            data: param.key,
            metatype: bodyMetatype
          }, bodyEffectivePipes);
          args[param.index] = bodyValue;
          break;
        case ParamType.QUERY:
          let queryValue = param.key ? request.query[param.key] : request.query;
          const queryMetatype = this.getParamType(controller.prototype, methodName, param.index);
          const queryEffectivePipes = this.getEffectivePipes(queryMetatype, classPipes, methodPipes, paramPipes[param.index] || []);
          queryValue = await this.applyPipes(queryValue, {
            type: 'query',
            data: param.key,
            metatype: queryMetatype
          }, queryEffectivePipes);
          args[param.index] = queryValue;
          break;
        case ParamType.PARAM:
          let paramValue = param.key ? request.params[param.key] : request.params;
          const paramMetatype = this.getParamType(controller.prototype, methodName, param.index);
          const paramEffectivePipes = this.getEffectivePipes(paramMetatype, classPipes, methodPipes, paramPipes[param.index] || []);
          paramValue = await this.applyPipes(paramValue, {
            type: 'param',
            data: param.key,
            metatype: paramMetatype
          }, paramEffectivePipes);
          args[param.index] = paramValue;
          break;
        case ParamType.HEADERS:
          let headersValue = param.key ? request.headers[param.key] : request.headers;
          const headersMetatype = this.getParamType(controller.prototype, methodName, param.index);
          const headersEffectivePipes = this.getEffectivePipes(headersMetatype, classPipes, methodPipes, paramPipes[param.index] || []);
          headersValue = await this.applyPipes(headersValue, {
            type: 'headers',
            data: param.key,
            metatype: headersMetatype
          }, headersEffectivePipes);
          args[param.index] = headersValue;
          break;
        default:
          args[param.index] = undefined;
          break;
      }
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
    const allPipes = [...classPipes, ...methodPipes, ...paramPipes];
    
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
      console.log(`[DTO Check] ${className} matches DTO naming pattern`);
      return true;
    }
    
    // 2. Check for validation metadata (class-validator)
    const classKeys = Reflect.getMetadataKeys(metatype) || [];
    const hasValidatorMetadata = classKeys.some(key => 
      key && key.toString().includes('validator')
    );
    
    if (hasValidatorMetadata) {
      console.log(`[DTO Check] ${className} has validator metadata`);
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
        console.log(`[DTO Check] ${className} prototype has validator metadata`);
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
          console.log(`[DTO Check] ${className}.${propName} has validator metadata`);
          return true;
        }
      }
    }
    
    // 5. Fallback: if the class has any metadata at all and is not a built-in class,
    // and has a reasonable name, consider it a potential DTO
    if (classKeys.length > 0 && className && className.length > 2 && 
        !className.startsWith('HTML') && !className.startsWith('Web')) {
      console.log(`[DTO Check] ${className} has metadata and reasonable name, treating as DTO`);
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
