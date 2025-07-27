import { Module, DynamicModule } from '@rapidojs/common';
import { DataSourceOptions } from 'typeorm';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from './interfaces/typeorm.interface.js';
import { EntityScannerService } from './services/entity-scanner.service.js';
import { RepositoryFactoryService } from './services/repository-factory.service.js';
import { TypeOrmCoreService } from './services/typeorm-core.service.js';
import { 
  TYPEORM_MODULE_OPTIONS, 
  TYPEORM_DATA_SOURCE, 
  getRepositoryToken, 
  getEntitiesMetadataKey 
} from './constants.js';

/**
 * TypeORM 集成模块
 * 提供与 TypeORM 的深度集成和声明式数据库操作
 */
@Module({})
export class TypeOrmModule {
  /**
   * 同步配置 TypeORM 模块
   * @param options TypeORM 配置选项
   * @returns 动态模块
   */
  static forRoot(options: TypeOrmModuleOptions): DynamicModule {

    return {
      module: TypeOrmModule,
      providers: [
        {
          provide: TYPEORM_MODULE_OPTIONS,
          useValue: options
        },
        TypeOrmCoreService,
        {
          provide: TYPEORM_DATA_SOURCE,
          useFactory: (coreService: TypeOrmCoreService) => coreService.getDataSource(),
          inject: [TypeOrmCoreService]
        },
        EntityScannerService,
         RepositoryFactoryService
       ],
       exports: [
           { provide: TYPEORM_DATA_SOURCE, useFactory: (coreService: TypeOrmCoreService) => coreService.getDataSource(), inject: [TypeOrmCoreService] },
           EntityScannerService,
           RepositoryFactoryService
         ]
    };
  }

  /**
   * 异步配置 TypeORM 模块
   * @param options 异步配置选项
   * @returns 动态模块
   */
  static forRootAsync(options: TypeOrmModuleAsyncOptions): DynamicModule {
    const { global = false, imports = [], inject = [], useFactory } = options;

    return {
      module: TypeOrmModule,
      imports,
      providers: [
        {
          provide: TYPEORM_MODULE_OPTIONS,
          useFactory,
          inject
        },
        EntityScannerService,
        {
          provide: TypeOrmCoreService,
          useFactory: (dataSourceOptions: DataSourceOptions, entityScanner: EntityScannerService) => {
            return new TypeOrmCoreService(dataSourceOptions, entityScanner);
          },
          inject: [TYPEORM_MODULE_OPTIONS, EntityScannerService]
        },
        {
          provide: TYPEORM_DATA_SOURCE,
          useFactory: (coreService: TypeOrmCoreService) => {
            return coreService.getDataSource();
          },
          inject: [TypeOrmCoreService]
        },
        {
          provide: RepositoryFactoryService,
          useFactory: (dataSource: any) => {
            return new RepositoryFactoryService(dataSource);
          },
          inject: [TYPEORM_DATA_SOURCE]
        }
      ],
      exports: [
        { provide: TYPEORM_DATA_SOURCE, useFactory: (coreService: TypeOrmCoreService) => coreService.getDataSource(), inject: [TypeOrmCoreService] },
        EntityScannerService,
        RepositoryFactoryService
      ]
    };
  }

  /**
   * 为特性模块注册实体
   * @param entities 实体类数组
   * @returns 动态模块
   */
  static forFeature(entities: Function[]): DynamicModule {
    const providers = entities.map(entity => ({
      provide: getRepositoryToken(entity),
      useFactory: (repositoryFactory: RepositoryFactoryService) => {
        return repositoryFactory.createRepository(entity);
      },
      inject: [RepositoryFactoryService]
    }));

    return {
      module: TypeOrmModule,
      providers: [
        ...providers,
        EntityScannerService,
        RepositoryFactoryService
      ],
      exports: providers
    };
  }

  /**
   * 创建实体元数据装饰器
   * 用于在模块类上标记实体信息
   * @param entities 实体类数组
   * @returns 类装饰器
   */
  static createEntitiesDecorator(entities: Function[]): ClassDecorator {
    return function (target: any) {
      const metadataKey = getEntitiesMetadataKey(target);
      Reflect.defineMetadata(metadataKey, entities, target);
    };
  }
}