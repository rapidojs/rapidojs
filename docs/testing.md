---
sidebar_position: 7
---

# 测试指南

Rapido.js 提供了完整的测试支持，让你可以轻松编写单元测试、集成测试和端到端测试。

## 测试环境设置

### 安装测试依赖

```bash
pnpm add -D vitest @vitest/ui @types/node
```

### 配置 vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
  },
});
```

### 测试设置文件

创建 `test/setup.ts`：

```typescript
import 'reflect-metadata';
```

## 单元测试

### 测试服务

```typescript
// users.service.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  beforeEach(() => {
    repository = new UsersRepository();
    service = new UsersService(repository);
  });

  describe('findAll', () => {
    it('should return an array of users', () => {
      const result = service.findAll();
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', () => {
      const user = service.findOne(1);
      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });

    it('should throw error for invalid id', () => {
      expect(() => service.findOne(-1)).toThrow('User not found');
    });
  });
});
```

### 测试控制器

```typescript
// users.controller.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(() => {
    service = {
      findAll: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as any;
    
    controller = new UsersController(service);
  });

  describe('findAll', () => {
    it('should return users array', () => {
      const users = [{ id: 1, name: 'John' }];
      vi.mocked(service.findAll).mockReturnValue(users);

      const result = controller.findAll();
      
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(users);
    });
  });

  describe('create', () => {
    it('should create a new user', () => {
      const createUserDto = { name: 'John', email: 'john@example.com' };
      const createdUser = { id: 1, ...createUserDto };
      
      vi.mocked(service.create).mockReturnValue(createdUser);

      const result = controller.create(createUserDto);
      
      expect(service.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(createdUser);
    });
  });
});
```

## 集成测试

### 测试模块

```typescript
// users.module.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@rapidojs/testing';
import { UsersModule } from './users.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

describe('UsersModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide UsersService', () => {
    const service = module.get<UsersService>(UsersService);
    expect(service).toBeDefined();
  });

  it('should provide UsersController', () => {
    const controller = module.get<UsersController>(UsersController);
    expect(controller).toBeDefined();
  });
});
```

### 测试应用

```typescript
// app.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@rapidojs/testing';
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from './app.module';

