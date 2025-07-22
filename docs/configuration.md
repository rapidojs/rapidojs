---
sidebar_position: 7
---

# 配置管理

`@rapidojs/config` 是 Rapido.js 框架的官方配置管理模块，提供类似于 NestJS 的配置服务功能。支持环境变量、YAML 配置文件以及自定义配置加载器，为你的应用提供灵活而强大的配置管理能力。

## 特性概览

- 🔧 **环境变量支持** - 支持 `.env` 和 `.env.local` 文件
- 📄 **多格式配置** - 支持 YAML、JSON 配置文件
- 🎯 **装饰器注入** - 提供 `@ConfigProperty` 装饰器进行属性注入
- 🔄 **配置合并** - 智能合并多个配置源
- ✅ **配置验证** - 支持自定义验证函数
- 🔒 **类型安全** - 完整的 TypeScript 支持
- 🛡️ **安全性** - 自动隐藏敏感信息

## 安装

```bash
pnpm add @rapidojs/config
```

## 基础用法

### 1. 配置模块注册

在你的根模块中注册配置模块：

```typescript
import { Module } from '@rapidojs/core';
import { ConfigModule } from '@rapidojs/config';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### 2. 在服务中使用配置

```typescript
import { Injectable } from '@rapidojs/core';
import { ConfigService } from '@rapidojs/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly configService: ConfigService) {}

  getConnectionString(): string {
    const host = this.configService.get('DATABASE_HOST', 'localhost');
    const port = this.configService.get('DATABASE_PORT', 5432);
    const dbname = this.configService.get('DATABASE_NAME', 'myapp');
    
    return `postgres://${host}:${port}/${dbname}`;
  }
}
```

## 配置文件格式

### 环境变量文件 (.env)

```env
# 应用配置
APP_NAME=MyApplication
APP_PORT=3000
APP_DEBUG=true

# 数据库配置
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=myapp

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### YAML 配置文件

```yaml
# config/app.yaml
app:
  name: MyApplication
  port: 3000
  debug: false

database:
  host: localhost
  port: 5432
  name: myapp
  ssl: false
  pool:
    min: 2
    max: 10

redis:
  host: localhost
  port: 6379
  db: 0

logging:
  level: info
  format: json
```

## 配置属性装饰器

### 使用 @ConfigProperty

`@ConfigProperty` 装饰器提供了更优雅的配置注入方式：

```typescript
import { Injectable } from '@rapidojs/core';
import { ConfigProperty, ConfigService, injectConfigProperties } from '@rapidojs/config';

@Injectable()
export class AppConfig {
  @ConfigProperty('APP_NAME', { 
    defaultValue: 'RapidoJS App',
    description: '应用名称'
  })
  appName: string;

  @ConfigProperty('APP_PORT', {
    defaultValue: 3000,
    transform: (val) => parseInt(val, 10),
    description: '应用端口'
  })
  port: number;

  @ConfigProperty('APP_DEBUG', {
    defaultValue: false,
    transform: (val) => val === 'true' || val === true,
    description: '调试模式'
  })
  debug: boolean;

  constructor(configService: ConfigService) {
    // 自动注入配置属性
    injectConfigProperties(this, configService.getAll());
  }

  getAppInfo() {
    return {
      name: this.appName,
      port: this.port,
      debug: this.debug,
    };
  }
}
```

### 装饰器选项

`@ConfigProperty` 支持以下选项：

```typescript
@ConfigProperty(key: string, options?: {
  defaultValue?: any;           // 默认值
  required?: boolean;           // 是否必需（当没有默认值时）
  description?: string;         // 属性描述
  transform?: (value: any) => any;  // 类型转换函数
})
```

## 高级功能

### 配置验证

定义验证函数确保配置的正确性：

```typescript
import * as Joi from 'joi';

const configValidationSchema = (config: any) => {
  const schema = Joi.object({
    APP_PORT: Joi.number().port().required(),
    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().port().default(5432),
  });
  
  const { error } = schema.validate(config, { allowUnknown: true });
  if (error) {
    throw new Error(`配置验证失败: ${error.message}`);
  }
};

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
    }),
  ],
})
export class AppModule {}
```

### 自定义配置加载器

添加动态配置源：

```typescript
ConfigModule.forRoot({
  load: [
    () => ({
      // 动态配置
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
    }),
    async () => {
      // 从外部 API 加载配置
      const response = await fetch('/api/config');
      return response.json();
    },
  ],
})
```

### 多环境配置

根据环境加载不同的配置文件：

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

ConfigModule.forRoot({
  envFilePath: [
    '.env',
    isDevelopment && '.env.development',
    isProduction && '.env.production',
    '.env.local'
  ].filter(Boolean),
  configFilePath: [
    'config/base.yaml',
    `config/${process.env.NODE_ENV}.yaml`,
  ],
})
```

### 条件配置模块

为不同的模块提供不同的配置：

```typescript
@Module({
  imports: [
    // 根配置模块
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
    // 功能配置模块
    ConfigModule.forFeature({
      configFilePath: 'config/database.yaml',
    }),
  ],
})
export class DatabaseModule {}
```

## API 参考

### ConfigService

#### 方法

- `get<T>(key: string): T | undefined` - 获取配置值
- `get<T>(key: string, defaultValue: T): T` - 获取配置值（带默认值）
- `getAll(): Record<string, any>` - 获取所有配置
- `has(key: string): boolean` - 检查配置是否存在
- `set(key: string, value: any): void` - 设置配置值（内存中）

#### 使用示例

```typescript
@Injectable()
export class MyService {
  constructor(private configService: ConfigService) {}

