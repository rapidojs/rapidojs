# TypeORM 集成

> RapidoJS 提供了与 TypeORM 的深度集成，支持声明式数据库操作、自动事务管理和依赖注入。

## 概述

`@rapidojs/typeorm` 模块为 RapidoJS 应用提供了完整的 TypeORM 集成解决方案，包括：

- 🚀 **零配置启动** - 开箱即用的数据库连接管理
- 💉 **依赖注入** - 自动注入 Repository 和 EntityManager
- 🔄 **声明式事务** - 使用装饰器轻松管理事务
- 🔍 **实体扫描** - 自动发现和注册实体
- 🛠️ **生命周期管理** - 自动处理连接的创建和销毁
- 📊 **查询优化** - 事务感知的 Repository 工厂

## 安装

```bash
npm install @rapidojs/typeorm typeorm reflect-metadata
```

### 数据库驱动

根据使用的数据库类型安装相应驱动：

```bash
# PostgreSQL
npm install pg @types/pg

# MySQL
npm install mysql2

# SQLite
npm install sqlite3

# SQL Server
npm install mssql

# Oracle
npm install oracledb
```

## 快速开始

### 1. 基础配置

```typescript
// app.module.ts
import { Module } from '@rapidojs/common';
import { TypeOrmModule } from '@rapidojs/typeorm';
import { User } from './entities/user.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'password',
      database: 'myapp',
      entities: [User],
      synchronize: true, // 仅开发环境使用
      logging: true
    })
  ]
})
export class AppModule {}
```

### 2. 创建实体

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'int', default: 18 })
  age!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 3. 创建服务

```typescript
// users/users.service.ts
import { Injectable } from '@rapidojs/common';
import { Repository } from 'typeorm';
import { InjectRepository, Transactional } from '@rapidojs/typeorm';
import { User } from '../entities/user.entity.js';

interface CreateUserDto {
  name: string;
  email: string;
  age?: number;
}

interface UpdateUserDto {
  name?: string;
  email?: string;
  age?: number;
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  @Transactional()
  async create(userData: CreateUserDto): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  @Transactional()
  async update(id: number, userData: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // 如果更新邮箱，检查是否重复
    if (userData.email && userData.email !== user.email) {
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }
    }

    Object.assign(user, userData);
    return this.userRepository.save(user);
  }

  @Transactional()
  async delete(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('User not found');
    }
  }

  async findActiveUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async getUserStats(): Promise<{ total: number; active: number; inactive: number }> {
    const [total, active] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } })
    ]);

    return {
      total,
      active,
      inactive: total - active
    };
  }
}
```

### 4. 创建模块

```typescript
// users/users.module.ts
import { Module } from '@rapidojs/common';
import { TypeOrmModule } from '@rapidojs/typeorm';
import { User } from '../entities/user.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User])
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService]
})
export class UsersModule {}
```

## 模块配置

### 同步配置

适用于简单的配置场景：

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'myapp',
  entities: [User, Post, Comment],
  synchronize: false,
  logging: ['error', 'warn'],
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true,
  ssl: {
    rejectUnauthorized: false
  }
})
```

### 异步配置

适用于需要从配置服务或环境变量读取配置的场景：

```typescript
// 使用配置服务
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: configService.get('DB_TYPE') as any,
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities: [User, Post, Comment],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    ssl: configService.get('NODE_ENV') === 'production' ? {
      rejectUnauthorized: false
    } : false
  })
})

// 使用工厂函数
TypeOrmModule.forRootAsync({
  useFactory: () => ({
    type: 'sqlite',
    database: ':memory:',
    entities: [User],
    synchronize: true
  })
})
```

### 多数据库配置

```typescript
// 主数据库
TypeOrmModule.forRoot({
  name: 'default',
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'main_db',
  entities: [User, Post]
})

// 日志数据库
TypeOrmModule.forRoot({
  name: 'logs',
  type: 'mongodb',
  host: 'localhost',
  port: 27017,
  database: 'logs_db',
  entities: [LogEntry]
})
```

## 实体管理

### 基础实体定义

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { hash } from 'bcrypt';

@Entity('users')
@Index(['email']) // 为邮箱创建索引
@Index(['name', 'isActive']) // 复合索引
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false }) // 默认查询时不包含密码
  password!: string;

  @Column({ type: 'int', default: 18 })
  age!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'enum', enum: ['admin', 'user', 'moderator'], default: 'user' })
  role!: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  // 生命周期钩子
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await hash(this.password, 10);
    }
  }

  // 虚拟属性
  get displayName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }

  get isAdult(): boolean {
    return this.age >= 18;
  }
}
```

### 关联关系

