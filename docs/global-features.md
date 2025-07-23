# RapidoJS 全局功能

RapidoJS 提供了类似 NestJS 的全局功能，包括全局过滤器、管道和守卫。这些功能符合 Fastify 的最佳实践，能很好地与 Fastify 生态系统集成。

## 核心概念

### 全局过滤器 (Global Filters)
全局过滤器用于处理应用中的异常，提供统一的错误处理机制。

### 全局管道 (Global Pipes)
全局管道用于在数据到达路由处理器之前进行转换和验证。

### 全局守卫 (Global Guards)
全局守卫用于在请求到达路由处理器之前进行认证和授权检查。

## 快速开始

### 1. 创建应用实例

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';

const app = await RapidoFactory.create(AppModule);
```

### 2. 配置全局功能

```typescript
app
  .useGlobalFilters(new GlobalErrorFilter())
  .useGlobalGuards(new AuthGuard())
  .useGlobalPipes(new LoggingPipe());
```

## 全局过滤器

### 创建异常过滤器

```typescript
import { ExceptionFilter, ArgumentsHost, Catch } from '@rapidojs/core';
import { FastifyRequest, FastifyReply } from 'fastify';

@Catch(Error)  // 捕获所有 Error 类型的异常
export class GlobalErrorFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    // getResponse() 默认返回 FastifyReply 类型
    const response = ctx.getResponse();
    // getRequest() 默认返回 FastifyRequest 类型  
    const request = ctx.getRequest();
    
    console.error('捕获到错误:', exception.message);
    
    // TypeScript 会正确推断 response 和 request 的类型
    response.status(500).send({
      statusCode: 500,
      message: '服务器内部错误',
      timestamp: new Date().toISOString(),
      path: request.url
    });
  }
}
```

### 注册全局过滤器

```typescript
// 使用实例
app.useGlobalFilters(new GlobalErrorFilter());

// 使用类（会自动实例化）
app.useGlobalFilters(GlobalErrorFilter);

// 注册多个过滤器
app.useGlobalFilters(
  new GlobalErrorFilter(),
  new ValidationErrorFilter(),
  NotFoundErrorFilter
);
```

### 特定异常过滤器

```typescript
import { BadRequestException } from '@rapidojs/core';

@Catch(BadRequestException)
export class ValidationErrorFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    
    response.status(400).send({
      statusCode: 400,
      message: '请求数据验证失败',
      errors: exception.getResponse()
    });
  }
}
```

## 全局管道

### 创建管道

```typescript
import { PipeTransform, ArgumentMetadata } from '@rapidojs/core';

export class LoggingPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    console.log(`处理参数 [${metadata.type}]:`, value);
    
    // 返回转换后的值（或原值）
    return value;
  }
}
```

### 数据转换管道

```typescript
export class UpperCasePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    if (typeof value === 'string') {
      return value.toUpperCase();
    }
    return value;
  }
}
```

### 注册全局管道

```typescript
// 管道执行顺序：全局管道 -> 类级管道 -> 方法级管道 -> 参数级管道
app.useGlobalPipes(
  new LoggingPipe(),
  new UpperCasePipe()
);
```

## 全局守卫

### 创建守卫

```typescript
import { CanActivate, ExecutionContext } from '@rapidojs/core';
import { FastifyRequest } from 'fastify';

export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // getRequest() 默认返回 FastifyRequest 类型
    const request = context.getRequest();
    
    // 跳过公共路径
    if (request.url === '/health' || request.url === '/') {
      return true;
    }
    
    // TypeScript 会正确推断 headers 的类型
    const authHeader = request.headers.authorization;
    return authHeader && authHeader.startsWith('Bearer ');
  }
}
```

### 异步守卫

```typescript
export class AsyncAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.getRequest();
    const token = this.extractToken(request);
    
    // 异步验证令牌
    const isValid = await this.validateToken(token);
    return isValid;
  }
  
  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    return authHeader?.substring(7) || null;
  }
  
  private async validateToken(token: string): Promise<boolean> {
    // 实现异步令牌验证逻辑
    return token === 'valid-api-key';
  }
}
```

### 注册全局守卫

```typescript
app.useGlobalGuards(
  new AuthGuard(),
  new RolesGuard()
);
```

## 执行顺序

全局功能的执行顺序如下：

1. **全局守卫** - 在请求进入之前执行
2. **全局管道** - 在参数处理时执行
3. **路由处理器** - 执行实际的业务逻辑
4. **全局过滤器** - 在异常发生时执行

## 完整示例

```typescript
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await RapidoFactory.create(AppModule);
  
  // 链式配置全局功能
  app
    .useGlobalFilters(new GlobalErrorFilter())
    .useGlobalGuards(new AuthGuard())
    .useGlobalPipes(
      new LoggingPipe(),
      new ValidationPipe()
    );
  
  await app.listen({ port: 3000 });
  console.log('🚀 Server is running on http://localhost:3000');
}

bootstrap();
```

## 与 Fastify 生态的兼容性

RapidoJS 的全局功能设计完全兼容 Fastify 生态：

- 所有 Fastify 插件都可以正常使用
- 保持 Fastify 的高性能特性
- 支持 Fastify 的钩子系统
- 可以与现有的 Fastify 中间件集成

## 类型安全

RapidoJS 的全局功能提供完整的 TypeScript 类型安全支持：

### 默认类型

```typescript
// ExecutionContext 中的方法默认返回正确的 Fastify 类型
const request = context.getRequest();    // FastifyRequest
const response = context.getResponse();  // FastifyReply

// ArgumentsHost 中也是如此
const ctx = host.switchToHttp();
const request = ctx.getRequest();    // FastifyRequest
const response = ctx.getResponse();  // FastifyReply
```

### 泛型支持

```typescript
// 如果需要扩展类型，可以使用泛型
interface CustomRequest extends FastifyRequest {
  user?: { id: string; role: string };
}

const request = context.getRequest<CustomRequest>();
// 现在 request.user 是类型安全的
```

### IDE 支持

由于正确的类型定义，你将获得：
- 完整的代码补全
- 编译时类型检查
- 重构时的类型安全
- 更好的错误提示

## 最佳实践

1. **错误处理**: 使用全局过滤器提供统一的错误响应格式
2. **认证**: 使用全局守卫实现应用级认证
3. **日志记录**: 使用全局管道记录请求信息
4. **数据验证**: 结合 class-validator 进行数据验证
5. **性能**: 全局功能会影响所有请求，确保代码高效
6. **类型安全**: 充分利用 TypeScript 类型系统避免运行时错误

## 故障排除

### 常见问题

1. **守卫拒绝访问**: 检查守卫逻辑和认证令牌
2. **管道转换错误**: 确保管道返回正确的数据类型
3. **过滤器不生效**: 检查 @Catch 装饰器配置

### 调试技巧

```typescript
// 启用详细日志
export class DebugPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    console.log('Debug info:', {
      type: metadata.type,
      data: metadata.data,
      metatype: metadata.metatype?.name,
      value
    });
    return value;
  }
}
``` 