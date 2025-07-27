import { AsyncLocalStorage } from 'async_hooks';
import { container } from 'tsyringe';
import { DataSource, QueryRunner } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../constants.js';
import { TransactionContext } from '../interfaces/typeorm.interface.js';

/**
 * 事务上下文存储
 */
export const transactionStorage = new AsyncLocalStorage<TransactionContext>();

/**
 * 声明式事务装饰器
 * 为被装饰的异步方法提供自动事务管理
 * 
 * @returns 方法装饰器
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   @Transactional()
 *   async createUserAndProfile(userData: CreateUserDto) {
 *     // 所有数据库操作都在同一事务中
 *     const user = await this.userRepository.save(userData);
 *     const profile = await this.profileRepository.save({ userId: user.id });
 *     return { user, profile };
 *   }
 * }
 * ```
 */
export function Transactional(): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 检查是否已经在事务中
      const existingContext = transactionStorage.getStore();
      if (existingContext) {
        // 如果已经在事务中，直接执行原方法
        return originalMethod.apply(this, args);
      }

      // 获取 DataSource
      const dataSource = container.resolve<DataSource>(TYPEORM_DATA_SOURCE);
      const queryRunner: QueryRunner = dataSource.createQueryRunner();

      try {
        // 连接数据库
        await queryRunner.connect();
        
        // 开始事务
        await queryRunner.startTransaction();

        // 创建事务上下文
        const transactionContext: TransactionContext = {
          queryRunner,
          manager: queryRunner.manager
        };

        // 在事务上下文中执行方法
        const result = await transactionStorage.run(transactionContext, async () => {
          return originalMethod.apply(this, args);
        });

        // 提交事务
        await queryRunner.commitTransaction();
        
        return result;
      } catch (error) {
        // 回滚事务
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        // 释放查询运行器
        await queryRunner.release();
      }
    };

    return descriptor;
  };
}

/**
 * 获取当前事务上下文
 * @returns 事务上下文或 undefined
 */
export function getCurrentTransactionContext(): TransactionContext | undefined {
  return transactionStorage.getStore();
}