```typescript
// 一对多关系
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Post, post => post.category, {
    cascade: true, // 级联操作
    onDelete: 'CASCADE'
  })
  posts!: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column()
  categoryId!: number;

  @Column()
  authorId!: number;

  @ManyToOne(() => Category, category => category.posts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @OneToMany(() => Comment, comment => comment.post, {
    cascade: ['insert', 'update']
  })
  comments!: Comment[];

  @ManyToMany(() => Tag, tag => tag.posts)
  @JoinTable({
    name: 'post_tags',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags!: Tag[];
}

// 多对多关系
@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => Post, post => post.tags)
  posts!: Post[];
}

// 一对一关系
@Entity('user_profiles')
export class UserProfile {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  bio?: string;

  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
```

### 实体注册方式

```typescript
// 方式1：在根模块中注册所有实体
TypeOrmModule.forRoot({
  // ... 其他配置
  entities: [User, Post, Comment, Category, Tag, UserProfile]
})

// 方式2：在特性模块中注册相关实体
@Module({
  imports: [TypeOrmModule.forFeature([User, UserProfile])]
})
export class UsersModule {}

@Module({
  imports: [TypeOrmModule.forFeature([Post, Comment, Category, Tag])]
})
export class BlogModule {}

// 方式3：使用装饰器注册
const BlogEntities = TypeOrmModule.createEntitiesDecorator([Post, Comment, Category, Tag]);

@BlogEntities
@Module({
  // ... 其他配置
})
export class BlogModule {}

// 方式4：使用 glob 模式（在配置中）
TypeOrmModule.forRoot({
  // ... 其他配置
  entities: ['dist/**/*.entity.js']
})
```

## Repository 注入

### 基础用法

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // 基础 CRUD 操作
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: number, userData: Partial<User>): Promise<void> {
    await this.userRepository.update(id, userData);
  }

  async delete(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
```

### 高级查询操作

```typescript
@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // 关联查询
  async findPostsWithAuthor(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['author', 'category', 'tags'],
      order: { createdAt: 'DESC' }
    });
  }

  // 条件查询
  async findPostsByStatus(published: boolean): Promise<Post[]> {
    return this.postRepository.find({
      where: { published },
      relations: ['author'],
      order: { createdAt: 'DESC' }
    });
  }

  // 分页查询
  async findPostsPaginated(page: number, limit: number) {
    const [posts, total] = await this.postRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      relations: ['author', 'category'],
      order: { createdAt: 'DESC' }
    });

    return {
      data: posts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  // 复杂查询构建器
  async searchPosts(searchParams: {
    keyword?: string;
    categoryId?: number;
    authorId?: number;
    published?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<Post[]> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.tags', 'tags');

    if (searchParams.keyword) {
      query.andWhere(
        '(post.title ILIKE :keyword OR post.content ILIKE :keyword)',
        { keyword: `%${searchParams.keyword}%` }
      );
    }

    if (searchParams.categoryId) {
      query.andWhere('post.categoryId = :categoryId', {
        categoryId: searchParams.categoryId
      });
    }

    if (searchParams.authorId) {
      query.andWhere('post.authorId = :authorId', {
        authorId: searchParams.authorId
      });
    }

    if (searchParams.published !== undefined) {
      query.andWhere('post.published = :published', {
        published: searchParams.published
      });
    }

    if (searchParams.dateFrom) {
      query.andWhere('post.createdAt >= :dateFrom', {
        dateFrom: searchParams.dateFrom
      });
    }

    if (searchParams.dateTo) {
      query.andWhere('post.createdAt <= :dateTo', {
        dateTo: searchParams.dateTo
      });
    }

    return query
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }

  // 聚合查询
  async getPostStatistics() {
    const result = await this.postRepository
      .createQueryBuilder('post')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN post.published = true THEN 1 END) as published',
        'COUNT(CASE WHEN post.published = false THEN 1 END) as draft',
        'AVG(LENGTH(post.content)) as avgContentLength'
      ])
      .getRawOne();

    return {
      total: parseInt(result.total),
      published: parseInt(result.published),
      draft: parseInt(result.draft),
      avgContentLength: parseFloat(result.avgcontentlength)
    };
  }

  // 原生 SQL 查询
  async getPopularPosts(limit: number = 10): Promise<any[]> {
    return this.postRepository.query(`
      SELECT 
        p.id,
        p.title,
        u.name as author_name,
        COUNT(c.id) as comment_count
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.published = true
      GROUP BY p.id, p.title, u.name
      ORDER BY comment_count DESC
      LIMIT $1
    `, [limit]);
  }
}
```

### 自定义 Repository

```typescript
// repositories/user.repository.ts
import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@rapidojs/common';
import { User } from '../entities/user.entity.js';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findOne({ 
      where: { email },
      select: ['id', 'name', 'email', 'role', 'isActive'] // 排除密码
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async findUsersByRole(role: string): Promise<User[]> {
    return this.find({
      where: { role, isActive: true },
      order: { name: 'ASC' }
    });
  }

  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    const [total, active, roleStats] = await Promise.all([
      this.count(),
      this.count({ where: { isActive: true } }),
      this.createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany()
    ]);

    const byRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = parseInt(stat.count);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive: total - active,
      byRole
    };
  }

  async searchUsers(searchTerm: string): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.name ILIKE :searchTerm OR user.email ILIKE :searchTerm', {
        searchTerm: `%${searchTerm}%`
      })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .orderBy('user.name', 'ASC')
      .getMany();
  }
}

