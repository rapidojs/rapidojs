import { DynamicModule, ModuleType } from '@rapidojs/common';

export function isDynamicModule(module: ModuleType): module is DynamicModule {
  return 'module' in module;
} 