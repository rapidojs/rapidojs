import 'reflect-metadata';
import { Type } from '../types.js';
import { ModuleMetadata } from '../types.js';
import { EXCEPTION_FILTER_METADATA, CONTROLLER_METADATA } from '../constants.js';
import { ForwardReference } from '@rapidojs/common';
import { isForwardReference } from './forward-ref.js';
import { ExceptionFilter } from '../interfaces/exception-filter.interface.js';
import { INJECT_METADATA_KEY, MODULE_METADATA_KEY } from '../constants.js';

export class DIContainer {
  private instances: Map<Type<any>, any> = new Map();
  private providerRegistry: Map<Type<any>, Type<any>> = new Map();
  private modules: Set<Type<any>> = new Set();
  private isResolving: Set<Type<any>> = new Set();
  private exceptionFilters: Map<Type<Error>, Type<ExceptionFilter>> = new Map();

  public async registerModule(module: Type<any> | ForwardReference<any>) {
    const actualModule = this.getInjectionToken(module);

    if (this.modules.has(actualModule)) {
      return;
    }
    this.modules.add(actualModule);

    const metadata: ModuleMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, actualModule);
    if (!metadata) {
      return;
    }

    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        await this.registerModule(importedModule);
      }
    }

    if (metadata.providers) {
      for (const provider of metadata.providers) {
        if (typeof provider === 'function') {
          // It's a class provider
          this.providerRegistry.set(provider, actualModule);
          const filterMetadata = Reflect.getMetadata(EXCEPTION_FILTER_METADATA, provider);
          if (filterMetadata && Array.isArray(filterMetadata)) {
            for (const exceptionType of filterMetadata) {
              this.exceptionFilters.set(exceptionType, provider as Type<ExceptionFilter>);
            }
          }
        } else {
          // It's a value provider
          const { provide, useValue } = provider;
          this.instances.set(provide, useValue);
        }
      }
    }
  }

  private resolveForwardRef<T>(forwardRef: ForwardReference<T>): Type<T> {
    return forwardRef();
  }

  private getInjectionToken<T>(typeOrRef: Type<T> | ForwardReference<T>): Type<T> {
    return isForwardReference(typeOrRef) ? this.resolveForwardRef(typeOrRef) : typeOrRef;
  }

  public async resolve<T>(target: Type<T> | ForwardReference<T>): Promise<T> {
    const actualTarget = this.getInjectionToken(target);

    if (this.instances.has(actualTarget)) {
      return this.instances.get(actualTarget) as T;
    }

    const isController = Reflect.getMetadata(CONTROLLER_METADATA, actualTarget) !== undefined;

    if (!this.providerRegistry.has(actualTarget)) {
      // If the token is not a registered provider, it might be a controller
      // or a class that doesn't need to be explicitly registered. We can
      // treat it as a transient provider.
      this.providerRegistry.set(actualTarget, actualTarget);
    }

    const tempInstance = Object.create(actualTarget.prototype);
    this.instances.set(actualTarget, tempInstance);

    try {
      const paramTypes = Reflect.getMetadata('design:paramtypes', actualTarget) || [];
      const injectMetadata = Reflect.getMetadata(INJECT_METADATA_KEY, actualTarget) || {};

      const injections = await Promise.all(
        paramTypes.map(async (paramType: Type<any>, index: number) => {
          const customToken = injectMetadata[index];
          if (customToken !== undefined) {
            return this.resolve(customToken);
          }
          return this.resolve(paramType);
        }),
      );

      const instance = new actualTarget(...injections);
      this.instances.set(actualTarget, instance);
      return instance;
    } catch (error) {
      this.instances.delete(actualTarget);
      throw error;
    }
  }

  public getControllers(module: Type<any>): Type<any>[] {
    return this.getAllControllers(module, new Set());
  }

  private getAllControllers(module: Type<any> | ForwardReference<any>, visited: Set<Type<any>>): Type<any>[] {
    const actualModule = this.getInjectionToken(module);

    if (visited.has(actualModule)) {
      return [];
    }
    visited.add(actualModule);

    const metadata: ModuleMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, actualModule);
    if (!metadata) {
      return [];
    }
    let controllers = metadata.controllers || [];

    if (metadata.imports) {
      for (const importedModule of metadata.imports) {
        controllers = [...controllers, ...this.getAllControllers(importedModule, visited)];
      }
    }

    return controllers;
  }

  public findFilter(exception: Error): Type<ExceptionFilter> | undefined {
    const exceptionType = exception.constructor as Type<Error>;
    return this.exceptionFilters.get(exceptionType);
  }
}