// 在模块中注册自定义 Repository
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserRepository, UsersService],
  exports: [UserRepository, UsersService]
})
export class UsersModule {}
```

## 事务管理

### 声明式事务

`@Transactional()` 装饰器提供了简单而强大的事务管理：

```typescript
@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>
  ) {}

  @Transactional()
  async createUserWithPost(userData: Partial<User>, postData: Partial<Post>): Promise<{
    user: User;
    post: Post;
  }> {
    // 创建用户
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // 创建文章
    const post = this.postRepository.create({
      ...postData,
      authorId: savedUser.id
    });
    const savedPost = await this.postRepository.save(post);

    // 如果任何操作失败，整个事务会自动回滚
    return { user: savedUser, post: savedPost };
  }

  @Transactional()
  async transferPostOwnership(postId: number, newOwnerId: number): Promise<void> {
    // 验证新所有者存在
    const newOwner = await this.userRepository.findOne({ where: { id: newOwnerId } });
    if (!newOwner) {
      throw new Error('New owner not found'); // 事务会自动回滚
    }

    // 验证文章存在
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post not found'); // 事务会自动回滚
    }

    // 更新文章所有者
    await this.postRepository.update(postId, { authorId: newOwnerId });

    // 记录操作日志（也在同一事务中）
    await this.logOwnershipTransfer(postId, post.authorId, newOwnerId);
  }

  @Transactional()
  async publishPostWithNotification(postId: number): Promise<void> {
    // 更新文章状态
    const result = await this.postRepository.update(postId, { published: true });
    if (result.affected === 0) {
      throw new Error('Post not found');
    }

    // 获取文章信息
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author']
    });

    if (!post) {
      throw new Error('Post not found after update');
    }

    // 发送通知（如果失败，整个操作回滚）
    await this.sendPublishNotification(post);
  }

  private async logOwnershipTransfer(postId: number, oldOwnerId: number, newOwnerId: number): Promise<void> {
    // 记录操作日志的逻辑
    console.log(`Post ${postId} ownership transferred from ${oldOwnerId} to ${newOwnerId}`);
  }

  private async sendPublishNotification(post: Post): Promise<void> {
    // 发送通知的逻辑
    console.log(`Post "${post.title}" by ${post.author.name} has been published`);
  }
}
```

### 事务嵌套

事务装饰器支持嵌套，内层事务会复用外层事务：

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>
  ) {}

  @Transactional()
  async createOrder(userId: number, items: CreateOrderItemDto[]): Promise<Order> {
    // 验证用户
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 创建订单（嵌套事务）
    const order = await this.createOrderRecord(userId);
    
    // 创建订单项（嵌套事务）
    await this.createOrderItems(order.id, items);
    
    // 更新库存（嵌套事务）
    await this.updateProductStock(items);

    return order;
  }

  @Transactional() // 嵌套事务，会复用外层事务
  private async createOrderRecord(userId: number): Promise<Order> {
    const order = this.orderRepository.create({
      userId,
      status: 'pending',
      total: 0
    });
    return this.orderRepository.save(order);
  }

  @Transactional() // 嵌套事务
  private async createOrderItems(orderId: number, items: CreateOrderItemDto[]): Promise<void> {
    let total = 0;

    for (const item of items) {
      // 验证产品存在
      const product = await this.productRepository.findOne({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      // 检查库存
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }

      // 创建订单项
      const orderItem = this.orderItemRepository.create({
        orderId,
        productId: item.productId,
        quantity: item.quantity,
        price: product.price
      });
      await this.orderItemRepository.save(orderItem);

      total += product.price * item.quantity;
    }

    // 更新订单总额
    await this.orderRepository.update(orderId, { total });
  }

  @Transactional() // 嵌套事务
  private async updateProductStock(items: CreateOrderItemDto[]): Promise<void> {
    for (const item of items) {
      await this.productRepository.decrement(
        { id: item.productId },
        'stock',
        item.quantity
      );
    }
  }
}
```

### 手动事务管理

对于需要更精细控制的场景，可以手动管理事务：

