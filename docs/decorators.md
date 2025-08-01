---
sidebar_position: 3
---

# 装饰器

装饰器是 Rapido.js 的核心特性，用于定义路由、参数提取、依赖注入等功能。

## 类装饰器

### @Controller

定义控制器类和路由前缀：

```typescript
import { Controller } from '@rapidojs/core';

@Controller('/api/users')
export class UsersController {
  // 所有路由都会有 /api/users 前缀
}
```

### @Module

定义应用模块：

```typescript
import { Module } from '@rapidojs/core';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [DatabaseModule],
  exports: [UsersService]
})
export class UsersModule {}
```

### @Injectable

标记类可以被依赖注入：

```typescript
import { Injectable } from '@rapidojs/core';

@Injectable()
export class UsersService {
  findAll() {
    return [];
  }
}
```

### 高级依赖注入装饰器

#### @Scope

指定服务的生命周期作用域：

```typescript
import { Scope, DependencyScope, Injectable } from '@rapidojs/core';

// 单例作用域（默认）
@Scope(DependencyScope.SINGLETON)
@Injectable()
export class DatabaseService {
  // 整个应用生命周期内只有一个实例
}

// 瞬态作用域
@Scope(DependencyScope.TRANSIENT)
@Injectable()
export class LoggerService {
  // 每次注入都创建新实例
}

// 请求级作用域
@Scope(DependencyScope.REQUEST)
@Injectable()
export class RequestContextService {
  // 每个 HTTP 请求内共享同一个实例
}
```

#### 作用域装饰器语法糖

```typescript
import { Singleton, Transient, RequestScoped } from '@rapidojs/core';

// 单例作用域装饰器
@Singleton()
@Injectable()
export class CacheService {}

// 瞬态作用域装饰器
@Transient()
@Injectable()
export class UtilityService {}

// 请求级作用域装饰器
@RequestScoped()
@Injectable()
export class UserContextService {}
```

#### @ConditionalOn

条件注入装饰器，只有当指定条件满足时才会注册服务：

```typescript
import { ConditionalOn, Injectable } from '@rapidojs/core';

// 只在生产环境注册
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionService {
  // 生产环境专用服务
}

// 根据配置注册
@ConditionalOn({ config: 'feature.redis', value: 'true' })
@Injectable()
export class RedisService {
  // 当 FEATURE_REDIS=true 时注册
}

// 自定义条件
@ConditionalOn({ condition: () => process.platform === 'darwin' })
@Injectable()
export class MacOSService {
  // 只在 macOS 系统注册
}

// 多条件组合
@ConditionalOn({ 
  env: 'NODE_ENV', 
  value: 'production',
  condition: () => process.env.ENABLE_CACHE === 'true'
})
@Injectable()
export class ProductionCacheService {}
```

#### @Lazy

懒加载装饰器，标记依赖为懒加载：

```typescript
import { Injectable, Lazy, Inject } from '@rapidojs/core';

@Injectable()
export class HeavyService {
  constructor() {
    console.log('HeavyService 实例化');
    // 执行耗时的初始化操作
  }
  
  process() {
    return 'Heavy processing done';
  }
}

@Injectable()
export class MyService {
  constructor(
    @Lazy() private heavyService: HeavyService
  ) {
    console.log('MyService 实例化');
    // HeavyService 此时还未实例化
  }

  async doSomething() {
    // HeavyService 只有在这里第一次被访问时才会实例化
    return await this.heavyService.process();
  }
}
```

### @Scope

指定服务的生命周期作用域：

```typescript
import { Injectable, Scope, DependencyScope } from '@rapidojs/core';

// 单例作用域（默认）
@Scope(DependencyScope.SINGLETON)
@Injectable()
export class DatabaseService {
  // 整个应用生命周期内只有一个实例
}

// 瞬态作用域
@Scope(DependencyScope.TRANSIENT)
@Injectable()
export class LoggerService {
  // 每次注入都创建新实例
}

// 请求级作用域
@Scope(DependencyScope.REQUEST)
@Injectable()
export class UserContextService {
  // 每个 HTTP 请求内共享同一个实例
}
```

