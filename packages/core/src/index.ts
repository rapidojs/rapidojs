// Core module entry point
import 'reflect-metadata';

export { RapidoFactory } from './factory/rapido.factory.js';
export * from './decorators/index.js';
export * from './enums/http-status.enum.js';
export * from './exceptions/index.js';
export * from './pipes/index.js';
export * from './health/index.js';

// Enhanced DI System
export { EnhancedDIContainer } from './di/enhanced-container.js';
export { Lazy } from './decorators/lazy.decorator.js';
export { ConditionalOn } from './decorators/conditional.decorator.js';
export { Scope, Singleton, Transient, RequestScoped } from './decorators/scope.decorator.js';

// Enhanced Exception Handling
export { EnhancedHttpException, ErrorCodeManager } from './exceptions/enhanced-http-exception.js';

// Lifecycle Event Bus
export { LifecycleEventBus, globalEventBus, InjectEventBus, OnEvent, LifecycleEvent } from './lifecycle/event-bus.js';
export type { 
  EventData,
  AppEventData, 
  ModuleEventData, 
  ServiceEventData, 
  RequestEventData,
  EventListener
} from './lifecycle/event-bus.js';

// Dynamic Module System
export { DynamicModuleLoader } from './modules/dynamic-module-loader.js';
export { ModuleConfigValidator, ConfigSchema } from './modules/config-validator.js';
export { ModuleDependencyGraph } from './modules/dependency-graph.js';
export type {
  ValidationRule,
  ConfigSchema as ConfigSchemaType,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from './modules/config-validator.js';
export type {
  ModuleNode,
  DependencyEdge,
  DependencyGraph,
  GraphAnalysis
} from './modules/dependency-graph.js';

export type { RapidoApp } from './interfaces/rapido-app.interface.js';
export type { AppConfig } from './interfaces/app-config.interface.js';
export type { ExceptionFilter } from './interfaces/exception-filter.interface.js';
export type { CanActivate, Interceptor } from '@rapidojs/common';
export type { PipeTransform } from './pipes/pipe-transform.interface.js';
export type { HealthStatus, DetailedHealthStatus, ReadinessStatus, LivenessStatus } from './health/health.service.js';

export const hello = () => 'Hello from @rapidojs/core';