```typescript
import { getCurrentTransactionContext } from '@rapidojs/typeorm';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>
  ) {}

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<void> {
    const transactionContext = getCurrentTransactionContext();
    
    if (transactionContext) {
      // 在现有事务中执行
      await this.performTransfer(fromAccountId, toAccountId, amount);
    } else {
      // 创建新事务
      await this.performTransferWithTransaction(fromAccountId, toAccountId, amount);
    }
  }

  @Transactional()
  private async performTransferWithTransaction(
    fromAccountId: number, 
    toAccountId: number, 
    amount: number
  ): Promise<void> {
    await this.performTransfer(fromAccountId, toAccountId, amount);
  }

  private async performTransfer(
    fromAccountId: number, 
    toAccountId: number, 
    amount: number
  ): Promise<void> {
    // 获取当前事务上下文
    const context = getCurrentTransactionContext();
    const manager = context ? context.manager : this.accountRepository.manager;

    // 锁定账户（防止并发问题）
    const fromAccount = await manager
      .createQueryBuilder(Account, 'account')
      .setLock('pessimistic_write')
      .where('account.id = :id', { id: fromAccountId })
      .getOne();

    if (!fromAccount) {
      throw new Error('Source account not found');
    }

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const toAccount = await manager
      .createQueryBuilder(Account, 'account')
      .setLock('pessimistic_write')
      .where('account.id = :id', { id: toAccountId })
      .getOne();

    if (!toAccount) {
      throw new Error('Destination account not found');
    }

    // 执行转账
    await manager.update(Account, fromAccountId, {
      balance: fromAccount.balance - amount
    });

    await manager.update(Account, toAccountId, {
      balance: toAccount.balance + amount
    });

    // 记录交易
    const transaction = manager.create(Transaction, {
      fromAccountId,
      toAccountId,
      amount,
      type: 'transfer',
      status: 'completed'
    });
    await manager.save(transaction);
  }

  // 批量处理示例
  @Transactional()
  async processBatchPayments(payments: PaymentDto[]): Promise<void> {
    const context = getCurrentTransactionContext();
    console.log('Processing batch payments in transaction:', !!context);

    for (const payment of payments) {
      try {
        await this.transfer(payment.fromAccountId, payment.toAccountId, payment.amount);
      } catch (error) {
        console.error(`Payment failed: ${payment.id}`, error);
        throw error; // 整个批次回滚
      }
    }
  }
}
```

## 高级功能

### 数据库迁移

```typescript
// migrations/1234567890-CreateUserTable.ts
import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateUserTable1234567890 implements MigrationInterface {
  name = 'CreateUserTable1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建用户表
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false
          },
          {
            name: 'email',
            type: 'varchar',
            length: '150',
            isUnique: true,
            isNullable: false
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            isNullable: false
          },
          {
            name: 'age',
            type: 'int',
            default: 18
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'user', 'moderator'],
            default: "'user'"
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP'
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true
          }
        ]
      }),
      true
    );

    // 创建索引
    await queryRunner.createIndex(
      'users',
      new Index('IDX_USER_EMAIL', ['email'])
    );

    await queryRunner.createIndex(
      'users',
      new Index('IDX_USER_ACTIVE_ROLE', ['is_active', 'role'])
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### 数据库种子

```typescript
// seeds/database.seed.ts
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity.js';
import { Category } from '../entities/category.entity.js';
import { Post } from '../entities/post.entity.js';

export class DatabaseSeeder {
  constructor(private readonly dataSource: DataSource) {}

  async run(): Promise<void> {
    await this.seedUsers();
    await this.seedCategories();
    await this.seedPosts();
  }

  private async seedUsers(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        age: 30
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'user123',
        role: 'user',
        age: 25
      },
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'user123',
        role: 'moderator',
        age: 28
      }
    ];

    for (const userData of users) {
      const existingUser = await userRepository.findOne({ 
        where: { email: userData.email } 
      });
      
      if (!existingUser) {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(`Created user: ${userData.email}`);
      }
    }
  }

  private async seedCategories(): Promise<void> {
    const categoryRepository = this.dataSource.getRepository(Category);
    
    const categories = [
      { name: 'Technology', description: 'Tech related posts' },
      { name: 'Lifestyle', description: 'Lifestyle and personal posts' },
      { name: 'Business', description: 'Business and entrepreneurship' }
    ];

    for (const categoryData of categories) {
      const existingCategory = await categoryRepository.findOne({ 
        where: { name: categoryData.name } 
      });
      
      if (!existingCategory) {
        const category = categoryRepository.create(categoryData);
        await categoryRepository.save(category);
        console.log(`Created category: ${categoryData.name}`);
      }
    }
  }

  private async seedPosts(): Promise<void> {
    const postRepository = this.dataSource.getRepository(Post);
    const userRepository = this.dataSource.getRepository(User);
    const categoryRepository = this.dataSource.getRepository(Category);
    
    const users = await userRepository.find();
    const categories = await categoryRepository.find();
    
    if (users.length === 0 || categories.length === 0) {
      console.log('No users or categories found, skipping post seeding');
      return;
    }

    const posts = [
      {
        title: 'Getting Started with TypeORM',
        content: 'TypeORM is a powerful ORM for TypeScript and JavaScript...',
        published: true,
        authorId: users[0].id,
        categoryId: categories[0].id
      },
      {
        title: 'Building REST APIs with RapidoJS',
        content: 'RapidoJS makes it easy to build scalable REST APIs...',
        published: true,
        authorId: users[1].id,
        categoryId: categories[0].id
      }
    ];

    for (const postData of posts) {
      const existingPost = await postRepository.findOne({ 
        where: { title: postData.title } 
      });
      
      if (!existingPost) {
        const post = postRepository.create(postData);
        await postRepository.save(post);
        console.log(`Created post: ${postData.title}`);
      }
    }
  }
}

