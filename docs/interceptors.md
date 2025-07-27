# 拦截器 (Interceptors)

拦截器是一个使用 `@Injectable()` 装饰器注解的类，它实现了 `Interceptor` 接口。拦截器具有一系列有用的功能，这些功能受面向切面编程（AOP）技术的启发。

## 基础概念

拦截器可以：

- 在函数执行之前/之后绑定额外的逻辑
- 转换从函数返回的结果
- 转换从函数抛出的异常
- 扩展基本函数行为
- 根据所选条件完全重写函数（例如，缓存目的）

## 创建拦截器

每个拦截器都实现 `intercept()` 方法，该方法接受两个参数：

- `context`: `ExecutionContext` 实例，提供有关当前执行上下文的详细信息
- `next`: `CallHandler` 实例，用于调用路由处理程序方法

```typescript
import { Injectable, Interceptor, ExecutionContext, CallHandler } from '@rapidojs/core';

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    console.log('Before...');

    const now = Date.now();
    const result = await next.handle();
    console.log(`After... ${Date.now() - now}ms`);

    return result;
  }
}
```

## 绑定拦截器

### 方法级拦截器

使用 `@UseInterceptors()` 装饰器将拦截器绑定到特定的路由处理程序：

```typescript
@Controller('cats')
export class CatsController {
  @Post()
  @UseInterceptors(LoggingInterceptor)
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }
}
```

### 控制器级拦截器

将拦截器应用于整个控制器：

```typescript
@Controller('cats')
@UseInterceptors(LoggingInterceptor)
export class CatsController {
  @Get()
  findAll() {
    return this.catsService.findAll();
  }

  @Post()
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }
}
```

### 全局拦截器

要设置全局拦截器，使用 RapidoApplication 实例的 `useGlobalInterceptors()` 方法：

```typescript
const app = new RapidoApplication(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

## 响应映射

拦截器可以转换响应数据。以下是一个将响应包装在数据对象中的示例：

```typescript
@Injectable()
export class TransformInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const result = await next.handle();
    return {
      data: result,
      timestamp: new Date().toISOString(),
      path: context.getRequest().url,
    };
  }
}
```

## 异常映射

拦截器也可以处理异常：

```typescript
@Injectable()
export class ErrorsInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    try {
      return await next.handle();
    } catch (error) {
      // 记录错误
      console.error('Error occurred:', error);
      
      // 重新抛出或转换错误
      throw new HttpException('Internal server error', 500);
    }
  }
}
```

## 缓存拦截器

以下是一个简单的缓存拦截器示例：

```typescript
@Injectable()
export class CacheInterceptor implements Interceptor {
  private cache = new Map();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const key = `${request.method}:${request.url}`;

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await next.handle();
    this.cache.set(key, result);
    
    return result;
  }
}
```

## 超时拦截器

为请求添加超时处理：

```typescript
@Injectable()
export class TimeoutInterceptor implements Interceptor {
  constructor(private readonly timeout: number = 5000) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    return Promise.race([
      next.handle(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new HttpException('Request timeout', 408));
        }, this.timeout);
      })
    ]);
  }
}
```

## 多个拦截器

可以应用多个拦截器，它们将按照声明的顺序执行：

```typescript
@Controller('cats')
@UseInterceptors(LoggingInterceptor, TransformInterceptor)
export class CatsController {
  @Get()
  findAll() {
    return this.catsService.findAll();
  }
}
```

## 执行上下文

`ExecutionContext` 提供了有关当前执行上下文的详细信息：

```typescript
@Injectable()
export class ContextInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const response = context.getResponse();
    
    console.log('Method:', request.method);
    console.log('URL:', request.url);
    console.log('Headers:', request.headers);
    
    return next.handle();
  }
}
```

## 最佳实践

1. **保持拦截器简单**：每个拦截器应该有单一职责
2. **错误处理**：确保拦截器中的错误得到适当处理
3. **性能考虑**：避免在拦截器中执行耗时操作
4. **测试**：为拦截器编写单元测试
5. **文档**：为自定义拦截器编写清晰的文档

## 与其他功能的集成

拦截器可以与其他 RapidoJS 功能很好地集成：

- **守卫**：拦截器在守卫之后执行
- **管道**：拦截器在管道之后执行
- **异常过滤器**：拦截器抛出的异常可以被异常过滤器捕获

拦截器为 RapidoJS 应用程序提供了强大的横切关注点处理能力，使您能够以声明式的方式添加日志记录、缓存、转换和其他功能。