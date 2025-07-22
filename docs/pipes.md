---
sidebar_position: 4
---

# 管道系统

管道（Pipes）是 Rapido.js 中用于数据转换和验证的强大机制。它们在数据到达控制器方法之前对输入数据进行处理。

## 什么是管道？

管道是一个实现了 `PipeTransform` 接口的类，它有一个 `transform()` 方法。管道有两个典型用例：

1. **数据转换**：将输入数据转换为所需的格式（例如，将字符串转换为整数）
2. **数据验证**：验证输入数据，如果数据无效则抛出异常

## 内置管道

Rapido.js 提供了多个开箱即用的内置管道：

### ParseIntPipe

将字符串转换为整数：

```typescript
@Get('/users/:id')
getUser(@Param('id', ParseIntPipe) id: number) {
  // id 现在是 number 类型
  return { id };
}
```

### ParseFloatPipe

将字符串转换为浮点数：

```typescript
@Get('/products')
getProducts(@Query('price', ParseFloatPipe) price: number) {
  return { price };
}
```

### ParseBoolPipe

将字符串转换为布尔值：

```typescript
@Get('/users')
getUsers(@Query('active', ParseBoolPipe) active: boolean) {
  return { active };
}
```

支持的布尔值：
- `true`: `"true"`, `"1"`, `"yes"`, `"on"`
- `false`: `"false"`, `"0"`, `"no"`, `"off"`

### ParseUUIDPipe

验证并返回 UUID 字符串：

```typescript
@Get('/users/:id')
getUser(@Param('id', ParseUUIDPipe) id: string) {
  // id 是有效的 UUID 格式
  return { id };
}
```

### ParseArrayPipe

将逗号分隔的字符串转换为数组：

```typescript
@Get('/search')
search(@Query('tags', ParseArrayPipe) tags: string[]) {
  // "js,ts,node" → ["js", "ts", "node"]
  return { tags };
}
```

自定义分隔符和项目管道：

```typescript
// 自定义分隔符
@Query('items', new ParseArrayPipe({ separator: '|' })) items: string[]

// 带项目管道
@Query('numbers', new ParseArrayPipe({ items: ParseIntPipe })) numbers: number[]
// "1,2,3" → [1, 2, 3]
```

## ValidationPipe - 自动 DTO 验证

Rapido.js 的一个强大特性是自动 DTO 验证。当你使用 DTO 类作为参数类型时，`ValidationPipe` 会自动应用。

### 创建 DTO

```typescript
import { IsNotEmpty, IsEmail, IsOptional, IsInt, Min, Max, Transform } from 'class-validator';

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

export class GetUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['name', 'email', 'createdAt'])
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: string = 'asc';
}
```

### 使用 DTO

```typescript
@Controller('/users')
export class UsersController {
  @Post()
  createUser(@Body user: CreateUserDto) {
    // ValidationPipe 自动应用，无需手动声明！
    // user 已经通过验证和类型转换
    return user;
  }

  @Get()
  getUsers(@Query() query: GetUsersQueryDto) {
    // 查询参数自动验证和转换
    // query.page 是 number 类型
    // query.limit 是 number 类型
    return query;
  }
}
```

## 参数级管道

你可以在参数级别应用管道，这是 NestJS 风格的用法：

```typescript
@Controller('/api')
export class DemoController {
  @Get('/users/:id')
  getUser(
    @Param('id', ParseIntPipe) id: number,
    @Query('active', ParseBoolPipe) active: boolean,
    @Query('tags', ParseArrayPipe) tags: string[]
  ) {
    return {
      id,      // number
      active,  // boolean
      tags     // string[]
    };
  }
}
```

## 复合管道使用

你可以同时使用参数级管道和 DTO 验证：

