# 高级功能 (Advanced Features)

本文档介绍 RapidoJS 的高级功能，包括拦截器、生命周期钩子和健康检查。这些功能为构建企业级应用程序提供了强大的支持。

## 目录

- [拦截器 (Interceptors)](#拦截器-interceptors)
- [生命周期钩子 (Lifecycle Hooks)](#生命周期钩子-lifecycle-hooks)
- [健康检查 (Health Check)](#健康检查-health-check)
- [功能集成](#功能集成)
- [最佳实践](#最佳实践)

## 拦截器 (Interceptors)

拦截器提供了面向切面编程（AOP）的能力，允许您在方法执行前后添加额外的逻辑。

### 基础用法

```typescript
import { Injectable, Interceptor, ExecutionContext, CallHandler } from '@rapidojs/core';

@Injectable()
export class LoggingInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const start = Date.now();
    const request = context.getRequest();
    
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - 开始`);
    
    try {
      const result = await next.handle();
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} - 完成 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[${new Date().toISOString()}] ${request.method} ${request.url} - 错误 (${duration}ms):`, error.message);
      throw error;
    }
  }
}
```

### 应用拦截器

```typescript
// 方法级别
@Controller('users')
export class UsersController {
  @Get()
  @UseInterceptors(LoggingInterceptor)
  findAll() {
    return this.usersService.findAll();
  }
}

// 控制器级别
@Controller('users')
@UseInterceptors(LoggingInterceptor)
export class UsersController {
  // 所有方法都会应用拦截器
}

// 全局级别
const app = new RapidoApplication(AppModule);
app.useGlobalInterceptors(new LoggingInterceptor());
```

## 生命周期钩子 (Lifecycle Hooks)

生命周期钩子允许您在应用程序和模块的关键生命周期时刻执行代码。

### 可用的钩子

```typescript
import {
  Injectable,
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnApplicationShutdown
} from '@rapidojs/core';

@Injectable()
export class AppService implements 
  OnModuleInit, 
  OnApplicationBootstrap, 
  OnModuleDestroy, 
  OnApplicationShutdown {
  
  async onModuleInit() {
    console.log('模块初始化');
    // 初始化逻辑
  }

  async onApplicationBootstrap() {
    console.log('应用程序启动完成');
    // 启动后逻辑
  }

  async onModuleDestroy() {
    console.log('模块销毁');
    // 清理逻辑
  }

  async onApplicationShutdown(signal?: string) {
    console.log(`应用程序关闭: ${signal}`);
    // 关闭逻辑
  }
}
```

### 启用关闭钩子

```typescript
const app = new RapidoApplication(AppModule);
app.enableShutdownHooks();
await app.listen(3000);
```

## 健康检查 (Health Check)

健康检查提供了监控应用程序状态的标准化方式。

### 基础设置

```typescript
import { Module } from '@rapidojs/core';
import { HealthModule } from '@rapidojs/core';

@Module({
  imports: [HealthModule],
})
export class AppModule {}
```

### 可用端点

- `GET /health` - 基础健康检查
- `GET /health/detailed` - 详细系统信息
- `GET /health/readiness` - Kubernetes 就绪探针
- `GET /health/liveness` - Kubernetes 存活探针

## 功能集成

### 综合示例：企业级服务

以下示例展示了如何将所有高级功能集成到一个企业级服务中：

```typescript
import {
  Injectable,
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Interceptor,
  ExecutionContext,
  CallHandler
} from '@rapidojs/core';

// 性能监控拦截器
@Injectable()
export class PerformanceInterceptor implements Interceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const start = process.hrtime.bigint();
    const request = context.getRequest();
    
    try {
      const result = await next.handle();
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // 转换为毫秒
      
      // 记录性能指标
      console.log(`Performance: ${request.method} ${request.url} - ${duration.toFixed(2)}ms`);
      
      // 如果响应时间过长，记录警告
      if (duration > 1000) {
        console.warn(`Slow request detected: ${request.method} ${request.url} - ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000;
      console.error(`Error in ${request.method} ${request.url} after ${duration.toFixed(2)}ms:`, error.message);
      throw error;
    }
  }
}

// 数据库服务
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private isHealthy = false;

  async onModuleInit() {
    console.log('DatabaseService: 初始化数据库连接');
    try {
      this.connection = await this.connect();
      this.isHealthy = true;
      console.log('DatabaseService: 数据库连接成功');
    } catch (error) {
      console.error('DatabaseService: 数据库连接失败', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    console.log('DatabaseService: 关闭数据库连接');
    if (this.connection) {
      await this.connection.close();
      this.isHealthy = false;
    }
  }

  async getHealth() {
    if (!this.isHealthy) {
      return { status: 'unhealthy', message: 'Database not connected' };
    }
    
    try {
      // 执行简单的健康检查查询
      await this.connection.query('SELECT 1');
      return { status: 'healthy', message: 'Database connection active' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  private async connect() {
    // 模拟数据库连接
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ query: async () => ({ rows: [{ result: 1 }] }) });
      }, 1000);
    });
  }
}