// 运行种子脚本
// scripts/seed.ts
import { DataSource } from 'typeorm';
import { DatabaseSeeder } from '../seeds/database.seed.js';
import { databaseConfig } from '../config/database.config.js';

async function runSeeds() {
  const dataSource = new DataSource(databaseConfig());
  
  try {
    await dataSource.initialize();
    console.log('Database connected');
    
    const seeder = new DatabaseSeeder(dataSource);
    await seeder.run();
    
    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await dataSource.destroy();
  }
}

runSeeds();
```

### 查询缓存

```typescript
@Injectable()
export class CachedPostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>
  ) {}

  // 启用查询缓存
  async getPopularPosts(): Promise<Post[]> {
    return this.postRepository.find({
      where: { published: true },
      order: { viewCount: 'DESC' },
      take: 10,
      cache: {
        id: 'popular_posts',
        milliseconds: 300000 // 5分钟缓存
      }
    });
  }

  // 使用查询构建器缓存
  async getCategorizedPosts(categoryId: number): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.categoryId = :categoryId', { categoryId })
      .andWhere('post.published = :published', { published: true })
      .orderBy('post.createdAt', 'DESC')
      .cache(`category_posts_${categoryId}`, 300000)
      .getMany();
  }

  // 清除缓存
  async clearPostsCache(): Promise<void> {
    await this.postRepository.manager.connection.queryResultCache?.remove([
      'popular_posts',
      'category_posts_*'
    ]);
  }
}
```

### 软删除

```typescript
@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @DeleteDateColumn() // 软删除字段
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>
  ) {}

  // 软删除
  async softDelete(id: number): Promise<void> {
    await this.postRepository.softDelete(id);
  }

  // 恢复软删除
  async restore(id: number): Promise<void> {
    await this.postRepository.restore(id);
  }

  // 查找包含软删除的记录
  async findWithDeleted(): Promise<Post[]> {
    return this.postRepository.find({ withDeleted: true });
  }

  // 只查找软删除的记录
  async findDeleted(): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .withDeleted()
      .where('post.deletedAt IS NOT NULL')
      .getMany();
  }

  // 永久删除
  async hardDelete(id: number): Promise<void> {
    await this.postRepository.delete(id);
  }
}
```

## 项目示例

### 完整的博客系统

```typescript
// 实体定义
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  username!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ default: 'user' })
  role!: string;

  @OneToMany(() => Post, post => post.author)
  posts!: Post[];

  @OneToMany(() => Comment, comment => comment.author)
  comments!: Comment[];

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => Post, post => post.category)
  posts!: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({ default: false })
  published!: boolean;

  @Column({ default: 0 })
  viewCount!: number;

  @ManyToOne(() => User, user => user.posts)
  author!: User;

  @ManyToOne(() => Category, category => category.posts)
  category!: Category;

  @OneToMany(() => Comment, comment => comment.post)
  comments!: Comment[];

  @ManyToMany(() => Tag)
  @JoinTable()
  tags!: Tag[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('text')
  content!: string;

  @ManyToOne(() => User, user => user.comments)
  author!: User;

  @ManyToOne(() => Post, post => post.comments)
  post!: Post;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  name!: string;

  @ManyToMany(() => Post)
  posts!: Post[];
}

