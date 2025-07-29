# @rapidojs/typeorm

> RapidoJS TypeORM 集成模块 - 提供与 TypeORM 的深度集成和声明式数据库操作

## 📋 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [模块配置](#模块配置)
- [实体管理](#实体管理)
- [Repository 注入](#repository-注入)
- [事务管理](#事务管理)
- [高级功能](#高级功能)
- [完整示例](#完整示例)
- [最佳实践](#最佳实践)
- [故障排除](#故障排除)
- [API 参考](#api-参考)

## 安装

```bash
npm install @rapidojs/typeorm typeorm reflect-metadata
# 或
pnpm add @rapidojs/typeorm typeorm reflect-metadata
# 或
yarn add @rapidojs/typeorm typeorm reflect-metadata
```

### 数据库驱动

根据你使用的数据库，还需要安装相应的驱动：

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg @types/pg

# SQLite
npm install sqlite3

# SQL Server
npm install mssql

# Oracle
npm install oracledb
```

## 快速开始

### 1. 创建实体

```typescript
// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

### 2. 配置模块

```typescript
// src/app.module.ts
import { Module } from '@rapidojs/common';
import { TypeOrmModule } from '@rapidojs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    // 根模块配置
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      synchronize: true,
      logging: true,
      entities: [User]
    }),
    UsersModule
  ]
})
export class AppModule {}
```

### 3. 创建服务

```typescript
// src/users/users.service.ts
import { Injectable } from '@rapidojs/common';
import { Repository } from 'typeorm';
import { InjectRepository, Transactional } from '@rapidojs/typeorm';
import { User } from '../entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  @Transactional()
  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  @Transactional()
  async update(id: number, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData);
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Transactional()
  async delete(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }
}
```

### 4. 创建特性模块

```typescript
// src/users/users.module.ts
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
  migrationsRun: true
})
```

### 异步配置

```typescript
// 使用配置服务
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_NAME'),
    entities: [User, Post, Comment],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development'
  })
})
```

### 环境变量配置

```typescript
// .env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=myapp
DB_SYNCHRONIZE=false
DB_LOGGING=true

// config/database.config.ts
export const databaseConfig = () => ({
  type: process.env.DB_TYPE as any,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true'
});

// app.module.ts
TypeOrmModule.forRootAsync({
  useFactory: databaseConfig
})
```

## 实体管理

### 基础实体

```typescript
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  DeleteDateColumn 
} from 'typeorm';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  author?: string;

  @Column({ type: 'boolean', default: false })
  published!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
```

### 关联关系

```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Post } from './post.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @OneToMany(() => Post, post => post.author)
  posts!: Post[];
}

// post.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity.js';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column()
  authorId!: number;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'authorId' })
  author!: User;
}
```

### 实体注册

```typescript
// 方式1：在根模块中注册
TypeOrmModule.forRoot({
  // ... 其他配置
  entities: [User, Post, Comment]
})

// 方式2：在特性模块中注册
@Module({
  imports: [TypeOrmModule.forFeature([User, Post])]
})
export class BlogModule {}

// 方式3：使用装饰器注册
const EntitiesDecorator = TypeOrmModule.createEntitiesDecorator([User, Post]);

@EntitiesDecorator
@Module({})
export class BlogModule {}
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

  // CRUD 操作
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

### 高级查询

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
      relations: ['author'],
      order: { createdAt: 'DESC' }
    });
  }

  // 条件查询
  async findPublishedPosts(): Promise<Post[]> {
    return this.postRepository.find({
      where: { published: true },
      order: { createdAt: 'DESC' }
    });
  }

  // 分页查询
  async findPostsPaginated(page: number, limit: number) {
    const [posts, total] = await this.postRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' }
    });

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 查询构建器
  async findPostsByAuthorName(authorName: string): Promise<Post[]> {
    return this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('author.name LIKE :name', { name: `%${authorName}%` })
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }
}
```

## 事务管理

### 声明式事务

```typescript
@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>
  ) {}

  @Transactional()
  async createUserWithPost(userData: Partial<User>, postData: Partial<Post>): Promise<{ user: User; post: Post }> {
    // 创建用户
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    // 创建文章
    const post = this.postRepository.create({
      ...postData,
      authorId: savedUser.id
    });
    const savedPost = await this.postRepository.save(post);

    return { user: savedUser, post: savedPost };
  }

  @Transactional()
  async transferPostOwnership(postId: number, newOwnerId: number): Promise<void> {
    // 验证新所有者存在
    const newOwner = await this.userRepository.findOne({ where: { id: newOwnerId } });
    if (!newOwner) {
      throw new Error('New owner not found');
    }

    // 更新文章所有者
    const result = await this.postRepository.update(postId, { authorId: newOwnerId });
    if (result.affected === 0) {
      throw new Error('Post not found');
    }
  }
}
```

### 事务嵌套

```typescript
@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>
  ) {}

  @Transactional()
  async createOrder(userId: number, items: CreateOrderItemDto[]): Promise<Order> {
    // 验证用户
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // 创建订单
    const order = await this.createOrderRecord(userId);
    
    // 创建订单项（嵌套事务）
    await this.createOrderItems(order.id, items);

    return order;
  }

  @Transactional()
  private async createOrderRecord(userId: number): Promise<Order> {
    const order = this.orderRepository.create({ userId });
    return this.orderRepository.save(order);
  }

  @Transactional()
  private async createOrderItems(orderId: number, items: CreateOrderItemDto[]): Promise<void> {
    for (const item of items) {
      const orderItem = this.orderItemRepository.create({
        orderId,
        ...item
      });
      await this.orderItemRepository.save(orderItem);
    }
  }
}
```

### 手动事务管理

```typescript
@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>
  ) {}

  async transfer(fromUserId: number, toUserId: number, amount: number): Promise<void> {
    const transactionContext = getCurrentTransactionContext();
    
    if (transactionContext) {
      // 在现有事务中执行
      await this.performTransfer(fromUserId, toUserId, amount);
    } else {
      // 创建新事务
      await this.performTransferWithTransaction(fromUserId, toUserId, amount);
    }
  }

  @Transactional()
  private async performTransferWithTransaction(fromUserId: number, toUserId: number, amount: number): Promise<void> {
    await this.performTransfer(fromUserId, toUserId, amount);
  }

  private async performTransfer(fromUserId: number, toUserId: number, amount: number): Promise<void> {
    // 扣除发送方余额
    const fromAccount = await this.accountRepository.findOne({ where: { userId: fromUserId } });
    if (!fromAccount || fromAccount.balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    await this.accountRepository.update(fromUserId, { 
      balance: fromAccount.balance - amount 
    });

    // 增加接收方余额
    const toAccount = await this.accountRepository.findOne({ where: { userId: toUserId } });
    if (!toAccount) {
      throw new Error('Recipient account not found');
    }
    
    await this.accountRepository.update(toUserId, { 
      balance: toAccount.balance + amount 
    });
  }
}
```

## 高级功能

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
    return this.findOne({ where: { email } });
  }

  async findActiveUsers(): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.createdAt', 'DESC')
      .getMany();
  }

  async getUserStats(): Promise<{ total: number; active: number; inactive: number }> {
    const [total, active] = await Promise.all([
      this.count(),
      this.count({ where: { isActive: true } })
    ]);

    return {
      total,
      active,
      inactive: total - active
    };
  }
}
```

### 数据库迁移

```typescript
// migrations/1234567890-CreateUserTable.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUserTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
            length: '100'
          },
          {
            name: 'email',
            type: 'varchar',
            length: '150',
            isUnique: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### 数据库种子

```typescript
// seeds/user.seed.ts
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity.js';

export async function seedUsers(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  
  const users = [
    { name: 'John Doe', email: 'john@example.com', age: 25 },
    { name: 'Jane Smith', email: 'jane@example.com', age: 30 },
    { name: 'Bob Johnson', email: 'bob@example.com', age: 35 }
  ];

  for (const userData of users) {
    const existingUser = await userRepository.findOne({ where: { email: userData.email } });
    if (!existingUser) {
      const user = userRepository.create(userData);
      await userRepository.save(user);
    }
  }

  console.log('Users seeded successfully');
}
```

## 完整示例

### 博客应用示例

```typescript
// entities/category.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Post } from './post.entity.js';

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

// entities/post.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './user.entity.js';
import { Category } from './category.entity.js';
import { Comment } from './comment.entity.js';

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

  @Column()
  authorId!: number;

  @Column()
  categoryId!: number;

  @ManyToOne(() => User, user => user.posts)
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @ManyToOne(() => Category, category => category.posts)
  @JoinColumn({ name: 'categoryId' })
  category!: Category;

  @OneToMany(() => Comment, comment => comment.post)
  comments!: Comment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

// services/blog.service.ts
import { Injectable } from '@rapidojs/common';
import { Repository } from 'typeorm';
import { InjectRepository, Transactional } from '@rapidojs/typeorm';
import { User } from '../entities/user.entity.js';
import { Post } from '../entities/post.entity.js';
import { Category } from '../entities/category.entity.js';
import { Comment } from '../entities/comment.entity.js';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>
  ) {}

  // 获取所有发布的文章
  async getPublishedPosts(): Promise<Post[]> {
    return this.postRepository.find({
      where: { published: true },
      relations: ['author', 'category'],
      order: { createdAt: 'DESC' }
    });
  }

  // 根据分类获取文章
  async getPostsByCategory(categoryId: number): Promise<Post[]> {
    return this.postRepository.find({
      where: { categoryId, published: true },
      relations: ['author', 'category'],
      order: { createdAt: 'DESC' }
    });
  }

  // 获取文章详情（包含评论）
  async getPostDetail(id: number): Promise<Post | null> {
    return this.postRepository.findOne({
      where: { id },
      relations: ['author', 'category', 'comments', 'comments.author']
    });
  }

  // 创建文章
  @Transactional()
  async createPost(authorId: number, postData: Partial<Post>): Promise<Post> {
    // 验证作者存在
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new Error('Author not found');
    }

    // 验证分类存在
    if (postData.categoryId) {
      const category = await this.categoryRepository.findOne({ 
        where: { id: postData.categoryId } 
      });
      if (!category) {
        throw new Error('Category not found');
      }
    }

    const post = this.postRepository.create({
      ...postData,
      authorId
    });

    return this.postRepository.save(post);
  }

  // 发布文章
  @Transactional()
  async publishPost(id: number): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { id } });
    if (!post) {
      throw new Error('Post not found');
    }

    post.published = true;
    return this.postRepository.save(post);
  }

  // 添加评论
  @Transactional()
  async addComment(postId: number, authorId: number, content: string): Promise<Comment> {
    // 验证文章存在
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new Error('Post not found');
    }

    // 验证用户存在
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new Error('Author not found');
    }

    const comment = this.commentRepository.create({
      content,
      postId,
      authorId
    });

    return this.commentRepository.save(comment);
  }

  // 获取用户的文章统计
  async getUserPostStats(userId: number) {
    const [totalPosts, publishedPosts] = await Promise.all([
      this.postRepository.count({ where: { authorId: userId } }),
      this.postRepository.count({ where: { authorId: userId, published: true } })
    ]);

    return {
      total: totalPosts,
      published: publishedPosts,
      draft: totalPosts - publishedPosts
    };
  }
}
```

## 最佳实践

### 1. 实体设计

```typescript
// ✅ 好的实践
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // 使用 getter 进行数据转换
  get displayName(): string {
    return this.name.charAt(0).toUpperCase() + this.name.slice(1);
  }
}

// ❌ 避免的实践
@Entity()
export class BadUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column() // 缺少类型和长度限制
  name!: string;

  @Column() // 没有唯一约束
  email!: string;

  // 缺少时间戳字段
}
```

### 2. 服务层设计

```typescript
// ✅ 好的实践
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  // 使用 DTO 进行数据传输
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  // 提供清晰的错误处理
  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  // 使用事务处理复杂操作
  @Transactional()
  async updateUserProfile(id: number, updateData: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }
}
```

### 3. 查询优化

```typescript
// ✅ 好的实践
@Injectable()
export class PostsService {
  // 使用索引和适当的查询
  async findRecentPosts(limit: number = 10): Promise<Post[]> {
    return this.postRepository.find({
      where: { published: true },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['author'] // 只加载需要的关联
    });
  }

  // 使用查询构建器进行复杂查询
  async searchPosts(keyword: string, categoryId?: number): Promise<Post[]> {
    const query = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoinAndSelect('post.category', 'category')
      .where('post.published = :published', { published: true })
      .andWhere('(post.title LIKE :keyword OR post.content LIKE :keyword)', {
        keyword: `%${keyword}%`
      });

    if (categoryId) {
      query.andWhere('post.categoryId = :categoryId', { categoryId });
    }

    return query
      .orderBy('post.createdAt', 'DESC')
      .getMany();
  }
}
```

### 4. 错误处理

```typescript
@Injectable()
export class UsersService {
  async create(userData: CreateUserDto): Promise<User> {
    try {
      const user = this.userRepository.create(userData);
      return await this.userRepository.save(user);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new ConflictException('Email already exists');
      }
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  @Transactional()
  async transferData(fromId: number, toId: number): Promise<void> {
    try {
      // 复杂的数据转移逻辑
      await this.performDataTransfer(fromId, toId);
    } catch (error) {
      // 事务会自动回滚
      console.error('Data transfer failed:', error);
      throw new BadRequestException('Data transfer failed');
    }
  }
}
```

## 故障排除

### 常见问题

#### 1. 连接问题

```typescript
// 问题：数据库连接失败
// 解决方案：检查配置和网络连接
TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'password',
  database: 'myapp',
  // 添加连接选项
  connectTimeoutMS: 60000,
  acquireTimeoutMS: 60000,
  timeout: 60000,
  // 启用详细日志
  logging: ['error', 'warn', 'info'],
  logger: 'advanced-console'
})
```

#### 2. 实体同步问题

```typescript
// 问题：实体没有被正确注册
// 解决方案：确保实体被正确导入和注册

// 方式1：在根模块中明确指定
TypeOrmModule.forRoot({
  // ...
  entities: [User, Post, Comment], // 明确列出所有实体
  synchronize: true // 开发环境使用
})

// 方式2：使用 glob 模式
TypeOrmModule.forRoot({
  // ...
  entities: ['dist/**/*.entity.js'],
  synchronize: false, // 生产环境关闭
  migrations: ['dist/migrations/*.js'],
  migrationsRun: true
})
```

#### 3. 事务问题

```typescript
// 问题：事务没有正确回滚
// 解决方案：确保错误被正确抛出

@Transactional()
async problematicMethod(): Promise<void> {
  try {
    await this.someOperation();
    // ❌ 错误被捕获但没有重新抛出
  } catch (error) {
    console.error('Error occurred:', error);
    // 事务不会回滚
  }
}

@Transactional()
async correctMethod(): Promise<void> {
  try {
    await this.someOperation();
  } catch (error) {
    console.error('Error occurred:', error);
    throw error; // ✅ 重新抛出错误以触发回滚
  }
}
```

### 调试技巧

```typescript
// 1. 启用查询日志
TypeOrmModule.forRoot({
  // ...
  logging: ['query', 'error', 'schema', 'warn', 'info', 'log'],
  logger: 'advanced-console'
})

// 2. 使用查询构建器调试
const query = this.userRepository
  .createQueryBuilder('user')
  .where('user.age > :age', { age: 18 });

console.log('SQL:', query.getSql());
console.log('Parameters:', query.getParameters());

// 3. 监控事务状态
@Transactional()
async debugTransaction(): Promise<void> {
  const context = getCurrentTransactionContext();
  console.log('In transaction:', !!context);
  
  if (context) {
    console.log('Transaction ID:', context.queryRunner.connection.driver.database);
  }
}
```

## API 参考

### TypeOrmModule

- `forRoot(options: TypeOrmModuleOptions): DynamicModule` - 同步配置
- `forRootAsync(options: TypeOrmModuleAsyncOptions): DynamicModule` - 异步配置
- `forFeature(entities: Function[]): DynamicModule` - 注册实体
- `createEntitiesDecorator(entities: Function[]): ClassDecorator` - 创建实体装饰器

### 装饰器

- `@InjectRepository(entity: Function): ParameterDecorator` - 注入 Repository
- `@Transactional(): MethodDecorator` - 声明式事务

### 服务

- `TypeOrmCoreService` - 核心服务，管理 DataSource 生命周期
- `RepositoryFactoryService` - Repository 工厂服务
- `EntityScannerService` - 实体扫描服务

### 工具函数

- `getCurrentTransactionContext(): TransactionContext | undefined` - 获取当前事务上下文
- `getRepositoryToken(entity: Function): string` - 获取 Repository 注入令牌

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [TypeORM 官方文档](https://typeorm.io)
- [GitHub 仓库](https://github.com/rapidojs/rapidojs)