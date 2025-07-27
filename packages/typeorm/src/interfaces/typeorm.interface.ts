import { DataSourceOptions } from 'typeorm';
import { DynamicModule } from '@rapidojs/common';

/**
 * TypeORM 模块异步配置选项
 */
export interface TypeOrmModuleAsyncOptions {
  /**
   * 要导入的模块
   */
  imports?: any[];
  
  /**
   * 要注入的依赖
   */
  inject?: any[];
  
  /**
   * 工厂函数，返回 DataSource 配置
   */
  useFactory: (...args: any[]) => Promise<DataSourceOptions> | DataSourceOptions;
  
  /**
   * 是否为全局模块
   */
  global?: boolean;
}

/**
 * TypeORM 模块选项
 */
export interface TypeOrmModuleOptions {
  /**
   * 是否为全局模块
   */
  global?: boolean;
  
  /**
   * 数据库类型
   */
  type?: string;
  
  /**
   * 其他 DataSource 选项
   */
  [key: string]: any;
}

/**
 * 实体元数据
 */
export interface EntityMetadata {
  /**
   * 实体类
   */
  entity: Function;
  
  /**
   * 模块名称
   */
  module: string;
}

/**
 * 事务上下文
 */
export interface TransactionContext {
  /**
   * 查询运行器
   */
  queryRunner: any;
  
  /**
   * 实体管理器
   */
  manager: any;
}