// 服务层
@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>
  ) {}

  // 用户管理
  @Transactional()
  async createUser(userData: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  // 文章管理
  async getPublishedPosts(page: number = 1, limit: number = 10) {
    const [posts, total] = await this.postRepository.findAndCount({
      where: { published: true },
      relations: ['author', 'category', 'tags'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPostDetail(id: number): Promise<Post | null> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'tags', 'comments', 'comments.author']
    });

    if (post) {
      // 增加浏览次数
      await this.incrementViewCount(id);
    }

    return post;
  }

  @Transactional()
  async createPost(authorId: number, postData: CreatePostDto): Promise<Post> {
    // 验证作者
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new Error('Author not found');
    }

    // 验证分类
    const category = await this.categoryRepository.findOne({ 
      where: { id: postData.categoryId } 
    });
    if (!category) {
      throw new Error('Category not found');
    }

    // 处理标签
    const tags = await this.processTags(postData.tags || []);

    // 创建文章
    const post = this.postRepository.create({
      title: postData.title,
      content: postData.content,
      author,
      category,
      tags
    });

    return this.postRepository.save(post);
  }

  @Transactional()
  async publishPost(id: number, authorId: number): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id, author: { id: authorId } },
      relations: ['author']
    });

    if (!post) {
      throw new Error('Post not found or unauthorized');
    }

    post.published = true;
    return this.postRepository.save(post);
  }

  // 评论管理
  @Transactional()
  async addComment(postId: number, authorId: number, content: string): Promise<Comment> {
    const [post, author] = await Promise.all([
      this.postRepository.findOne({ where: { id: postId, published: true } }),
      this.userRepository.findOne({ where: { id: authorId } })
    ]);

    if (!post) {
      throw new Error('Post not found or not published');
    }

    if (!author) {
      throw new Error('Author not found');
    }

    const comment = this.commentRepository.create({
      content,
      post,
      author
    });

    return this.commentRepository.save(comment);
  }

  // 搜索功能
  async searchPosts(query: string, categoryId?: number): Promise<Post[]> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('post.tags', 'tags')
      .where('post.published = :published', { published: true })
      .andWhere('(post.title ILIKE :query OR post.content ILIKE :query)', {
        query: `%${query}%`
      });

    if (categoryId) {
      queryBuilder.andWhere('post.category.id = :categoryId', { categoryId });
    }

    return queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }

  // 统计信息
  async getBlogStats() {
    const [totalPosts, publishedPosts, totalUsers, totalComments] = await Promise.all([
      this.postRepository.count(),
      this.postRepository.count({ where: { published: true } }),
      this.userRepository.count(),
      this.commentRepository.count()
    ]);

    const popularPosts = await this.postRepository.find({
      where: { published: true },
      order: { viewCount: 'DESC' },
      take: 5,
      relations: ['author']
    });

    return {
      totalPosts,
      publishedPosts,
      draftPosts: totalPosts - publishedPosts,
      totalUsers,
      totalComments,
      popularPosts
    };
  }

  // 辅助方法
  private async processTags(tagNames: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const tagName of tagNames) {
      let tag = await this.tagRepository.findOne({ where: { name: tagName } });
      
      if (!tag) {
        tag = this.tagRepository.create({ name: tagName });
        tag = await this.tagRepository.save(tag);
      }
      
      tags.push(tag);
    }

    return tags;
  }

  private async incrementViewCount(postId: number): Promise<void> {
    await this.postRepository.increment({ id: postId }, 'viewCount', 1);
  }
}
```

## 最佳实践

### 1. 实体设计原则

```typescript
// ✅ 好的实践
@Entity('users')
@Index(['email']) // 为常用查询字段添加索引
@Index(['isActive', 'role']) // 复合索引
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 }) // 明确指定类型和长度
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false }) // 敏感信息默认不查询
  password!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn() // 使用 TypeORM 的时间戳装饰器
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 使用 getter 进行数据转换
  get displayName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
}

