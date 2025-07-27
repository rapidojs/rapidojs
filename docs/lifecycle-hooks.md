# 生命周期钩子 (Lifecycle Hooks)

生命周期钩子为您提供了在应用程序和模块生命周期的关键时刻执行代码的能力。RapidoJS 调用生命周期钩子方法来让您知道应用程序元素何时被初始化、销毁等。

## 概述

生命周期钩子接口定义了在应用程序生命周期的特定时刻调用的方法。您可以在模块、提供者或控制器中实现这些接口来执行初始化和清理逻辑。

## 生命周期序列

以下图表描述了关键应用程序生命周期事件的序列：

1. **OnModuleInit** - 模块初始化
2. **OnApplicationBootstrap** - 应用程序启动完成
3. **OnModuleDestroy** - 模块销毁
4. **OnApplicationShutdown** - 应用程序关闭

## 生命周期钩子接口

### OnModuleInit

在模块的依赖项解析完成后调用：

```typescript
import { Injectable, OnModuleInit } from '@rapidojs/core';

@Injectable()
export class UsersService implements OnModuleInit {
  async onModuleInit() {
    console.log('UsersService 模块已初始化');
    // 执行初始化逻辑
    await this.initializeDatabase();
  }

  private async initializeDatabase() {
    // 数据库初始化逻辑
  }
}
```

### OnApplicationBootstrap

在所有模块初始化完成后，应用程序完全启动时调用：

```typescript
import { Injectable, OnApplicationBootstrap } from '@rapidojs/core';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  async onApplicationBootstrap() {
    console.log('应用程序启动完成');
    // 执行应用程序级别的初始化
    await this.startBackgroundTasks();
  }

  private async startBackgroundTasks() {
    // 启动后台任务
  }
}
```

### OnModuleDestroy

在模块销毁之前调用，用于清理资源：

```typescript
import { Injectable, OnModuleDestroy } from '@rapidojs/core';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private connection: any;

  async onModuleDestroy() {
    console.log('DatabaseService 模块正在销毁');
    // 清理数据库连接
    if (this.connection) {
      await this.connection.close();
    }
  }
}
```

### OnApplicationShutdown

在应用程序关闭时调用：

```typescript
import { Injectable, OnApplicationShutdown } from '@rapidojs/core';

@Injectable()
export class AppService implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    console.log(`应用程序正在关闭，信号: ${signal}`);
    // 执行清理逻辑
    await this.cleanup();
  }

  private async cleanup() {
    // 清理逻辑
  }
}
```

## 完整示例

以下是一个实现多个生命周期钩子的完整示例：

```typescript
import {
  Injectable,
  OnModuleInit,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnApplicationShutdown
} from '@rapidojs/core';

@Injectable()
export class DatabaseService implements 
  OnModuleInit, 
  OnApplicationBootstrap, 
  OnModuleDestroy, 
  OnApplicationShutdown {
  
  private connection: any;
  private isConnected = false;

  async onModuleInit() {
    console.log('DatabaseService: 模块初始化开始');
    try {
      this.connection = await this.createConnection();
      this.isConnected = true;
      console.log('DatabaseService: 数据库连接已建立');
    } catch (error) {
      console.error('DatabaseService: 数据库连接失败', error);
      throw error;
    }
  }

  async onApplicationBootstrap() {
    console.log('DatabaseService: 应用程序启动完成');
    if (this.isConnected) {
      await this.runMigrations();
      await this.seedData();
    }
  }

  async onModuleDestroy() {
    console.log('DatabaseService: 模块销毁开始');
    await this.closeConnection();
  }

  async onApplicationShutdown(signal?: string) {
    console.log(`DatabaseService: 应用程序关闭 (${signal})`);
    // 确保连接已关闭
    if (this.isConnected) {
      await this.closeConnection();
    }
  }

  private async createConnection() {
    // 模拟数据库连接
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ connected: true });
      }, 1000);
    });
  }

  private async runMigrations() {
    console.log('DatabaseService: 运行数据库迁移');
    // 迁移逻辑
  }

  private async seedData() {
    console.log('DatabaseService: 种子数据初始化');
    // 种子数据逻辑
  }

  private async closeConnection() {
    if (this.connection && this.isConnected) {
      console.log('DatabaseService: 关闭数据库连接');
      // 关闭连接逻辑
      this.isConnected = false;
    }
  }
}
```

## 在模块中使用

生命周期钩子也可以在模块类中实现：

```typescript
import { Module, OnModuleInit, OnModuleDestroy } from '@rapidojs/core';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly usersService: UsersService) {}

  async onModuleInit() {
    console.log('UsersModule 已初始化');
    // 模块级别的初始化逻辑
  }

  async onModuleDestroy() {
    console.log('UsersModule 正在销毁');
    // 模块级别的清理逻辑
  }
}
```

## 异步生命周期钩子

所有生命周期钩子都支持异步操作。RapidoJS 会等待异步钩子完成后再继续：

```typescript
@Injectable()
export class AsyncService implements OnModuleInit {
  async onModuleInit() {
    // 异步初始化
    await this.loadConfiguration();
    await this.connectToExternalService();
  }

  private async loadConfiguration() {
    // 加载配置
    return new Promise(resolve => {
      setTimeout(resolve, 2000);
    });
  }

  private async connectToExternalService() {
    // 连接外部服务
    return new Promise(resolve => {
      setTimeout(resolve, 1000);
    });
  }
}
```

## 错误处理

在生命周期钩子中处理错误很重要：

```typescript
@Injectable()
export class RobustService implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.riskyInitialization();
    } catch (error) {
      console.error('初始化失败:', error);
      // 决定是否重新抛出错误
      // throw error; // 这会阻止应用程序启动
      
      // 或者使用默认配置继续
      this.useDefaultConfiguration();
    }
  }

  private async riskyInitialization() {
    // 可能失败的初始化逻辑
  }

  private useDefaultConfiguration() {
    // 使用默认配置
  }
}
```

## 应用程序关闭

要启用优雅关闭，需要在应用程序中启用关闭钩子：

```typescript
import { RapidoApplication } from '@rapidojs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = new RapidoApplication(AppModule);
  
  // 启用关闭钩子
  app.enableShutdownHooks();
  
  await app.listen(3000);
}

bootstrap();
```

## 最佳实践

1. **保持钩子简单**：避免在生命周期钩子中执行复杂的业务逻辑
2. **错误处理**：始终处理可能的错误，决定是否应该阻止应用程序启动
3. **资源清理**：在销毁钩子中确保所有资源得到适当清理
4. **异步操作**：对于耗时操作，使用异步钩子
5. **日志记录**：添加适当的日志记录以便调试
6. **测试**：为包含生命周期钩子的类编写测试

## 执行顺序

当应用程序启动时，生命周期钩子按以下顺序执行：

1. 所有模块的 `OnModuleInit` 钩子
2. 所有模块的 `OnApplicationBootstrap` 钩子

当应用程序关闭时：

1. 所有模块的 `OnModuleDestroy` 钩子
2. 所有模块的 `OnApplicationShutdown` 钩子

生命周期钩子为您的 RapidoJS 应用程序提供了强大的初始化和清理机制，确保资源得到适当管理，应用程序能够优雅地启动和关闭。