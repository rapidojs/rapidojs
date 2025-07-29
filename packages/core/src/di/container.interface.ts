import { Type } from '../types.js';
import { ForwardReference } from '@rapidojs/common';

/**
 * 通用容器接口，定义依赖注入容器的基本方法
 */
export interface IContainer {
  /**
   * 解析依赖
   */
  resolve<T>(target: Type<T> | ForwardReference<T> | string, ...args: any[]): Promise<T> | T;
  
  /**
   * 获取实例映射（用于兼容性）
   */
  readonly instances: Map<any, any>;
}