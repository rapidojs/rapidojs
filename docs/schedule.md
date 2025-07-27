# 任务调度 (Task Scheduling)

`@rapidojs/schedule` 模块为 Rapido.js 应用提供了声明式的任务调度功能，支持 Cron 表达式、间隔执行和延时执行等多种调度方式。

## 安装

```bash
pnpm add @rapidojs/schedule
```

## 快速开始

### 1. 导入模块

首先在你的应用模块中导入 `ScheduleModule`：

```typescript
import { Module } from '@rapidojs/core';
import { ScheduleModule } from '@rapidojs/schedule';
import { TaskService } from './task.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [TaskService],
})
export class AppModule {}
```

### 2. 创建任务服务

```typescript
import { Injectable } from '@rapidojs/core';
import { Cron, Interval, Timeout } from '@rapidojs/schedule';

@Injectable()
export class TaskService {
  // 每天凌晨 2 点执行
  @Cron('0 2 * * *')
  handleDailyTask() {
    console.log('执行每日任务');
  }

  // 每 30 秒执行一次
  @Interval(30000)
  handleIntervalTask() {
    console.log('执行间隔任务');
  }

  // 应用启动 10 秒后执行一次
  @Timeout(10000)
  handleTimeoutTask() {
    console.log('执行延时任务');
  }
}
```

## 装饰器详解

### @Cron(expression, options?)

使用 Cron 表达式定义定时任务。

**参数：**
- `expression`: Cron 表达式字符串
- `options`: 可选配置对象
  - `name`: 任务名称
  - `timezone`: 时区设置

**Cron 表达式格式：**
```
* * * * * *
| | | | | |
| | | | | +-- 年份 (可选)
| | | | +---- 星期几 (0 - 7) (星期日=0 或 7)
| | | +------ 月份 (1 - 12)
| | +-------- 日期 (1 - 31)
| +---------- 小时 (0 - 23)
+------------ 分钟 (0 - 59)
```

**示例：**

```typescript
@Injectable()
export class CronTaskService {
  // 每分钟执行
  @Cron('* * * * *')
  everyMinute() {
    console.log('每分钟执行');
  }

  // 每天上午 9 点执行
  @Cron('0 9 * * *')
  dailyAt9AM() {
    console.log('每天上午 9 点执行');
  }

  // 每周一上午 10 点执行
  @Cron('0 10 * * 1')
  mondayAt10AM() {
    console.log('每周一上午 10 点执行');
  }

  // 每月 1 号凌晨 2 点执行
  @Cron('0 2 1 * *')
  monthlyFirstDay() {
    console.log('每月 1 号凌晨 2 点执行');
  }

  // 带名称和时区的任务
  @Cron('0 0 * * *', {
    name: 'daily-backup',
    timezone: 'Asia/Shanghai'
  })
  dailyBackup() {
    console.log('每日备份任务');
  }
}
```

### @Interval(milliseconds, options?)

定义间隔执行的任务。

**参数：**
- `milliseconds`: 间隔时间（毫秒）
- `options`: 可选配置对象
  - `name`: 任务名称
  - `immediate`: 是否立即执行第一次

**示例：**

```typescript
@Injectable()
export class IntervalTaskService {
  // 每 5 秒执行一次
  @Interval(5000)
  every5Seconds() {
    console.log('每 5 秒执行一次');
  }

  // 每 30 秒执行一次，立即执行第一次
  @Interval(30000, { immediate: true })
  every30SecondsImmediate() {
    console.log('每 30 秒执行一次，立即执行');
  }

  // 带名称的间隔任务
  @Interval(60000, { name: 'health-check' })
  healthCheck() {
    console.log('健康检查任务');
  }
}
```

### @Timeout(milliseconds, options?)

定义延时执行的任务（只执行一次）。

**参数：**
- `milliseconds`: 延时时间（毫秒）
- `options`: 可选配置对象
  - `name`: 任务名称

**示例：**