### @Singleton, @Transient, @RequestScoped

作用域装饰器的语法糖形式：

```typescript
import { Injectable, Singleton, Transient, RequestScoped } from '@rapidojs/core';

// 单例作用域（语法糖）
@Singleton()
@Injectable()
export class CacheService {}

// 瞬态作用域（语法糖）
@Transient()
@Injectable()
export class UtilityService {}

// 请求级作用域（语法糖）
@RequestScoped()
@Injectable()
export class RequestContextService {}
```

### @ConditionalOn

条件注入装饰器，只有当指定条件满足时才会注册该服务：

```typescript
import { Injectable, ConditionalOn } from '@rapidojs/core';

// 只在生产环境注册
@ConditionalOn({ env: 'NODE_ENV', value: 'production' })
@Injectable()
export class ProductionService {
  // 只在生产环境可用
}

// 根据配置注册
@ConditionalOn({ config: 'feature.redis', value: 'true' })
@Injectable()
export class RedisService {
  // 只在 Redis 功能启用时可用
}

// 自定义条件
@ConditionalOn({ condition: () => process.platform === 'darwin' })
@Injectable()
export class MacOSService {
  // 只在 macOS 上可用
}
```

## 方法装饰器

### HTTP 方法装饰器

定义 HTTP 路由：

```typescript
import { Get, Post, Put, Delete, Patch } from '@rapidojs/core';

@Controller('/users')
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get('/:id')
  findOne() {
    return {};
  }

  @Post()
  create() {
    return {};
  }

  @Put('/:id')
  update() {
    return {};
  }

  @Patch('/:id')
  partialUpdate() {
    return {};
  }

  @Delete('/:id')
  remove() {
    return {};
  }
}
```

### @UsePipes

在方法级别应用管道：

```typescript
import { UsePipes, ValidationPipe } from '@rapidojs/core';

@Post()
@UsePipes(new ValidationPipe())
create(@Body user: CreateUserDto) {
  return user;
}
```

## 参数装饰器

### @Param

提取路由参数：

```typescript
// 基本用法
@Get('/:id')
findOne(@Param('id') id: string) {
  return { id };
}

// 带管道的用法
@Get('/:id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return { id };
}

// 提取所有参数
@Get('/:category/:id')
findOne(@Param() params: { category: string; id: string }) {
  return params;
}
```

### @Query

提取查询参数：

```typescript
// 提取单个查询参数
@Get()
findAll(@Query('page') page: string) {
  return { page };
}

// 带管道的用法
@Get()
findAll(@Query('page', ParseIntPipe) page: number) {
  return { page };
}

// 提取所有查询参数
@Get()
findAll(@Query() query: any) {
  return query;
}

// 使用 DTO 进行验证
@Get()
findAll(@Query() query: GetUsersQueryDto) {
  // 自动应用 ValidationPipe
  return query;
}
```

### @Body

提取请求体：

```typescript
// 基本用法
@Post()
create(@Body() user: any) {
  return user;
}

// 使用 DTO
@Post()
create(@Body user: CreateUserDto) {
  // 自动应用 ValidationPipe
  return user;
}

// 提取部分字段
@Post()
create(@Body('name') name: string) {
  return { name };
}
```

### @Lazy

懒加载装饰器，标记一个依赖为懒加载，只有在第一次访问时才会实例化：

```typescript
import { Injectable, Lazy, Inject } from '@rapidojs/core';

@Injectable()
export class MyService {
  constructor(
    @Inject() @Lazy() private heavyService: HeavyComputationService
  ) {
    // HeavyComputationService 只有在第一次被访问时才会实例化
  }

  async doSomething() {
    // 服务在这里第一次被访问时才会实例化
    return await this.heavyService.process();
  }
}
```

### @Headers

提取请求头：

