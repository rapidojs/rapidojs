// Config module entry point
import 'reflect-metadata';

export * from './config.module.js';
export * from './services/config.service.js';
export * from './decorators/config-property.decorator.js';
export * from './types.js';
export * from './constants.js';

// 导出接口的类型定义
export type { IConfigService } from './interfaces/config.interface.js'; 