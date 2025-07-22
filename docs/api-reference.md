---
sidebar_position: 8
---

# API 参考

这里是 Rapido.js 的完整 API 参考文档。

## 核心装饰器

### 类装饰器

#### @Controller(prefix?: string)

定义控制器类和可选的路由前缀。

```typescript
@Controller('/api/users')
export class UsersController {}
```

#### @Module(options: ModuleMetadata)

定义模块。

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [DatabaseModule],
  exports: [UsersService],
})
export class UsersModule {}
```

#### @Injectable()

标记类可以被依赖注入系统管理。

```typescript
@Injectable()
export class UsersService {}
```

#### @Global()

将模块标记为全局模块。

```typescript
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

### 方法装饰器

#### @Get(path?: string)
#### @Post(path?: string)
#### @Put(path?: string)
#### @Delete(path?: string)
#### @Patch(path?: string)
#### @Options(path?: string)
#### @Head(path?: string)

定义 HTTP 路由处理器。

```typescript
@Get('/users/:id')
findOne() {}

@Post('/users')
create() {}
```

#### @UsePipes(...pipes: PipeTransform[])

在方法级别应用管道。

```typescript
@Post()
@UsePipes(new ValidationPipe())
create(@Body() dto: CreateUserDto) {}
```

### 参数装饰器

#### @Param(key?: string, ...pipes: PipeTransform[])

提取路由参数。

```typescript
// 提取单个参数
@Get('/:id')
findOne(@Param('id') id: string) {}

// 带管道
@Get('/:id')
findOne(@Param('id', ParseIntPipe) id: number) {}

// 提取所有参数
@Get('/:category/:id')
findOne(@Param() params: { category: string; id: string }) {}
```

#### @Query(key?: string, ...pipes: PipeTransform[])

提取查询参数。

```typescript
// 提取单个查询参数
@Get()
findAll(@Query('page') page: string) {}

// 带管道
@Get()
findAll(@Query('page', ParseIntPipe) page: number) {}

// 提取所有查询参数
@Get()
findAll(@Query() query: any) {}
```

#### @Body(key?: string, ...pipes: PipeTransform[])

提取请求体。

```typescript
// 提取整个请求体
@Post()
create(@Body() dto: CreateUserDto) {}

// 提取请求体的特定字段
@Post()
create(@Body('name') name: string) {}
```

#### @Headers(key?: string, ...pipes: PipeTransform[])

提取请求头。

```typescript
// 提取单个请求头
@Get()
findAll(@Headers('authorization') auth: string) {}

// 提取所有请求头
@Get()
findAll(@Headers() headers: any) {}
```

#### @Req()

注入原始请求对象。

```typescript
@Get()
findAll(@Req() request: FastifyRequest) {}
```

#### @Res()

注入原始响应对象。

```typescript
@Get()
findAll(@Res() response: FastifyReply) {}
```

## 内置管道

### ParseIntPipe

将字符串转换为整数。

```typescript
const pipe = new ParseIntPipe();
pipe.transform('123', metadata); // 返回 123
```

### ParseFloatPipe

将字符串转换为浮点数。

```typescript
const pipe = new ParseFloatPipe();
pipe.transform('123.45', metadata); // 返回 123.45
```

### ParseBoolPipe

将字符串转换为布尔值。

```typescript
const pipe = new ParseBoolPipe();
pipe.transform('true', metadata); // 返回 true
pipe.transform('false', metadata); // 返回 false
```

### ParseUUIDPipe

验证并返回 UUID 字符串。

```typescript
const pipe = new ParseUUIDPipe();
pipe.transform('550e8400-e29b-41d4-a716-446655440000', metadata);
```

### ParseArrayPipe

将分隔字符串转换为数组。

```typescript
const pipe = new ParseArrayPipe();
pipe.transform('a,b,c', metadata); // 返回 ['a', 'b', 'c']

// 自定义分隔符
const pipe = new ParseArrayPipe({ separator: '|' });
pipe.transform('a|b|c', metadata); // 返回 ['a', 'b', 'c']

// 带项目管道
const pipe = new ParseArrayPipe({ items: ParseIntPipe });
pipe.transform('1,2,3', metadata); // 返回 [1, 2, 3]
```

