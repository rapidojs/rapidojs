import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from '@rapidojs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { EntityScannerService } from './entity-scanner.service.js';

/**
 * TypeORM 核心服务
 * 负责管理 DataSource 的生命周期
 */
@Injectable()
export class TypeOrmCoreService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private dataSource: DataSource | null = null;
  private options: DataSourceOptions;

  constructor(
    options: DataSourceOptions,
    private readonly entityScanner: EntityScannerService
  ) {
    this.options = options;
  }

  /**
   * 应用启动时初始化数据库连接
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      // 获取所有扫描到的实体
      const entities = this.entityScanner.getEntities();
      
      // 合并用户配置和扫描到的实体
      const finalOptions: DataSourceOptions = {
        ...this.options,
        entities: [...(Array.isArray(this.options.entities) ? this.options.entities : []), ...entities]
      };

      // 创建 DataSource
      this.dataSource = new DataSource(finalOptions);
      
      // 初始化连接
      await this.dataSource.initialize();
      
      console.log('✅ TypeORM DataSource has been initialized successfully');
      console.log(`📊 Registered entities: ${entities.map(e => e.name).join(', ')}`);
    } catch (error) {
      console.error('❌ Error during TypeORM DataSource initialization:', error);
      throw error;
    }
  }

  /**
   * 应用关闭前销毁数据库连接
   */
  async beforeApplicationShutdown(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      try {
        await this.dataSource.destroy();
        console.log('✅ TypeORM DataSource has been destroyed successfully');
      } catch (error) {
        console.error('❌ Error during TypeORM DataSource destruction:', error);
        throw error;
      }
    }
  }

  /**
   * 获取 DataSource 实例
   * @returns DataSource 实例
   */
  getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error('DataSource is not initialized. Make sure the application has been bootstrapped.');
    }
    return this.dataSource;
  }

  /**
   * 检查 DataSource 是否已初始化
   * @returns 是否已初始化
   */
  isInitialized(): boolean {
    return this.dataSource?.isInitialized ?? false;
  }
}