```typescript
@Injectable()
export class TimeoutTaskService {
  // 应用启动 5 秒后执行
  @Timeout(5000)
  startupTask() {
    console.log('应用启动 5 秒后执行');
  }

  // 带名称的延时任务
  @Timeout(10000, { name: 'initialization' })
  initializationTask() {
    console.log('初始化任务');
  }
}
```

## 高级用法

### 动态任务管理

你可以通过注入 `SchedulerService` 来动态管理任务：

```typescript
import { Injectable } from '@rapidojs/core';
import { SchedulerService } from '@rapidojs/schedule';

@Injectable()
export class DynamicTaskService {
  constructor(private schedulerService: SchedulerService) {}

  // 动态添加 Cron 任务
  addDynamicCronJob(name: string, expression: string, callback: () => void) {
    this.schedulerService.addCronJob(name, expression, callback);
  }

  // 动态添加间隔任务
  addDynamicIntervalJob(name: string, interval: number, callback: () => void) {
    this.schedulerService.addIntervalJob(name, interval, callback);
  }

  // 动态添加延时任务
  addDynamicTimeoutJob(name: string, timeout: number, callback: () => void) {
    this.schedulerService.addTimeoutJob(name, timeout, callback);
  }

  // 移除任务
  removeJob(name: string) {
    this.schedulerService.removeJob(name);
  }
}
```

### 异步任务处理

任务方法支持异步操作：

```typescript
@Injectable()
export class AsyncTaskService {
  @Cron('0 */6 * * *') // 每 6 小时执行一次
  async dataSync() {
    try {
      console.log('开始数据同步...');
      await this.syncDataFromAPI();
      console.log('数据同步完成');
    } catch (error) {
      console.error('数据同步失败:', error);
    }
  }

  @Interval(300000) // 每 5 分钟执行一次
  async healthCheck() {
    const isHealthy = await this.checkSystemHealth();
    if (!isHealthy) {
      await this.sendAlert();
    }
  }

  private async syncDataFromAPI(): Promise<void> {
    // 模拟 API 调用
    return new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async checkSystemHealth(): Promise<boolean> {
    // 模拟健康检查
    return Math.random() > 0.1;
  }

  private async sendAlert(): Promise<void> {
    console.log('发送系统异常告警');
  }
}
```

### 错误处理

建议在任务方法中添加适当的错误处理：

```typescript
@Injectable()
export class RobustTaskService {
  @Cron('0 1 * * *')
  async dailyReport() {
    try {
      await this.generateReport();
    } catch (error) {
      console.error('生成日报失败:', error);
      // 可以发送告警或记录日志
      await this.logError('daily-report', error);
    }
  }

  @Interval(60000)
  async monitorSystem() {
    try {
      const metrics = await this.collectMetrics();
      await this.saveMetrics(metrics);
    } catch (error) {
      console.error('系统监控失败:', error);
      // 错误不应该中断监控任务
    }
  }

  private async generateReport(): Promise<void> {
    // 生成报告逻辑
  }

  private async collectMetrics(): Promise<any> {
    // 收集指标逻辑
    return {};
  }

  private async saveMetrics(metrics: any): Promise<void> {
    // 保存指标逻辑
  }

  private async logError(task: string, error: any): Promise<void> {
    // 错误日志记录
  }
}
```

## 配置选项

### 模块配置

```typescript
import { ScheduleModule } from '@rapidojs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot({
      // 全局时区设置
      timezone: 'Asia/Shanghai',
      // 是否在应用启动时自动开始调度
      autoStart: true,
    })
  ],
})
export class AppModule {}
```

### 异步配置

```typescript
import { ScheduleModule } from '@rapidojs/schedule';
import { ConfigModule, ConfigService } from '@rapidojs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        timezone: configService.get('TIMEZONE', 'UTC'),
        autoStart: configService.get('SCHEDULE_AUTO_START', true),
      }),
      inject: [ConfigService],
    })
  ],
})
export class AppModule {}
```

## 生命周期

调度器会自动处理应用的生命周期：

- **应用启动时**: 自动扫描并注册所有带有调度装饰器的方法
- **应用关闭时**: 自动停止所有正在运行的任务

你也可以手动控制调度器：