describe('AppModule', () => {
  let app: RapidoApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createRapidoApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
```

## HTTP 测试

### 测试 HTTP 请求

```typescript
// users.e2e.spec.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@rapidojs/testing';
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from '../src/app.module';
import supertest from 'supertest';

describe('Users (e2e)', () => {
  let app: RapidoApplication;
  let request: supertest.SuperTest<supertest.Test>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createRapidoApplication();
    await app.init();
    
    request = supertest(app.getHttpServer());
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/users (GET)', () => {
    it('should return users array', async () => {
      const response = await request
        .get('/users')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('/users (POST)', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const response = await request
        .post('/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject(createUserDto);
      expect(response.body.id).toBeDefined();
    });

    it('should validate user data', async () => {
      const invalidUser = {
        name: '', // 空名称
        email: 'invalid-email', // 无效邮箱
      };

      await request
        .post('/users')
        .send(invalidUser)
        .expect(400);
    });
  });

  describe('/users/:id (GET)', () => {
    it('should return a user by id', async () => {
      const response = await request
        .get('/users/1')
        .expect(200);

      expect(response.body.id).toBe(1);
    });

    it('should return 404 for non-existent user', async () => {
      await request
        .get('/users/999')
        .expect(404);
    });
  });
});
```

## 管道测试

### 测试内置管道

```typescript
// pipes.spec.ts
import { describe, it, expect } from 'vitest';
import { ParseIntPipe, ParseBoolPipe, ValidationPipe } from '@rapidojs/core';
import { BadRequestException } from '@rapidojs/core';

describe('Built-in Pipes', () => {
  describe('ParseIntPipe', () => {
    const pipe = new ParseIntPipe();

    it('should transform string to number', () => {
      expect(pipe.transform('123', { type: 'param', data: 'id' })).toBe(123);
    });

    it('should throw error for invalid input', () => {
      expect(() => pipe.transform('abc', { type: 'param', data: 'id' }))
        .toThrow(BadRequestException);
    });
  });

  describe('ParseBoolPipe', () => {
    const pipe = new ParseBoolPipe();

    it('should transform "true" to true', () => {
      expect(pipe.transform('true', { type: 'query', data: 'active' })).toBe(true);
    });

    it('should transform "false" to false', () => {
      expect(pipe.transform('false', { type: 'query', data: 'active' })).toBe(false);
    });

    it('should throw error for invalid input', () => {
      expect(() => pipe.transform('maybe', { type: 'query', data: 'active' }))
        .toThrow(BadRequestException);
    });
  });
});
```

### 测试 ValidationPipe

```typescript
// validation.spec.ts
import { describe, it, expect } from 'vitest';
import { ValidationPipe } from '@rapidojs/core';
import { IsNotEmpty, IsEmail } from 'class-validator';

class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}

describe('ValidationPipe', () => {
  const pipe = new ValidationPipe();

  it('should validate valid DTO', async () => {
    const validData = { name: 'John', email: 'john@example.com' };
    
    const result = await pipe.transform(validData, {
      type: 'body',
      metatype: CreateUserDto,
    });

    expect(result).toBeInstanceOf(CreateUserDto);
    expect(result.name).toBe('John');
    expect(result.email).toBe('john@example.com');
  });

  it('should throw error for invalid DTO', async () => {
    const invalidData = { name: '', email: 'invalid-email' };
    
    await expect(pipe.transform(invalidData, {
      type: 'body',
      metatype: CreateUserDto,
    })).rejects.toThrow();
  });
});
```

## Mock 和 Stub

### Mock 服务

```typescript
// mocks/users.service.mock.ts
export const mockUsersService = {
  findAll: vi.fn(() => [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ]),
  
  findOne: vi.fn((id: number) => ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  })),
  
  create: vi.fn((dto: any) => ({
    id: Math.floor(Math.random() * 1000),
    ...dto,
  })),
  
  update: vi.fn((id: number, dto: any) => ({
    id,
    ...dto,
  })),
  
  remove: vi.fn(() => ({ deleted: true })),
};
```

### 使用 Mock

```typescript
// users.controller.spec.ts
import { mockUsersService } from './mocks/users.service.mock';

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  // 测试用例...
});
```

## 测试配置

### package.json 脚本

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "vitest run --config vitest.e2e.config.ts"
  }
}
```

### 覆盖率配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
});
```

## 测试最佳实践

### 1. 测试结构

使用 AAA 模式（Arrange, Act, Assert）：

```typescript
it('should create a user', () => {
  // Arrange
  const createUserDto = { name: 'John', email: 'john@example.com' };
  
  // Act
  const result = service.create(createUserDto);
  
  // Assert
  expect(result).toBeDefined();
  expect(result.name).toBe('John');
});
```

### 2. 测试命名

使用描述性的测试名称：

```typescript
// ✅ 好的做法
describe('UsersService', () => {
  describe('findOne', () => {
    it('should return user when valid id is provided', () => {});
    it('should throw NotFoundException when user does not exist', () => {});
  });
});

// ❌ 避免
describe('UsersService', () => {
  it('test1', () => {});
  it('test2', () => {});
});
```

### 3. 测试隔离

确保测试之间相互独立：

```typescript
describe('UsersService', () => {
  let service: UsersService;
  
  beforeEach(() => {
    service = new UsersService();
  });
  
  // 每个测试都有全新的服务实例
});
```

## 总结

Rapido.js 的测试支持提供了：

- ✅ **完整的测试工具** - 单元测试、集成测试、E2E 测试
- ✅ **Mock 支持** - 轻松模拟依赖
- ✅ **管道测试** - 验证数据转换和验证逻辑
- ✅ **HTTP 测试** - 测试完整的请求响应流程
- ✅ **覆盖率报告** - 了解测试覆盖情况
- ✅ **测试工具集成** - 与现代测试工具无缝集成

这让你可以构建高质量、可靠的应用程序！