```typescript
// 提取单个请求头
@Get()
findAll(@Headers('authorization') auth: string) {
  return { auth };
}

// 提取所有请求头
@Get()
findAll(@Headers() headers: any) {
  return headers;
}

// 带管道的用法
@Get()
findAll(@Headers('content-length', ParseIntPipe) length: number) {
  return { length };
}
```

### @Req 和 @Res

直接访问请求和响应对象：

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

@Get()
findAll(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
  // 直接操作 Fastify 的请求和响应对象
  reply.header('X-Custom-Header', 'value');
  return { message: 'success' };
}
```

## 组合使用示例

### 完整的控制器示例

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Headers,
  ParseIntPipe,
  ParseBoolPipe
} from '@rapidojs/core';

@Controller('/api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query() query: GetUsersQueryDto,
    @Headers('authorization') auth?: string
  ) {
    return this.usersService.findAll(query, auth);
  }

  @Get('/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string
  ) {
    return this.usersService.findOne(id, include);
  }

  @Post()
  create(@Body user: CreateUserDto) {
    return this.usersService.create(user);
  }

  @Put('/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body user: UpdateUserDto
  ) {
    return this.usersService.update(id, user);
  }

  @Delete('/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
```

### 复杂参数提取

```typescript
@Controller('/api/posts')
export class PostsController {
  @Get('/:category/:id/comments')
  getComments(
    @Param('category') category: string,
    @Param('id', ParseIntPipe) postId: number,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
    @Query('active', ParseBoolPipe) active: boolean = true,
    @Headers('user-agent') userAgent?: string
  ) {
    return {
      category,
      postId,
      page,
      limit,
      active,
      userAgent
    };
  }
}
```

## 高级用法

### 自定义装饰器

你可以创建自定义装饰器来简化常见操作：

```typescript
import { createParamDecorator, ExecutionContext } from '@rapidojs/core';

// 创建用户装饰器
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);

// 使用自定义装饰器
@Get('/profile')
getProfile(@User() user: any) {
  return user;
}
```

### 装饰器组合

```typescript
// 组合多个装饰器
@Get('/:id')
@UsePipes(new ValidationPipe())
findOne(
  @Param('id', ParseIntPipe) id: number,
  @Query() query: SearchQueryDto,
  @User() user: any
) {
  return { id, query, user };
}
```

## 最佳实践

### 1. 类型安全

始终为参数指定正确的类型：

```typescript
// ✅ 好的做法
@Get('/:id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id 是 number 类型
}

// ❌ 避免这样做
@Get('/:id')
findOne(@Param('id') id: any) {
  // 失去了类型安全
}
```

### 2. 使用 DTO

对于复杂的数据结构，使用 DTO：

```typescript
// ✅ 好的做法
@Post()
create(@Body user: CreateUserDto) {
  // 自动验证和类型转换
}

// ❌ 避免这样做
@Post()
create(@Body() user: any) {
  // 没有验证和类型安全
}
```

### 3. 合理使用管道

根据需要选择合适的管道：

```typescript
// 简单类型转换
@Param('id', ParseIntPipe) id: number

// 复杂验证
@Body user: CreateUserDto  // 自动应用 ValidationPipe

// 自定义验证
@Param('id', CustomValidationPipe) id: number
```

### 4. 装饰器顺序

注意装饰器的执行顺序：

```typescript
@Get('/:id')
@UsePipes(ValidationPipe)  // 方法级管道
findOne(
  @Param('id', ParseIntPipe) id: number  // 参数级管道
) {
  // 参数级管道先执行，然后是方法级管道
}
```

## 总结

Rapido.js 的装饰器系统提供了：

- ✅ **类装饰器**：定义控制器、模块和服务
- ✅ **方法装饰器**：定义路由和中间件
- ✅ **参数装饰器**：提取和转换请求数据
- ✅ **类型安全**：完整的 TypeScript 支持
- ✅ **管道集成**：无缝的数据验证和转换
- ✅ **可扩展性**：支持自定义装饰器

这让 API 开发变得简洁、类型安全且易于维护！