```typescript
import { Injectable, OnApplicationBootstrap, BeforeApplicationShutdown } from '@rapidojs/core';
import { SchedulerService } from '@rapidojs/schedule';

@Injectable()
export class AppLifecycleService implements OnApplicationBootstrap, BeforeApplicationShutdown {
  constructor(private schedulerService: SchedulerService) {}

  async onApplicationBootstrap() {
    // 应用启动后的自定义逻辑
    console.log('调度器已启动');
  }

  async beforeApplicationShutdown() {
    // 应用关闭前的清理逻辑
    console.log('正在停止调度器...');
  }
}
```

## 最佳实践

### 1. 任务命名

为重要的任务指定名称，便于管理和调试：

```typescript
@Cron('0 0 * * *', { name: 'daily-cleanup' })
async dailyCleanup() {
  // 清理逻辑
}
```

### 2. 避免长时间运行的任务

如果任务可能运行很长时间，考虑使用队列系统：

```typescript
@Cron('0 2 * * *')
async triggerHeavyTask() {
  // 不要在这里直接执行重任务
  // 而是将任务添加到队列中
  await this.queueService.add('heavy-task', { data: 'some data' });
}
```

### 3. 监控和日志

添加适当的监控和日志记录：

```typescript
@Injectable()
export class MonitoredTaskService {
  @Cron('*/5 * * * *')
  async monitoredTask() {
    const startTime = Date.now();
    try {
      await this.doWork();
      const duration = Date.now() - startTime;
      console.log(`任务完成，耗时: ${duration}ms`);
    } catch (error) {
      console.error('任务执行失败:', error);
      throw error;
    }
  }

  private async doWork(): Promise<void> {
    // 实际工作逻辑
  }
}
```

### 4. 环境配置

根据不同环境配置不同的调度策略：

```typescript
@Injectable()
export class EnvironmentAwareTaskService {
  constructor(private configService: ConfigService) {}

  @Cron('0 */2 * * *') // 每 2 小时
  async conditionalTask() {
    const env = this.configService.get('NODE_ENV');
    
    if (env === 'production') {
      await this.productionTask();
    } else if (env === 'development') {
      await this.developmentTask();
    }
  }

  private async productionTask(): Promise<void> {
    // 生产环境任务
  }

  private async developmentTask(): Promise<void> {
    // 开发环境任务
  }
}
```

## 常见问题

### Q: 如何确保任务不会重复执行？

A: 对于可能运行时间较长的任务，可以使用锁机制：

```typescript
@Injectable()
export class SafeTaskService {
  private isRunning = false;

  @Interval(30000)
  async safeTask() {
    if (this.isRunning) {
      console.log('任务正在运行，跳过本次执行');
      return;
    }

    this.isRunning = true;
    try {
      await this.longRunningTask();
    } finally {
      this.isRunning = false;
    }
  }

  private async longRunningTask(): Promise<void> {
    // 可能运行很长时间的任务
  }
}
```

### Q: 如何在任务中使用依赖注入？

A: 任务方法运行在服务实例的上下文中，可以正常使用依赖注入：

```typescript
@Injectable()
export class DatabaseTaskService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService
  ) {}

  @Cron('0 3 * * *')
  async databaseMaintenance() {
    await this.databaseService.cleanup();
    await this.emailService.sendReport('数据库维护完成');
  }
}
```

### Q: 如何测试调度任务？

A: 可以直接调用任务方法进行测试：

```typescript
import { Test } from '@rapidojs/testing';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TaskService],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('should execute daily task', async () => {
    // 直接调用任务方法
    await service.handleDailyTask();
    // 验证任务执行结果
  });
});
```

## 总结

`@rapidojs/schedule` 模块提供了强大而灵活的任务调度功能，支持多种调度方式和丰富的配置选项。通过声明式的装饰器，你可以轻松地在 Rapido.js 应用中添加定时任务、间隔任务和延时任务，提高应用的自动化程度。

记住遵循最佳实践，添加适当的错误处理和监控，确保你的调度任务稳定可靠地运行。