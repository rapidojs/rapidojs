// Core module entry point
import 'reflect-metadata';

export { RapidoFactory } from './factory/rapido.factory.js';
export * from './decorators/index.js';
export * from './enums/http-status.enum.js';
export * from './exceptions/index.js';
export * from './pipes/index.js';

export type { RapidoApp } from './interfaces/rapido-app.interface.js';
export type { AppConfig } from './interfaces/app-config.interface.js';
export type { ExceptionFilter } from './interfaces/exception-filter.interface.js';
export type { CanActivate } from '@rapidojs/common';
export type { PipeTransform } from './pipes/pipe-transform.interface.js';

export const hello = () => 'Hello from @rapidojs/core';
