/**
 * A collection of constant values used as keys for reflect-metadata.
 * Using symbols ensures that metadata keys are unique and avoids potential conflicts.
 */
export const METADATA_KEY = {
  /**
   * Metadata key for storing the prefix of a controller.
   * Applied by the @Controller decorator.
   */
  CONTROLLER_PREFIX: Symbol.for('rapido:controller:prefix'),

  /**
   * Metadata key for storing route definitions on a controller class.
   * Applied by method decorators like @Get, @Post, etc.
   */
  ROUTES: Symbol.for('rapido:routes'),
  PARAMS: Symbol.for('rapido:params'),
  PIPES: Symbol.for('rapido:pipes'),
  PARAM_PIPES: Symbol.for('rapido:param_pipes'),
  GUARDS: Symbol.for('rapido:guards'),
  INTERCEPTORS: Symbol.for('rapido:interceptors'),
  MULTIPART: Symbol.for('rapido:multipart'),
  MULTIPART_OPTIONS: Symbol.for('rapido:multipart:options')
};

export const MODULE_METADATA = 'module:metadata';
export const CONTROLLER_METADATA = 'controller:metadata';
export const CONTROLLER_PREFIX = 'controller:prefix';
export const ROUTE_METADATA = 'route:metadata';
export const PARAM_METADATA = 'param:metadata';
export const BODY_METADATA = 'body:metadata';
export const QUERY_METADATA = 'query:metadata';
export const HEADERS_METADATA = 'headers:metadata';
export const PIPE_METADATA = 'pipe:metadata';
export const INJECTABLE_METADATA = 'injectable:metadata';
export const EXCEPTION_FILTER_METADATA = 'exception-filter:metadata';

/**
 * Global metadata keys for application-level configurations
 */
export const GLOBAL_METADATA = {
  FILTERS: Symbol.for('rapido:global:filters'),
  PIPES: Symbol.for('rapido:global:pipes'),
  GUARDS: Symbol.for('rapido:global:guards'),
  INTERCEPTORS: Symbol.for('rapido:global:interceptors')
} as const;
export const FORWARD_REF_METADATA = 'forward-ref:metadata';
export const CIRCULAR_DEPENDENCY_HISTORY = 'circular-dependency:history';

// DTO Detection
export const DTO_CLASS_SUFFIXES = ['Dto', 'DTO', 'Request', 'Response', 'Input', 'Output'];
export const CLASS_VALIDATOR_METADATA_KEY = 'class-validator:properties';

// Pipe types
export const PARAM_PIPE = 'param-pipe';
export const METHOD_PIPE = 'method-pipe';
export const CONTROLLER_PIPE = 'controller-pipe';
export const GLOBAL_PIPE = 'global-pipe';

/**
 * 用于存储自定义注入令牌的元数据键
 */
export const INJECT_METADATA_KEY = 'rapido:inject';

/**
 * 模块元数据键
 */
export const MODULE_METADATA_KEY = 'rapido:module';

export const ROUTE_ARGS_METADATA = 'route:args_metadata';

export const GUARDS_METADATA = 'guards';
export const PUBLIC_ROUTE_METADATA = 'public_route';
export const INTERCEPTORS_METADATA = 'interceptors';
export const NO_TRANSFORM_METADATA = 'no_transform';