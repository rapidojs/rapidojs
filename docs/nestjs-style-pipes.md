---
sidebar_position: 5
---

# NestJS 风格管道使用指南

Rapido.js 现在支持 NestJS 风格的管道使用方式，让开发体验更加流畅和直观。

## 🚀 核心功能

### 1. 参数级管道 - NestJS 风格

```typescript
import { Controller, Get, Param, Query } from '@rapidojs/core';
import { ParseIntPipe, ParseBoolPipe, ParseArrayPipe } from '@rapidojs/core';

@Controller('/api')
export class UsersController {
  @Get('/users/:id')
  getUser(
    @Param('id', ParseIntPipe) id: number,  // 自动转换为数字
    @Query('active', ParseBoolPipe) active: boolean,  // 转换为布尔值
    @Query('tags', ParseArrayPipe) tags: string[]  // 转换为数组
  ) {
    // id 是 number 类型
    // active 是 boolean 类型  
    // tags 是 string[] 类型
    return { id, active, tags };
  }
}
```

### 2. 查询 DTO - 自动验证和转换

```typescript
import { IsOptional, IsIn, Transform, Min, Max } from 'class-validator';

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

@Controller('/api')
export class UsersController {
  @Get('/users')
  findAll(@Query() query: GetUsersQueryDto) {
    // query 自动验证和类型转换
    // query.page 是 number 类型
    // query.limit 是 number 类型
    return query;
  }
}
```

### 3. 自动 ValidationPipe

```typescript
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

@Controller('/api')
export class UsersController {
  @Post('/users')
  createUser(@Body user: CreateUserDto) {
    // ValidationPipe 自动应用，无需手动声明！
    // user 已经通过验证和类型转换
    return { message: 'User created', data: user };
  }
}
```

## 🔧 内置管道

### ParseIntPipe
```typescript
@Param('id', ParseIntPipe) id: number
// "123" → 123
// "abc" → 抛出验证错误
```

### ParseFloatPipe
```typescript
@Query('price', ParseFloatPipe) price: number
// "123.45" → 123.45
// "abc" → 抛出验证错误
```

### ParseBoolPipe
```typescript
@Query('active', ParseBoolPipe) active: boolean
// "true" → true
// "1" → true
// "false" → false
// "0" → false
// "maybe" → 抛出验证错误
```

### ParseUUIDPipe
```typescript
@Param('id', ParseUUIDPipe) id: string
// "550e8400-e29b-41d4-a716-446655440000" → 验证通过
// "invalid-uuid" → 抛出验证错误
```

### ParseArrayPipe
```typescript
@Query('tags', ParseArrayPipe) tags: string[]
// "a,b,c" → ["a", "b", "c"]

// 自定义分隔符
@Query('items', new ParseArrayPipe({ separator: '|' })) items: string[]
// "a|b|c" → ["a", "b", "c"]

// 带项目管道
@Query('numbers', new ParseArrayPipe({ items: ParseIntPipe })) numbers: number[]
// "1,2,3" → [1, 2, 3]
```

## 🎯 高级用法

### 复合管道使用
```typescript
@Controller('/api')
export class AdvancedController {
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
}
```

### 自定义管道
```typescript
import { PipeTransform, ArgumentMetadata } from '@rapidojs/core';

export class CustomPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // 自定义转换逻辑
    return transformedValue;
  }
}

// 使用自定义管道
@Get('/custom/:value')
customMethod(@Param('value', CustomPipe) value: any) {
  return { value };
}
```

## 📊 API 示例

### 测试端点

启动示例应用后，可以测试以下端点：

```bash
# 参数级管道
curl 'http://localhost:3000/demo/nestjs-style/123?active=true&tags=js,ts,node'

# 查询 DTO 验证
curl 'http://localhost:3000/demo/users?page=2&limit=20&sortBy=name&order=desc'

# 验证失败示例
curl 'http://localhost:3000/demo/users?page=0&limit=200&sortBy=invalid'

# 复合管道使用
curl 'http://localhost:3000/demo/advanced/456?limit=50&active=false&page=3'
```

## ✨ 特性对比

| 功能 | 之前 | 现在 |
|------|------|------|
| 参数转换 | 手动处理 | `@Param('id', ParseIntPipe)` |
| DTO 验证 | `@UsePipes(new ValidationPipe())` | 自动应用 |
| 查询参数 | 字符串类型 | 自动类型转换 |
| 错误处理 | 手动检查 | 自动验证错误 |

## 🎉 总结

Rapido.js 现在提供了与 NestJS 完全兼容的管道使用体验：

- ✅ **参数级管道**：`@Param('id', ParseIntPipe)`
- ✅ **自动 DTO 验证**：无需手动声明 ValidationPipe
- ✅ **类型安全**：自动类型转换和验证
- ✅ **错误处理**：详细的验证错误信息
- ✅ **向后兼容**：不破坏现有代码

这让 Rapido.js 成为一个更加现代化和易用的 Node.js 框架！