### ValidationPipe

验证和转换 DTO 对象。

```typescript
const pipe = new ValidationPipe();
await pipe.transform(data, { metatype: CreateUserDto });
```

## 异常类

### HttpException

基础 HTTP 异常类。

```typescript
throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
```

### BadRequestException

400 Bad Request 异常。

```typescript
throw new BadRequestException('Invalid input');
```

### UnauthorizedException

401 Unauthorized 异常。

```typescript
throw new UnauthorizedException('Invalid credentials');
```

### ForbiddenException

403 Forbidden 异常。

```typescript
throw new ForbiddenException('Access denied');
```

### NotFoundException

404 Not Found 异常。

```typescript
throw new NotFoundException('User not found');
```

### InternalServerErrorException

500 Internal Server Error 异常。

```typescript
throw new InternalServerErrorException('Something went wrong');
```

## 应用类

### RapidoApplication

主应用类。

```typescript
const app = new RapidoApplication(AppModule);

// 启动应用
await app.listen(3000);

// 获取 HTTP 服务器实例
const server = app.getHttpServer();

// 初始化应用
await app.init();

// 关闭应用
await app.close();
```

## 测试工具

### Test

测试模块构建器。

```typescript
const module = await Test.createTestingModule({
  controllers: [UsersController],
  providers: [UsersService],
}).compile();
```

### TestingModule

测试模块实例。

```typescript
const service = module.get<UsersService>(UsersService);
const app = module.createRapidoApplication();
```

## 接口和类型

### PipeTransform

管道接口。

```typescript
interface PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any;
}
```

### ArgumentMetadata

参数元数据接口。

```typescript
interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'headers';
  metatype?: Type<unknown>;
  data?: string;
}
```

### ModuleMetadata

模块元数据接口。

```typescript
interface ModuleMetadata {
  controllers?: Type<any>[];
  providers?: Provider[];
  imports?: Array<Type<any> | DynamicModule>;
  exports?: Array<Type<any> | string>;
}
```

### DynamicModule

动态模块接口。

```typescript
interface DynamicModule {
  module: Type<any>;
  providers?: Provider[];
  controllers?: Type<any>[];
  imports?: Array<Type<any> | DynamicModule>;
  exports?: Array<Type<any> | string>;
}
```

## 常量

### HttpStatus

HTTP 状态码常量。

```typescript
enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}
```

### ParamType

参数类型常量。

```typescript
enum ParamType {
  REQUEST = 'request',
  RESPONSE = 'response',
  BODY = 'body',
  QUERY = 'query',
  PARAM = 'param',
  HEADERS = 'headers',
}
```

## 工具函数

### createParamDecorator

创建自定义参数装饰器。

```typescript
const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
```

### applyDecorators

组合多个装饰器。

```typescript
const ApiController = () => applyDecorators(
  Controller(),
  UseGuards(AuthGuard),
  UsePipes(ValidationPipe)
);
```

## 生命周期钩子

### OnModuleInit

模块初始化钩子。

```typescript
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    console.log('Module initialized');
  }
}
```

### OnModuleDestroy

模块销毁钩子。

```typescript
export class UsersModule implements OnModuleDestroy {
  onModuleDestroy() {
    console.log('Module destroyed');
  }
}
```

### OnApplicationBootstrap

应用启动钩子。

```typescript
export class UsersService implements OnApplicationBootstrap {
  onApplicationBootstrap() {
    console.log('Application bootstrapped');
  }
}
```

### OnApplicationShutdown

应用关闭钩子。

```typescript
export class UsersService implements OnApplicationShutdown {
  onApplicationShutdown(signal?: string) {
    console.log('Application shutting down', signal);
  }
}
```

## 元数据常量

### METADATA_KEY

元数据键常量。

```typescript
const METADATA_KEY = {
  CONTROLLER: Symbol('CONTROLLER'),
  ROUTE: Symbol('ROUTE'),
  PARAMS: Symbol('PARAMS'),
  PIPES: Symbol('PIPES'),
  MODULE: Symbol('MODULE'),
  INJECTABLE: Symbol('INJECTABLE'),
};
```

这个 API 参考涵盖了 Rapido.js 的所有核心功能。更多详细信息和示例，请参考其他文档章节。
