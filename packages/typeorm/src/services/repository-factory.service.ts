import { Injectable } from '@rapidojs/common';
import { DataSource, Repository, EntityTarget, ObjectLiteral } from 'typeorm';
import { getCurrentTransactionContext } from '../decorators/transactional.decorator.js';

/**
 * Repository 工厂服务
 * 负责创建事务感知的 Repository 实例
 */
@Injectable()
export class RepositoryFactoryService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * 创建 Repository 实例
   * 如果当前在事务上下文中，返回事务性的 Repository
   * 否则返回普通的 Repository
   * 
   * @param entity 实体类
   * @returns Repository 实例
   */
  createRepository<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    const transactionContext = getCurrentTransactionContext();
    
    if (transactionContext) {
      // 在事务中，使用事务管理器
      return transactionContext.manager.getRepository(entity);
    } else {
      // 不在事务中，使用默认管理器
      return this.dataSource.getRepository(entity);
    }
  }

  /**
   * 获取实体管理器
   * 如果当前在事务上下文中，返回事务性的 EntityManager
   * 否则返回普通的 EntityManager
   */
  getEntityManager() {
    const transactionContext = getCurrentTransactionContext();
    
    if (transactionContext) {
      return transactionContext.manager;
    } else {
      return this.dataSource.manager;
    }
  }

  /**
   * 检查是否在事务中
   * @returns 是否在事务中
   */
  isInTransaction(): boolean {
    return getCurrentTransactionContext() !== undefined;
  }
}