/**
 * TypeORM 模块常量
 */
export const TYPEORM_MODULE_OPTIONS = 'TYPEORM_MODULE_OPTIONS';
export const TYPEORM_DATA_SOURCE = 'TYPEORM_DATA_SOURCE';
export const TYPEORM_ENTITIES_METADATA = 'TYPEORM_ENTITIES_METADATA';
export const TYPEORM_TRANSACTION_CONTEXT = 'TYPEORM_TRANSACTION_CONTEXT';

/**
 * 获取 Repository 注入令牌
 * @param entity 实体类
 * @returns 注入令牌
 */
export function getRepositoryToken(entity: Function): string {
  return `${entity.name}Repository`;
}

/**
 * 获取实体元数据键
 * @param target 目标类
 * @returns 元数据键
 */
export function getEntitiesMetadataKey(target: any): string {
  return `__typeorm_entities_${target.name || 'default'}__`;
}