// 缓存服务
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private client: any;
  private isHealthy = false;

  async onModuleInit() {
    console.log('CacheService: 初始化缓存连接');
    try {
      this.client = await this.connect();
      this.isHealthy = true;
      console.log('CacheService: 缓存连接成功');
    } catch (error) {
      console.error('CacheService: 缓存连接失败', error);
      // 缓存不是关键服务，不阻止应用启动
    }
  }

  async onModuleDestroy() {
    console.log('CacheService: 关闭缓存连接');
    if (this.client) {
      await this.client.disconnect();
      this.isHealthy = false;
    }
  }

  async getHealth() {
    if (!this.isHealthy) {
      return { status: 'degraded', message: 'Cache not available' };
    }
    
    try {
      await this.client.ping();
      return { status: 'healthy', message: 'Cache connection active' };
    } catch (error) {
      return { status: 'degraded', message: error.message };
    }
  }

  private async connect() {
    // 模拟缓存连接
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ping: async () => 'PONG', disconnect: async () => {} });
      }, 500);
    });
  }
}

// 应用服务
@Injectable()
export class AppService implements OnApplicationBootstrap {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly cacheService: CacheService,
  ) {}

  async onApplicationBootstrap() {
    console.log('AppService: 应用程序启动完成，执行启动后任务');
    
    // 预热缓存
    await this.warmupCache();
    
    // 注册定时任务
    this.scheduleHealthChecks();
  }

  private async warmupCache() {
    console.log('AppService: 预热缓存');
    // 缓存预热逻辑
  }

  private scheduleHealthChecks() {
    console.log('AppService: 注册健康检查定时任务');
    // 定时健康检查逻辑
  }

  async getApplicationHealth() {
    const [dbHealth, cacheHealth] = await Promise.all([
      this.databaseService.getHealth(),
      this.cacheService.getHealth(),
    ]);

    const overallStatus = 
      dbHealth.status === 'unhealthy' ? 'unhealthy' :
      cacheHealth.status === 'degraded' ? 'degraded' : 'healthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        cache: cacheHealth,
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

// 健康检查控制器
@Controller('/health')
@UseInterceptors(PerformanceInterceptor)
export class HealthController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('/detailed')
  async getDetailedHealth() {
    return this.appService.getApplicationHealth();
  }

  @Get('/readiness')
  async getReadiness() {
    const health = await this.appService.getApplicationHealth();
    return {
      status: health.status === 'unhealthy' ? 'not ready' : 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/liveness')
  async getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}

// 主应用模块
@Module({
  imports: [HealthModule],
  controllers: [HealthController],
  providers: [AppService, DatabaseService, CacheService],
})
export class AppModule {}
```

### 应用程序启动

```typescript
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from './app.module';
import { PerformanceInterceptor } from './performance.interceptor';

async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  // 启用关闭钩子
  app.enableShutdownHooks();
  
  // 应用全局拦截器
  app.useGlobalInterceptors(new PerformanceInterceptor());
  
  // 优雅关闭处理
  process.on('SIGTERM', async () => {
    console.log('收到 SIGTERM 信号，开始优雅关闭');
    await app.close();
    process.exit(0);
  });
  
  await app.listen(3000);
  console.log('应用程序已启动，监听端口 3000');
}

bootstrap().catch(error => {
  console.error('应用程序启动失败:', error);
  process.exit(1);
});
```

## 最佳实践

### 1. 拦截器最佳实践

- **单一职责**：每个拦截器应该只负责一个特定的功能
- **性能考虑**：避免在拦截器中执行耗时操作
- **错误处理**：确保拦截器中的错误得到适当处理
- **测试**：为拦截器编写单元测试

### 2. 生命周期钩子最佳实践

- **异步操作**：对于耗时的初始化操作，使用异步钩子
- **错误处理**：在钩子中处理可能的错误，决定是否阻止应用启动
- **资源清理**：在销毁钩子中确保所有资源得到清理
- **依赖顺序**：考虑服务之间的依赖关系

### 3. 健康检查最佳实践

- **轻量级**：保持健康检查端点轻量级和快速响应
- **分层检查**：提供不同级别的健康检查（基础、详细、依赖项）
- **缓存结果**：对于昂贵的检查，考虑缓存结果
- **监控集成**：与监控系统集成，设置告警

### 4. 集成最佳实践

- **模块化设计**：将不同功能组织到独立的模块中
- **配置管理**：使用配置文件管理各种设置
- **日志记录**：添加适当的日志记录以便调试和监控
- **文档化**：为所有自定义功能编写文档

通过合理使用这些高级功能，您可以构建出健壮、可监控、易维护的企业级 RapidoJS 应用程序。