// ❌ 避免的实践
@Entity() // 缺少表名
export class BadUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column() // 缺少类型定义
  name!: string;

  @Column() // 没有唯一约束
  email!: string;

  // 缺少时间戳字段
  // 缺少索引
}
```

### 2. 查询优化

```typescript
// ✅ 好的实践
@Injectable()
export class OptimizedPostsService {
  // 使用适当的关联加载
  async getPostsWithAuthor(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['author'], // 只加载需要的关联
      order: { createdAt: 'DESC' },
      take: 20 // 限制结果数量
    });
  }

  // 使用查询构建器进行复杂查询
  async searchOptimized(keyword: string, categoryId?: number): Promise<Post[]> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .select(['post.id', 'post.title', 'post.createdAt']) // 只选择需要的字段
      .leftJoin('post.author', 'author')
      .addSelect(['author.id', 'author.name'])
      .where('post.published = :published', { published: true });

    if (keyword) {
      query.andWhere('post.title ILIKE :keyword', { keyword: `%${keyword}%` });
    }

    if (categoryId) {
      query.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    return query
      .orderBy('post.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }

  // 使用原生查询进行复杂统计
  async getPostStatistics(): Promise<any> {
    return this.postRepository.query(`
      SELECT 
        COUNT(*) as total_posts,
        COUNT(CASE WHEN published = true THEN 1 END) as published_posts,
        AVG(view_count) as avg_views,
        MAX(view_count) as max_views
      FROM posts
      WHERE deleted_at IS NULL
    `);
  }
}

// ❌ 避免的实践
@Injectable()
export class BadPostsService {
  // 避免 N+1 查询问题
  async getBadPosts(): Promise<any[]> {
    const posts = await this.postRepository.find(); // 没有加载关联
    
    const result = [];
    for (const post of posts) {
      // 每个 post 都会触发一次数据库查询
      const author = await this.userRepository.findOne({ where: { id: post.authorId } });
      result.push({ ...post, author });
    }
    return result;
  }

  // 避免查询所有字段
  async getAllPostData(): Promise<Post[]> {
    return this.postRepository.find({
      relations: ['author', 'category', 'comments', 'tags'] // 加载了不必要的关联
    });
  }
}
```

### 3. 事务使用指南

```typescript
// ✅ 正确的事务使用
@Injectable()
export class TransactionBestPractices {
  // 对于需要保证数据一致性的操作使用事务
  @Transactional()
  async createOrderWithItems(orderData: CreateOrderDto): Promise<Order> {
    const order = await this.orderRepository.save(orderData);
    
    for (const item of orderData.items) {
      await this.orderItemRepository.save({ ...item, orderId: order.id });
      await this.productRepository.decrement({ id: item.productId }, 'stock', item.quantity);
    }
    
    return order;
  }

  // 确保错误被正确抛出以触发回滚
  @Transactional()
  async transferFunds(fromId: number, toId: number, amount: number): Promise<void> {
    const fromAccount = await this.accountRepository.findOne({ where: { id: fromId } });
    if (!fromAccount || fromAccount.balance < amount) {
      throw new Error('Insufficient funds'); // 会触发事务回滚
    }

    await this.accountRepository.update(fromId, { balance: fromAccount.balance - amount });
    await this.accountRepository.increment({ id: toId }, 'balance', amount);
  }
}

// ❌ 错误的事务使用
@Injectable()
export class BadTransactionPractices {
  @Transactional()
  async badTransactionHandling(): Promise<void> {
    try {
      await this.someOperation();
    } catch (error) {
      console.error('Error:', error);
      // ❌ 错误被捕获但没有重新抛出，事务不会回滚
    }
  }

  // ❌ 对单个操作使用事务是不必要的
  @Transactional()
  async simpleUpdate(id: number, data: any): Promise<void> {
    await this.repository.update(id, data);
  }
}
```

### 4. 错误处理

```typescript
@Injectable()
export class ErrorHandlingService {
  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      const user = this.userRepository.create(userData);
      return await this.userRepository.save(user);
    } catch (error: any) {
      // 处理特定的数据库错误
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new ConflictException('Email or username already exists');
      }
      if (error.code === '23503') { // Foreign key violation
        throw new BadRequestException('Referenced entity does not exist');
      }
      
      // 记录未知错误
      console.error('Unexpected database error:', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

## 故障排除

### 常见问题及解决方案

#### 1. 连接问题

```typescript
// 问题：数据库连接超时
// 解决方案：调整连接配置
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'myapp',
  // 连接池配置
  extra: {
    connectionLimit: 10,
    acquireTimeoutMillis: 60000,
    timeout: 60000,
    // SSL 配置（生产环境）
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false
    } : false
  },
  // 重试配置
  retryAttempts: 3,
  retryDelay: 3000,
  // 详细日志
  logging: ['error', 'warn', 'info'],
  logger: 'advanced-console'
})
```

#### 2. 实体同步问题

```typescript
// 问题：实体没有被正确识别
// 解决方案：确保实体正确注册

// 方式1：明确指定实体
TypeOrmModule.forRoot({
  entities: [User, Post, Comment], // 明确列出
  synchronize: false, // 生产环境关闭
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true
})

// 方式2：使用 glob 模式
TypeOrmModule.forRoot({
  entities: ['dist/**/*.entity.js'],
  // 确保编译后的文件路径正确
})

// 方式3：检查实体装饰器
@Entity('users') // 确保有 @Entity 装饰器
export class User {
  @PrimaryGeneratedColumn() // 确保有主键
  id!: number;
  
  // 其他字段...
}
```

#### 3. 查询性能问题

```typescript
// 问题：查询速度慢
// 解决方案：优化查询

// 启用查询日志分析
TypeOrmModule.forRoot({
  logging: ['query', 'slow'],
  maxQueryExecutionTime: 1000, // 记录超过1秒的查询
})

// 使用索引
@Entity('posts')
@Index(['authorId', 'published']) // 复合索引
@Index(['createdAt']) // 单字段索引
export class Post {
  // 实体定义...
}

// 优化查询
class OptimizedService {
  // 使用分页
  async getPosts(page: number, limit: number) {
    return this.postRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });
  }

  // 只选择需要的字段
  async getPostTitles() {
    return this.postRepository
      .createQueryBuilder('post')
      .select(['post.id', 'post.title'])
      .getMany();
  }
}
```

#### 4. 事务问题

```typescript
// 问题：事务没有正确回滚
// 解决方案：确保错误处理正确

@Transactional()
async correctTransactionHandling(): Promise<void> {
  try {
    await this.operation1();
    await this.operation2();
  } catch (error) {
    // 记录错误但重新抛出以触发回滚
    console.error('Transaction failed:', error);
    throw error; // 重要：重新抛出错误
  }
}

// 检查事务状态
@Transactional()
async debugTransaction(): Promise<void> {
  const context = getCurrentTransactionContext();
  console.log('In transaction:', !!context);
  
  if (context) {
    console.log('Query runner active:', context.queryRunner.isTransactionActive);
  }
}
```

### 调试技巧

```typescript
// 1. 启用详细日志
TypeOrmModule.forRoot({
  logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
  logger: 'advanced-console'
})

// 2. 查询构建器调试
const query = this.userRepository
  .createQueryBuilder('user')
  .where('user.age > :age', { age: 18 });

console.log('Generated SQL:', query.getSql());
console.log('Parameters:', query.getParameters());

// 3. 性能监控
class PerformanceService {
  async monitoredQuery(): Promise<User[]> {
    const start = Date.now();
    const result = await this.userRepository.find();
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`Slow query detected: ${duration}ms`);
    }
    
    return result;
  }
}

// 4. 连接状态检查
@Injectable()
export class HealthService {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource
  ) {}

  async checkDatabaseHealth(): Promise<{ status: string; details: any }> {
    try {
      const isConnected = this.dataSource.isInitialized;
      const queryResult = await this.dataSource.query('SELECT 1');
      
      return {
        status: 'healthy',
        details: {
          connected: isConnected,
          queryTest: queryResult.length > 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message }
      };
    }
  }
}
```

## 生产环境配置

### 安全配置

```typescript
// 生产环境配置
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    
    // 安全配置
    synchronize: false, // 生产环境必须关闭
    logging: ['error'], // 只记录错误
    
    // SSL 配置
    ssl: {
      rejectUnauthorized: false,
      ca: configService.get('DB_SSL_CA'),
      cert: configService.get('DB_SSL_CERT'),
      key: configService.get('DB_SSL_KEY')
    },
    
    // 连接池配置
    extra: {
      connectionLimit: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 60000
    },
    
    // 迁移配置
    migrations: ['dist/migrations/*.js'],
    migrationsRun: true,
    migrationsTableName: 'migrations_history'
  })
})
```

### 监控和日志

```typescript
// 自定义日志器
import { Logger } from 'typeorm';

class CustomLogger implements Logger {
  logQuery(query: string, parameters?: any[]) {
    console.log('Query:', query);
    if (parameters) {
      console.log('Parameters:', parameters);
    }
  }

  logQueryError(error: string, query: string, parameters?: any[]) {
    console.error('Query Error:', error);
    console.error('Query:', query);
    if (parameters) {
      console.error('Parameters:', parameters);
    }
  }

  logQuerySlow(time: number, query: string, parameters?: any[]) {
    console.warn(`Slow Query (${time}ms):`, query);
  }

  logSchemaBuild(message: string) {
    console.log('Schema:', message);
  }

  logMigration(message: string) {
    console.log('Migration:', message);
  }

  log(level: 'log' | 'info' | 'warn', message: any) {
    console[level]('TypeORM:', message);
  }
}

// 使用自定义日志器
TypeOrmModule.forRoot({
  // ... 其他配置
  logger: new CustomLogger(),
  maxQueryExecutionTime: 1000
})
```

## 总结

`@rapidojs/typeorm` 模块为 RapidoJS 应用提供了强大而灵活的数据库集成解决方案。通过本文档，你应该能够：

1. **快速上手** - 理解基本配置和使用方法
2. **掌握核心功能** - 熟练使用实体、Repository 和事务
3. **应用最佳实践** - 编写高质量、可维护的数据库代码
4. **解决常见问题** - 快速诊断和修复问题
5. **优化性能** - 编写高效的查询和事务

### 关键要点

- 🔧 **配置灵活** - 支持同步和异步配置，适应不同场景
- 💉 **依赖注入** - 无缝集成 RapidoJS 的 DI 系统
- 🔄 **事务管理** - 声明式事务简化复杂业务逻辑
- 🚀 **性能优化** - 提供多种查询优化策略
- 🛡️ **生产就绪** - 完整的错误处理和监控支持

### 下一步

- 查看 [TypeORM 官方文档](https://typeorm.io) 了解更多高级特性
- 探索 [RapidoJS 核心文档](../core.md) 了解框架其他功能
- 参考 [API 参考文档](../api-reference.md) 获取完整的 API 信息

---

如有问题或建议，欢迎在 [GitHub](https://github.com/rapidojs/rapidojs) 上提交 Issue 或 Pull Request。