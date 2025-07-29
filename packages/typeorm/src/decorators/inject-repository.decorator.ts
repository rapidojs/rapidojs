import { inject } from 'tsyringe';
import { getRepositoryToken } from '../constants.js';

/**
 * 注入 Repository 装饰器
 * 用于在构造函数参数中注入指定实体的 Repository
 * 
 * @param entity 实体类
 * @returns 参数装饰器
 * 
 * @example
 * ```typescript
 * @Injectable()
 * export class UsersService {
 *   constructor(
 *     @InjectRepository(User)
 *     private readonly userRepository: Repository<User>,
 *   ) {}
 * }
 * ```
 */
export function InjectRepository(entity: Function): ParameterDecorator {
  const token = getRepositoryToken(entity);
  return inject(token);
}