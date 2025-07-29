import { Injectable } from '@rapidojs/common';
import { getEntitiesMetadataKey } from '../constants.js';
import { EntityMetadata } from '../interfaces/typeorm.interface.js';

/**
 * 实体扫描服务
 * 负责扫描和收集所有通过 forFeature 注册的实体
 */
@Injectable()
export class EntityScannerService {
  private entities: Function[] = [];
  private entitiesMetadata: EntityMetadata[] = [];

  /**
   * 注册实体
   * @param entities 实体类数组
   * @param moduleName 模块名称
   */
  registerEntities(entities: Function[], moduleName: string = 'default'): void {
    for (const entity of entities) {
      // 避免重复注册
      if (!this.entities.includes(entity)) {
        this.entities.push(entity);
        this.entitiesMetadata.push({
          entity,
          module: moduleName
        });
      }
    }
  }

  /**
   * 从模块元数据中扫描实体
   * @param moduleClass 模块类
   */
  scanModuleEntities(moduleClass: any): void {
    const metadataKey = getEntitiesMetadataKey(moduleClass);
    const entities = Reflect.getMetadata(metadataKey, moduleClass);
    
    if (entities && Array.isArray(entities)) {
      this.registerEntities(entities, moduleClass.name);
    }
  }

  /**
   * 获取所有注册的实体
   * @returns 实体类数组
   */
  getEntities(): Function[] {
    return [...this.entities];
  }

  /**
   * 获取实体元数据
   * @returns 实体元数据数组
   */
  getEntitiesMetadata(): EntityMetadata[] {
    return [...this.entitiesMetadata];
  }

  /**
   * 清空所有实体
   */
  clear(): void {
    this.entities = [];
    this.entitiesMetadata = [];
  }

  /**
   * 检查实体是否已注册
   * @param entity 实体类
   * @returns 是否已注册
   */
  hasEntity(entity: Function): boolean {
    return this.entities.includes(entity);
  }

  /**
   * 获取实体所属模块
   * @param entity 实体类
   * @returns 模块名称
   */
  getEntityModule(entity: Function): string | undefined {
    const metadata = this.entitiesMetadata.find(meta => meta.entity === entity);
    return metadata?.module;
  }
}