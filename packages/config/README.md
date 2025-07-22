# @rapidojs/config

`@rapidojs/config` 是 Rapido.js 框架的配置管理模块，提供类似于 NestJS 的配置服务功能。支持 `.env` 文件、YAML 配置文件以及自定义配置加载器。

## 特性

- 🔧 支持 `.env` 和 `.env.local` 文件
- 📄 支持 YAML 和 JSON 配置文件
- 🎯 支持配置属性装饰器注入
- 🔄 支持配置合并和自定义加载器
- ✅ 支持配置验证
- 💡 完整的 TypeScript 支持

## 安装

```bash
pnpm add @rapidojs/config
```

## 基础用法

### 1. 基本配置服务

```typescript
import { ConfigModule, ConfigService } from '@rapidojs/config';
import { Module } from '@rapidojs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
  ],
  providers: [],
})
export class AppModule {}
```

### 2. 在服务中使用配置

```typescript
import { Injectable, Inject } from '@rapidojs/core';
import { ConfigService } from '@rapidojs/config';

@Injectable()
export class DatabaseService {
  constructor(private readonly configService: ConfigService) {}

  getConnectionString(): string {
    const host = this.configService.get('database.host', 'localhost');
    const port = this.configService.get('database.port', 5432);
    const dbname = this.configService.get('database.name', 'myapp');
    
    return `postgres://${host}:${port}/${dbname}`;
  }
}
```

### 3. 使用 @ConfigProperty 装饰器

```typescript
import { Injectable } from '@rapidojs/core';
import { ConfigProperty, injectConfigProperties } from '@rapidojs/config';

@Injectable()
export class AppConfig {
  @ConfigProperty('app.name', { defaultValue: 'MyApp' })
  appName: string;

  @ConfigProperty('app.port', { 
    defaultValue: 3000,
    transform: (val) => parseInt(val, 10)
  })
  port: number;

  @ConfigProperty('app.debug', {
    defaultValue: false,
    transform: (val) => val === 'true' || val === true
  })
  debug: boolean;

  constructor(configService: ConfigService) {
    // 自动注入配置属性
    injectConfigProperties(this, configService.getAll());
  }
}
```

## 配置文件格式

### .env 文件

```env
# .env
APP_NAME=MyApplication
APP_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
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

redis:
  host: localhost
  port: 6379
```

## 高级用法

### 配置验证

```typescript
import * as Joi from 'joi';

const configValidationSchema = (config: any) => {
  const schema = Joi.object({
    APP_PORT: Joi.number().port().required(),
    DATABASE_HOST: Joi.string().required(),
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

```typescript
ConfigModule.forRoot({
  load: [
    () => ({
      // 动态配置
      timestamp: Date.now(),
      environment: process.env.NODE_ENV || 'development',
    }),
    () => {
      // 从外部 API 加载配置
      return fetch('/api/config').then(res => res.json());
    },
  ],
})
```

### 多环境配置

```typescript
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

ConfigModule.forRoot({
  envFilePath: ['.env', envFile],
  configFilePath: [
    'config/base.yaml',
    `config/${process.env.NODE_ENV}.yaml`,
  ],
})
```

## API 文档

### ConfigService

- `get<T>(key: string): T | undefined` - 获取配置值
- `get<T>(key: string, defaultValue: T): T` - 获取配置值（带默认值）
- `getAll(): Record<string, any>` - 获取所有配置
- `has(key: string): boolean` - 检查配置是否存在
- `set(key: string, value: any): void` - 设置配置值（内存中）

### @ConfigProperty 装饰器

```typescript
@ConfigProperty(key: string, options?: {
  defaultValue?: any;
  required?: boolean;
  description?: string;
  transform?: (value: any) => any;
})
```

### ConfigModuleOptions

```typescript
interface ConfigModuleOptions {
  isGlobal?: boolean;           // 是否全局模块
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

1. **环境变量优先级**: `.env.local` > `.env` > YAML 配置 > 默认值
2. **配置文件组织**: 将相关配置分组到不同的 YAML 文件中
3. **类型安全**: 使用 @ConfigProperty 装饰器获得更好的类型推断
4. **配置验证**: 在生产环境中始终启用配置验证
5. **敏感信息**: 将敏感信息（如密码、API 密钥）存储在环境变量中

## 许可证

MIT 