  someMethod() {
    // 获取配置值
    const dbHost = this.configService.get('DATABASE_HOST');
    
    // 获取配置值（带默认值）
    const dbPort = this.configService.get('DATABASE_PORT', 5432);
    
    // 检查配置是否存在
    if (this.configService.has('REDIS_URL')) {
      // 使用 Redis
    }
    
    // 获取嵌套配置
    const logLevel = this.configService.get('logging.level', 'info');
  }
}
```

### ConfigModuleOptions

```typescript
interface ConfigModuleOptions {
  isGlobal?: boolean;           // 是否全局模块，默认 true
  envFilePath?: string | string[]; // .env 文件路径
  configFilePath?: string | string[]; // 配置文件路径
  ignoreEnvFile?: boolean;      // 是否忽略 .env 文件
  ignoreEnvLocalFile?: boolean; // 是否忽略 .env.local 文件
  throwOnMissingFile?: boolean; // 找不到文件时是否抛异常
  validationSchema?: (config: Record<string, any>) => void; // 验证函数
  load?: (() => Record<string, any>)[]; // 自定义加载器
}
```

## 最佳实践

### 1. 配置分层

```typescript
// 基础配置
const baseConfig = {
  envFilePath: '.env',
  configFilePath: 'config/base.yaml',
};

// 环境特定配置
const envConfig = process.env.NODE_ENV === 'production' 
  ? { configFilePath: 'config/production.yaml' }
  : { configFilePath: 'config/development.yaml' };

ConfigModule.forRoot({
  ...baseConfig,
  ...envConfig,
})
```

### 2. 类型安全的配置类

```typescript
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  ssl: boolean;
}

@Injectable()
export class TypedConfigService {
  constructor(private configService: ConfigService) {}

  get database(): DatabaseConfig {
    return {
      host: this.configService.get('database.host', 'localhost'),
      port: this.configService.get('database.port', 5432),
      name: this.configService.get('database.name', 'app'),
      ssl: this.configService.get('database.ssl', false),
    };
  }
}
```

### 3. 敏感信息处理

```typescript
// ✅ 好的做法 - 敏感信息使用环境变量
DATABASE_PASSWORD=your-secret-password
JWT_SECRET=your-jwt-secret

// ❌ 避免 - 不要将敏感信息写入配置文件
database:
  password: "hardcoded-password"  # 不安全
```

### 4. 配置验证

```typescript
// 在应用启动时验证关键配置
const validateConfig = (config: any) => {
  const required = ['DATABASE_HOST', 'DATABASE_PASSWORD', 'JWT_SECRET'];
  
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`缺少必需的配置项: ${key}`);
    }
  }
};
```

### 5. 配置缓存

```typescript
@Injectable()
export class CachedConfigService {
  private cache = new Map<string, any>();
  
  constructor(private configService: ConfigService) {}
  
  get<T>(key: string, defaultValue?: T): T {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const value = this.configService.get(key, defaultValue);
    this.cache.set(key, value);
    return value;
  }
}
```

## 配置优先级

配置的加载顺序和优先级（后加载的会覆盖先加载的）：

1. **进程环境变量** (`process.env`)
2. **`.env` 文件**
3. **`.env.local` 文件**
4. **YAML/JSON 配置文件**
5. **自定义加载器**

## 常见问题

### Q: 如何在测试中模拟配置？

```typescript
// 测试配置
const mockConfigService = {
  get: jest.fn().mockImplementation((key, defaultValue) => {
    const mockConfig = {
      'DATABASE_HOST': 'test-host',
      'DATABASE_PORT': 5433,
    };
    return mockConfig[key] || defaultValue;
  }),
};
```

### Q: 如何实现配置热重载？

```typescript
@Injectable()
export class HotReloadConfigService extends ConfigService {
  private watchers: fs.FSWatcher[] = [];
  
  constructor(options: ConfigModuleOptions) {
    super(options);
    this.setupWatchers();
  }
  
  private setupWatchers() {
    // 监听配置文件变化
    const configPath = this.options.configFilePath;
    if (configPath) {
      const watcher = fs.watchFile(configPath, () => {
        this.reloadConfiguration();
      });
      this.watchers.push(watcher);
    }
  }
}
```

### Q: 如何处理配置中的数组？

```yaml
# config/app.yaml
allowed_origins:
  - "http://localhost:3000"
  - "https://myapp.com"
  - "https://api.myapp.com"
```

```typescript
const origins = this.configService.get<string[]>('allowed_origins', []);
```

## 示例项目

查看完整的配置示例，请参考 [example-api](../apps/example-api/) 项目中的配置实现。

## 下一步

- 了解 [模块系统](./modules.md) 
- 学习 [依赖注入](./decorators.md#injectable)
- 查看 [API 参考](./api-reference.md) 