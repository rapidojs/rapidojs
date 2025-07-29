// 模块
export { TypeOrmModule } from './typeorm.module.js';

// 装饰器
export { InjectRepository } from './decorators/inject-repository.decorator.js';
export { Transactional, getCurrentTransactionContext } from './decorators/transactional.decorator.js';

// 接口
export type {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
  EntityMetadata,
  TransactionContext
} from './interfaces/typeorm.interface.js';

// 服务
export { EntityScannerService } from './services/entity-scanner.service.js';
export { RepositoryFactoryService } from './services/repository-factory.service.js';
export { TypeOrmCoreService } from './services/typeorm-core.service.js';

// 常量和工具函数
export { 
  TYPEORM_MODULE_OPTIONS,
  TYPEORM_DATA_SOURCE,
  TYPEORM_ENTITIES_METADATA,
  TYPEORM_TRANSACTION_CONTEXT,
  getRepositoryToken,
  getEntitiesMetadataKey
} from './constants.js';

// 重新导出 TypeORM 的核心类型，方便使用
export type {
  DataSource,
  DataSourceOptions,
  Repository,
  EntityManager,
  QueryRunner,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable
} from 'typeorm';