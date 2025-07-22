---
sidebar_position: 2
---

# 快速开始

本指南将帮助你快速搭建一个 Rapido.js 应用程序。

## 环境准备

### 系统要求

- **Node.js** 18.0 或更高版本
- **TypeScript** 5.0 或更高版本
- **pnpm**（推荐）或 npm

### 验证环境

```bash
node --version  # 应该 >= 18.0
npm --version   # 或 pnpm --version
```

## 创建新项目

### 方法一：使用 CLI 工具（推荐）

使用 RapidoJS CLI 是最快速的项目创建方式：

```bash
# 使用 npx 运行 CLI（推荐）
npx @rapidojs/cli@latest new my-rapido-app

# 或全局安装 CLI
pnpm add -g @rapidojs/cli
rapido new my-rapido-app

# 进入项目目录
cd my-rapido-app

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

CLI 工具会自动生成：
- ✅ 完整的项目结构
- ✅ TypeScript 和 SWC 配置  
- ✅ 示例用户模块
- ✅ 开发脚本和构建配置
- ✅ 最佳实践代码示例

### 方法二：手动创建项目

如果你想手动创建项目：

```bash
mkdir my-rapido-app
cd my-rapido-app
npm init -y
```

#### 安装依赖

```bash
# 安装 Rapido.js 核心包
pnpm add @rapidojs/core

# 安装开发依赖
pnpm add -D typescript @types/node ts-node nodemon

# 安装验证相关依赖
pnpm add class-validator class-transformer reflect-metadata
```

### 3. 配置 TypeScript

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. 配置 package.json 脚本

```json
{
  "scripts": {
    "start": "node dist/main.js",
    "dev": "nodemon --exec ts-node src/main.ts",
    "build": "tsc",
    "test": "echo \"Error: no test specified\" && exit 1"
  }
}
```

## 创建你的第一个应用

### 1. 创建主文件

创建 `src/main.ts`：

```typescript
import 'reflect-metadata';
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
}

bootstrap();
```

### 2. 创建应用模块

创建 `src/app.module.ts`：

```typescript
import { Module } from '@rapidojs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 3. 创建控制器

创建 `src/app.controller.ts`：

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@rapidojs/core';
import { ParseIntPipe } from '@rapidojs/core';
import { AppService } from './app.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/users/:id')
  getUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('include') include?: string
  ) {
    return this.appService.getUser(id, include);
  }

  @Post('/users')
  createUser(@Body user: CreateUserDto) {
    return this.appService.createUser(user);
  }
}
```

### 4. 创建服务

创建 `src/app.service.ts`：

```typescript
import { Injectable } from '@rapidojs/core';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello, Rapido.js!';
  }

  getUser(id: number, include?: string) {
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      ...(include && { include })
    };
  }

  createUser(user: CreateUserDto) {
    return {
      id: Math.floor(Math.random() * 1000),
      ...user,
      createdAt: new Date().toISOString()
    };
  }
}
```

### 5. 创建 DTO

创建 `src/dto/create-user.dto.ts`：

```typescript
import { IsNotEmpty, IsEmail, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}
```

## 运行应用

### 开发模式

```bash
pnpm dev
```

### 生产构建

```bash
pnpm build
pnpm start
```

## 测试 API

应用启动后，你可以测试以下端点：

### 1. Hello World

```bash
curl http://localhost:3000/api/hello
```

响应：
```json
"Hello, Rapido.js!"
```

### 2. 获取用户

```bash
curl http://localhost:3000/api/users/123?include=profile
```

响应：
```json
{
  "id": 123,
  "name": "User 123",
  "email": "user123@example.com",
  "include": "profile"
}
```

### 3. 创建用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30
  }'
```

响应：
```json
{
  "id": 456,
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "createdAt": "2024-01-01T12:00:00.000Z"
}
```

## 项目结构

```
my-rapido-app/
├── src/
│   ├── dto/
│   │   └── create-user.dto.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   └── main.ts
├── dist/                    # 构建输出
├── node_modules/
├── package.json
└── tsconfig.json
```

## 添加配置管理

为了让应用更灵活，你可以添加配置管理：

### 1. 安装配置包

```bash
pnpm add @rapidojs/config
```

### 2. 创建配置文件

创建 `.env` 文件：
```env
APP_NAME=My Rapido App
APP_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### 3. 注册配置模块

在 `app.module.ts` 中：

```typescript
import { Module } from '@rapidojs/core';
import { ConfigModule } from '@rapidojs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 4. 使用配置

在服务中使用配置：

```typescript
import { Injectable } from '@rapidojs/core';
import { ConfigService } from '@rapidojs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getAppInfo() {
    return {
      name: this.configService.get('APP_NAME', 'Default App'),
      port: this.configService.get('APP_PORT', 3000),
      database: {
        host: this.configService.get('DATABASE_HOST', 'localhost'),
        port: this.configService.get('DATABASE_PORT', 5432),
      },
    };
  }
}
```

## 下一步

现在你已经有了一个基本的 Rapido.js 应用！接下来可以：

- 学习更多关于 [装饰器](./decorators) 的使用
- 探索 [管道系统](./pipes) 进行数据验证和转换
- 了解 [模块系统](./modules) 组织你的代码
- 深入 [配置管理](./configuration) 管理应用配置
- 阅读 [测试指南](./testing) 编写测试用例
