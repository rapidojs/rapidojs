---
sidebar_position: 1
---

# Rapido.js 介绍

让我们在 **5 分钟内** 了解 **Rapido.js**。

## 什么是 Rapido.js？

Rapido.js 是一个现代化的 TypeScript Node.js 框架，专为构建高性能、类型安全的 Web API 而设计。它提供了：

- **高性能**：基于 Fastify 构建，提供卓越的性能
- **类型安全**：完整的 TypeScript 支持
- **装饰器驱动**：使用装饰器定义路由和中间件
- **管道系统**：强大的数据转换和验证机制
- **模块化**：清晰的模块化架构
- **测试友好**：内置测试支持

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/en/download/) 版本 18.0 或更高
- [pnpm](https://pnpm.io/) 包管理器（推荐）

### 安装

```bash
npm install @rapidojs/core
# 或者
pnpm add @rapidojs/core
```

### 创建你的第一个应用

```typescript
import { Controller, Get, Module, RapidoApplication } from '@rapidojs/core';

@Controller('/api')
export class AppController {
  @Get('/hello')
  getHello(): string {
    return 'Hello, Rapido.js!';
  }
}

@Module({
  controllers: [AppController],
})
export class AppModule {}

const app = new RapidoApplication(AppModule);
app.listen(3000);
```

### 启动应用

```bash
ts-node src/main.ts
```

现在访问 http://localhost:3000/api/hello，你将看到 "Hello, Rapido.js!"。

## 核心特性

### NestJS 风格的装饰器

```typescript
@Controller('/users')
export class UsersController {
  @Get('/:id')
  getUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string
  ) {
    return { id, include };
  }

  @Post()
  createUser(@Body user: CreateUserDto) {
    // ValidationPipe 自动应用
    return user;
  }
}
```

### 强大的管道系统

```typescript
export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;
}
```

### 模块化架构

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [DatabaseModule],
})
export class UsersModule {}
```

## 下一步

- 查看 [快速开始指南](./getting-started) 了解详细安装步骤
- 阅读 [装饰器文档](./decorators) 学习如何使用装饰器
- 探索 [管道系统](./pipes) 了解数据验证和转换
- 查看 [示例项目](https://github.com/rapidojs/rapidojs/tree/main/apps/example-api) 获取完整示例
