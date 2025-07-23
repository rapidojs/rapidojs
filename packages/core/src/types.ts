// 从 common 包导入基础类型
export {
  HttpMethod,
  ParamType,
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
  PipeMetadata,
  HttpStatus
} from '@rapidojs/common';

// 从本地模块导出 forwardRef 相关函数
export { forwardRef, isForwardReference } from './di/forward-ref.js';