```typescript
@Get('/advanced/:userId')
advancedUsage(
  @Param('userId', ParseIntPipe) userId: number,
  @Query('limit', ParseIntPipe) limit: number,
  @Query('active', ParseBoolPipe) active: boolean,
  @Query() filters: GetUsersQueryDto  // DTO 自动验证
) {
  return {
    userId,    // number
    limit,     // number
    active,    // boolean
    filters    // GetUsersQueryDto (已验证)
  };
}
```

## 自定义管道

创建自定义管道来满足特定需求：

### 基本自定义管道

```typescript
import { PipeTransform, ArgumentMetadata, BadRequestException } from '@rapidojs/core';

export class ParsePositiveIntPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed (numeric string is expected)');
    }
    
    if (val <= 0) {
      throw new BadRequestException('Validation failed (positive number is expected)');
    }
    
    return val;
  }
}
```

### 带选项的自定义管道

```typescript
export interface ParseIntOptions {
  min?: number;
  max?: number;
}

export class CustomParseIntPipe implements PipeTransform {
  constructor(private options: ParseIntOptions = {}) {}

  transform(value: any, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    
    if (isNaN(val)) {
      throw new BadRequestException('Validation failed (numeric string is expected)');
    }
    
    if (this.options.min !== undefined && val < this.options.min) {
      throw new BadRequestException(`Value must be at least ${this.options.min}`);
    }
    
    if (this.options.max !== undefined && val > this.options.max) {
      throw new BadRequestException(`Value must be at most ${this.options.max}`);
    }
    
    return val;
  }
}
```

使用自定义管道：

```typescript
@Get('/users/:id')
getUser(
  @Param('id', new CustomParseIntPipe({ min: 1, max: 1000000 })) id: number
) {
  return { id };
}
```

## 异步管道

管道也可以是异步的：

```typescript
export class AsyncValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // 异步验证逻辑，比如数据库查询
    const isValid = await this.validateAsync(value);
    
    if (!isValid) {
      throw new BadRequestException('Async validation failed');
    }
    
    return value;
  }

  private async validateAsync(value: any): Promise<boolean> {
    // 模拟异步验证
    return new Promise(resolve => {
      setTimeout(() => resolve(value !== 'invalid'), 100);
    });
  }
}
```

## 错误处理

当管道验证失败时，会抛出相应的异常：

### 内置管道错误

```typescript
// ParseIntPipe
// 输入: "abc"
// 错误: "Validation failed (numeric string is expected). Received: abc"

// ParseBoolPipe  
// 输入: "maybe"
// 错误: "Validation failed (boolean string is expected). Received: maybe"

// ParseUUIDPipe
// 输入: "not-a-uuid"
// 错误: "Validation failed (uuid is expected). Received: not-a-uuid"
```

### ValidationPipe 错误

```typescript
// 当 DTO 验证失败时
// 错误: "Validation failed: name should not be empty, email must be an email"
```

## 最佳实践

### 1. DTO 命名约定

使用以下命名模式，框架会自动识别并应用 ValidationPipe：

- `*Dto`
- `*DTO`  
- `*Request`
- `*Response`
- `*Input`
- `*Output`

### 2. 类型转换

在 DTO 中使用 `@Transform` 装饰器进行类型转换：

```typescript
export class QueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  page?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  active?: boolean;
}
```

### 3. 组合使用

合理组合参数级管道和 DTO 验证：

```typescript
// 对于简单类型转换，使用参数级管道
@Param('id', ParseIntPipe) id: number

// 对于复杂验证，使用 DTO
@Body user: CreateUserDto
@Query() filters: SearchFiltersDto
```

## 总结

Rapido.js 的管道系统提供了：

- ✅ **内置管道**：常用的数据转换管道
- ✅ **自动 DTO 验证**：智能识别并应用 ValidationPipe
- ✅ **参数级管道**：NestJS 风格的管道使用
- ✅ **自定义管道**：满足特定业务需求
- ✅ **异步支持**：支持异步验证逻辑
- ✅ **错误处理**：详细的验证错误信息

这让数据验证和转换变得简单、类型安全且易于维护！
