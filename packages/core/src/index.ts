// Core module entry point
import 'reflect-metadata';

export * from './constants.js';
export * from './types.js';
export * from './factory/rapido.factory.js';
export * from './decorators/index.js';
export * from './exceptions/index.js';
export * from './enums/http-status.enum.js';
export * from './interfaces/arguments-host.interface.js';
export * from './interfaces/exception-filter.interface.js';
export * from './interfaces/rapido-app.interface.js';
export * from './pipes/index.js';

export const hello = () => 'Hello from @rapidojs/core';
