---
sidebar_position: 7
---

# 认证与授权

认证与授权是现代 Web 应用程序的重要组成部分。Rapido.js 提供了一个强大的认证模块 `@rapidojs/auth`，基于 JWT (JSON Web Tokens) 实现，支持守卫和策略模式。

## 概述

`@rapidojs/auth` 模块提供了以下核心功能：

- JWT 认证机制
- 守卫 (Guards) 系统
- 策略 (Strategy) 模式
- 用户信息注入
- 公开路由标记

## 安装

```bash
pnpm add @rapidojs/auth
```

## 快速开始

### 1. 配置 AuthModule

在您的应用模块中导入并配置 `AuthModule`：

```typescript
import { Module } from '@rapidojs/core';
import { AuthModule } from '@rapidojs/auth';

@Module({
  imports: [
    AuthModule.forRoot({
      secret: 'your-secret-key',
      sign: { expiresIn: '1d' },
    }),
  ],
})
export class AppModule {}
```

### 2. 保护路由

使用 `JwtAuthGuard` 守卫保护您的路由：

```typescript
import { Controller, Get } from '@rapidojs/core';
import { UseGuards, CurrentUser } from '@rapidojs/common';
import { JwtAuthGuard } from '@rapidojs/auth';

@Controller('/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  @Get()
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
```

### 3. 公开路由

使用 `@Public()` 装饰器标记无需认证的路由：

```typescript
import { Controller, Post, Body } from '@rapidojs/core';
import { Public } from '@rapidojs/common';

@Controller('/auth')
export class AuthController {
  @Public()
  @Post('/login')
  async login(@Body() credentials: LoginDto) {
    // 登录逻辑
  }
}
```

## 核心概念

### 守卫 (Guards)

守卫是一个实现了 `CanActivate` 接口的类，决定请求是否应该被路由处理器处理。

```typescript
import { CanActivate, ExecutionContext } from '@rapidojs/common';

export class MyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    // 实现您的逻辑
    return true;
  }
}
```

### 策略 (Strategy)

策略模式允许您定义一系列算法，将它们一个个封装起来，并且使它们可以互相替换。

```typescript
import { Injectable } from '@rapidojs/core';
import { JwtStrategy } from '@rapidojs/auth';

@Injectable()
export class MyJwtStrategy extends JwtStrategy {
  async validate(request: any, payload: any) {
    // 验证用户逻辑
    return user;
  }
}
```

### 装饰器

#### @UseGuards()

将守卫应用到控制器或路由处理程序：

```typescript
// 控制器级别
@Controller('/users')
@UseGuards(JwtAuthGuard)
export class UsersController {}

// 路由级别
@Get('/profile')
@UseGuards(JwtAuthGuard)
getProfile() {}
```

#### @Public()

标记公开路由，豁免守卫检查：

```typescript
@Public()
@Get('/public')
getPublicInfo() {}
```

#### @CurrentUser()

从请求中注入当前用户信息：

```typescript
@Get('/profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

## 高级用法

### 自定义策略

您可以创建自定义认证策略：

```typescript
import { Injectable } from '@rapidojs/common';
import { AuthStrategy } from '@rapidojs/common';

@Injectable()
export class CustomStrategy implements AuthStrategy {
  async validate(request: any, payload: any) {
    // 自定义验证逻辑
    return user;
  }
}
```

### 异步配置

使用 `forRootAsync` 进行动态配置：

```typescript
AuthModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    secret: configService.get('JWT_SECRET'),
  }),
  inject: [ConfigService],
})
```

### 全局守卫

您也可以将守卫应用到整个应用程序：

```typescript
const app = await RapidoFactory.create(AppModule);
app.useGlobalGuards(new JwtAuthGuard());
```

## 最佳实践

1. **密钥管理**：始终将 JWT 密钥存储在环境变量或配置文件中，不要硬编码在代码中。

2. **令牌过期**：设置合理的令牌过期时间以提高安全性。

3. **错误处理**：妥善处理认证失败的情况，避免泄露敏感信息。

4. **用户验证**：在 JWT 策略中始终验证用户状态，确保用户未被禁用或删除。

## 故障排除

### 常见问题

1. **"Invalid token" 错误**：
   - 检查 JWT 密钥是否正确配置
   - 确认令牌是否已过期
   - 验证令牌格式是否正确

2. **守卫未生效**：
   - 确认守卫已正确应用
   - 检查模块是否正确导入 AuthModule
   - 验证依赖注入是否正确配置

## API 参考

### AuthModule

#### 静态方法

- `forRoot(options)`: 同步配置认证模块
- `forRootAsync(options)`: 异步配置认证模块

### JwtAuthGuard

标准的 JWT 认证守卫。

### JwtStrategy

JWT 策略基类，用于自定义验证逻辑。

### 装饰器

- `@UseGuards(...)`: 应用守卫
- `@Public()`: 标记公开路由
- `@CurrentUser()`: 注入当前用户