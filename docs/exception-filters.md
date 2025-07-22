# 异常过滤器

Rapido.js 包含一个内置的异常层，负责处理整个应用程序中所有未处理的异常。当异常未被您的应用程序代码处理时，它会被该层捕获，然后自动发送一个适当的用户友好响应。

## 内置 HTTP 异常

Rapido.js 提供了一组继承自 `HttpException` 基类的标准异常。这些异常从 `@rapidojs/core` 包中导出，代表了最常见的 HTTP 异常：

- `BadRequestException`
- `UnauthorizedException`
- `NotFoundException`
- `ForbiddenException`
- `InternalServerErrorException`

### 抛出标准异常

以下是如何抛出标准异常的示例：

```typescript
// exceptions.controller.ts
import { Controller, Get, UnauthorizedException } from '@rapidojs/core';

@Controller('exceptions')
export class ExceptionsController {
  @Get('unauthorized')
  triggerUnauthorized() {
    throw new UnauthorizedException();
  }
}
```

当调用此端点时，Rapido.js 的全局异常处理程序将捕获 `UnauthorizedException` 并自动返回一个 `401 Unauthorized` 响应：

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Unauthorized"
}
```

## 自定义异常

您可以通过扩展 `HttpException` 基类来创建自己的自定义异常。

```typescript
// custom.exception.ts
import { HttpException, HttpStatus } from '@rapidojs/core';

export class CustomException extends HttpException {
  constructor() {
    super('这是一个自定义异常', HttpStatus.I_AM_A_TEAPOT);
  }
}
```

## 自定义异常过滤器

虽然基础异常过滤器可以自动处理 `HttpException` 及其子类，但您可能希望完全控制异常层。例如，您可能希望添加日志记录或为响应使用不同的 JSON 模式。

要创建自定义异常过滤器，您需要创建一个实现 `ExceptionFilter` 接口的类。该类必须有一个 `catch(exception: T, host: ArgumentsHost)` 方法。

- `exception`: 正在处理的异常对象。
- `host`: `ArgumentsHost` 对象，它提供了获取请求和响应对象的辅助方法。

```typescript
// custom-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@rapidojs/core';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { CustomException } from './custom.exception.js';

@Catch(CustomException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();

    reply.status(status).send({
      statusCode: status,
      message: '这是一个自定义异常过滤器消息！',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

`@Catch(CustomException)` 装饰器将所需的元数据绑定到异常过滤器，告诉 Rapido.js 这个特定的过滤器正在寻找 `CustomException` 类型的异常。

最后，您需要在模块中注册该过滤器：

```typescript
// exceptions.module.ts
import { Module } from '@rapidojs/core';
import { ExceptionsController } from './exceptions.controller.js';
import { CustomExceptionFilter } from './custom-exception.filter.js';

@Module({
  controllers: [ExceptionsController],
  providers: [CustomExceptionFilter],
})
export class ExceptionsModule {}
```

现在，当您抛出 `CustomException` 时，`CustomExceptionFilter` 将被执行，客户端将收到自定义响应。
