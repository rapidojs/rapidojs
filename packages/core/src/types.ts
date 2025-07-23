// 从 common 包导入基础类型
export type {
  ParamDefinition,
  Type,
  RouteDefinition,
  ModuleType,
  ModuleMetadata,
  Provider,
  // 新增的接口和枚举
  PipeTransform,
  ArgumentMetadata,
  CanActivate,
  ExecutionContext,
  ValidationPipeOptions,
  PipeMetadata
} from '@rapidojs/common';

// 导出运行时值
export {
  HttpMethod,
  ParamType,
  HttpStatus
} from '@rapidojs/common';

// 从本地模块导出 forwardRef 相关函数
export { forwardRef, isForwardReference } from './di/forward-ref.js';

