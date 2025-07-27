# @rapidojs/schedule

基于装饰器的任务调度模块，为 RapidoJS 应用提供强大的定时任务功能。

## 特性

- 🕐 **Cron 表达式支持** - 使用标准 Cron 表达式定义复杂的调度规则
- ⏱️ **间隔执行** - 支持固定间隔时间的重复任务
- ⏰ **延时执行** - 支持一次性延时任务
- 🎯 **装饰器语法** - 简洁优雅的装饰器 API
- 🔄 **生命周期集成** - 与应用生命周期无缝集成
- 📊 **任务管理** - 完整的任务状态监控和管理
- 🌍 **时区支持** - 支持自定义时区设置
- 🛡️ **类型安全** - 完整的 TypeScript 类型支持

## 安装

```bash
npm install @rapidojs/schedule
# 或
pnpm add @rapidojs/schedule
# 或
yarn add @rapidojs/schedule
```

## 快速开始

### 1. 导入模块

```typescript
import { Module } from '@rapidojs/common';
import { ScheduleModule } from '@rapidojs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot({
      enabled: true,
      timezone: 'Asia/Shanghai',
      enableLogging: true
    })
  ]
})
export class AppModule {}
```

### 2. 使用装饰器定义任务

```typescript
import { Injectable } from '@rapidojs/common';
import { Cron, Interval, Timeout } from '@rapidojs/schedule';

@Injectable()
export class TaskService {
  // 每天凌晨执行
  @Cron('0 0 * * *')
  async dailyCleanup() {
    console.log('执行每日清理任务');
    // 清理逻辑
  }

  // 每5分钟执行一次
  @Interval(5 * 60 * 1000)
  async healthCheck() {
    console.log('执行健康检查');
    // 健康检查逻辑
  }

  // 应用启动5秒后执行一次
  @Timeout(5000)
  async initializeCache() {
    console.log('初始化缓存');
    // 缓存初始化逻辑
  }

  // 自定义任务名称
  @Cron('0 */2 * * *', { name: 'bi-hourly-report' })
  async generateReport() {
    console.log('生成双小时报告');
    // 报告生成逻辑
  }
}
```

## API 参考

### 装饰器

#### @Cron(expression, options?)

使用 Cron 表达式定义定时任务。

**参数：**
- `expression: string` - Cron 表达式
- `options?: { name?: string }` - 可选配置

**Cron 表达式格式：**
```
┌───────────── 分钟 (0 - 59)
│ ┌─────────── 小时 (0 - 23)
│ │ ┌───────── 日期 (1 - 31)
│ │ │ ┌─────── 月份 (1 - 12)
│ │ │ │ ┌───── 星期 (0 - 7，0和7都表示周日)
│ │ │ │ │
* * * * *
```

**常用表达式示例：**
```typescript
@Cron('0 0 * * *')        // 每天凌晨
@Cron('0 */6 * * *')      // 每6小时
@Cron('0 0 * * 1')       // 每周一凌晨
@Cron('0 0 1 * *')       // 每月1号凌晨
@Cron('*/30 * * * *')    // 每30分钟
```

#### @Interval(milliseconds, options?)

定义固定间隔执行的任务。

**参数：**
- `milliseconds: number` - 间隔时间（毫秒）
- `options?: { name?: string }` - 可选配置

```typescript
@Interval(60000)          // 每分钟
@Interval(5 * 60 * 1000) // 每5分钟
@Interval(3600000)       // 每小时
```

#### @Timeout(milliseconds, options?)

定义延时执行的一次性任务。

**参数：**
- `milliseconds: number` - 延时时间（毫秒）
- `options?: { name?: string }` - 可选配置

```typescript
@Timeout(5000)           // 5秒后执行
@Timeout(30000)          // 30秒后执行
```

### 配置选项

```typescript
interface SchedulerConfig {
  enabled?: boolean;           // 是否启用调度器，默认 true
  timezone?: string;           // 时区，默认 'Asia/Shanghai'
  maxConcurrentJobs?: number;  // 最大并发任务数，默认 10
  retryAttempts?: number;      // 重试次数，默认 3
  retryDelay?: number;         // 重试延时，默认 1000ms
  enableLogging?: boolean;     // 是否启用日志，默认 true
}
```

### 动态配置

```typescript
// 异步配置
@Module({
  imports: [
    ScheduleModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        enabled: configService.get('SCHEDULER_ENABLED', true),
        timezone: configService.get('TIMEZONE', 'Asia/Shanghai'),
        enableLogging: configService.get('SCHEDULER_LOGGING', true)
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

### 手动任务管理

```typescript
import { Injectable } from '@rapidojs/common';
import { SchedulerService } from '@rapidojs/schedule';

@Injectable()
export class TaskManagerService {
  constructor(private schedulerService: SchedulerService) {}

  // 动态添加任务
  addDynamicTask() {
    this.schedulerService.addCronJob(
      'dynamic-task',
      '0 */2 * * *',
      async () => {
        console.log('动态添加的任务');
      }
    );
  }

  // 移除任务
  removeTask() {
    this.schedulerService.removeJob('dynamic-task');
  }

  // 获取所有任务
  getAllTasks() {
    return this.schedulerService.getJobs();
  }
}
```

## 最佳实践

### 1. 错误处理

```typescript
@Injectable()
export class TaskService {
  @Cron('0 0 * * *')
  async dailyBackup() {
    try {
      await this.performBackup();
      console.log('备份完成');
    } catch (error) {
      console.error('备份失败:', error);
      // 发送告警通知
      await this.sendAlert(error);
    }
  }
}
```

### 2. 任务状态监控

```typescript
@Injectable()
export class MonitoringService {
  constructor(private schedulerService: SchedulerService) {}

  @Interval(60000) // 每分钟检查一次
  async monitorTasks() {
    const jobs = this.schedulerService.getJobs();
    
    for (const [name, job] of jobs) {
      if (!job.isActive) {
        console.warn(`任务 ${name} 未激活`);
      }
      
      if (job.lastRunAt) {
        const timeSinceLastRun = Date.now() - job.lastRunAt.getTime();
        if (timeSinceLastRun > 24 * 60 * 60 * 1000) { // 24小时
          console.warn(`任务 ${name} 超过24小时未执行`);
        }
      }
    }
  }
}
```

### 3. 条件执行

```typescript
@Injectable()
export class ConditionalTaskService {
  constructor(private configService: ConfigService) {}

  @Cron('0 2 * * *') // 每天凌晨2点
  async conditionalCleanup() {
    // 只在生产环境执行
    if (this.configService.get('NODE_ENV') === 'production') {
      await this.performCleanup();
    }
  }

  @Interval(300000) // 每5分钟
  async healthCheck() {
    // 只在启用健康检查时执行
    if (this.configService.get('HEALTH_CHECK_ENABLED')) {
      await this.checkSystemHealth();
    }
  }
}
```

## 注意事项

1. **时区设置**：确保正确设置时区，特别是在容器化部署时
2. **任务执行时间**：避免长时间运行的任务阻塞其他任务
3. **错误处理**：始终为任务添加适当的错误处理
4. **资源管理**：注意任务的内存和CPU使用情况
5. **日志记录**：合理使用日志记录任务执行状态

## 许可证

MIT License