# 健康检查 (Health Check)

健康检查是现代应用程序的重要组成部分，特别是在微服务架构和容器化部署中。RapidoJS 提供了内置的健康检查模块，可以轻松监控应用程序的状态。

## 概述

健康检查模块提供了多个端点来检查应用程序的不同方面：

- **基础健康检查** - 简单的存活状态
- **详细健康检查** - 包含系统信息的详细状态
- **就绪探针** - Kubernetes 就绪探针兼容
- **存活探针** - Kubernetes 存活探针兼容

## 快速开始

### 基础设置

在您的应用程序模块中导入 `HealthModule`：

```typescript
import { Module } from '@rapidojs/core';
import { HealthModule } from '@rapidojs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 可用端点

一旦导入了 `HealthModule`，以下端点将自动可用：

#### GET /health

基础健康检查端点，返回简单的状态信息：

```bash
curl http://localhost:3000/health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123
}
```

#### GET /health/detailed

详细健康检查端点，包含系统信息：

```bash
curl http://localhost:3000/health/detailed
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "system": {
    "platform": "darwin",
    "arch": "x64",
    "nodeVersion": "v18.17.0",
    "memory": {
      "used": 45.2,
      "total": 512.0,
      "percentage": 8.8
    },
    "cpu": {
      "usage": 15.3
    }
  },
  "environment": "development"
}
```

#### GET /health/readiness

Kubernetes 就绪探针端点：

```bash
curl http://localhost:3000/health/readiness
```

响应示例：
```json
{
  "status": "ready",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET /health/liveness

Kubernetes 存活探针端点：

```bash
curl http://localhost:3000/health/liveness
```

响应示例：
```json
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 自定义健康检查

### 创建自定义健康检查服务

您可以创建自定义的健康检查服务来监控特定的应用程序组件：

```typescript
import { Injectable } from '@rapidojs/core';

export interface HealthIndicator {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details?: any;
}

@Injectable()
export class DatabaseHealthIndicator {
  constructor(private readonly databaseService: DatabaseService) {}

  async check(): Promise<HealthIndicator> {
    try {
      // 检查数据库连接
      await this.databaseService.ping();
      
      return {
        name: 'database',
        status: 'healthy',
        details: {
          connection: 'active',
          responseTime: '< 100ms'
        }
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        details: {
          error: error.message,
          connection: 'failed'
        }
      };
    }
  }
}
```

### 扩展健康检查控制器

创建自定义健康检查控制器：

```typescript
import { Controller, Get } from '@rapidojs/core';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

@Controller('/health')
export class CustomHealthController {
  constructor(
    private readonly databaseHealth: DatabaseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get('/custom')
  async getCustomHealth() {
    const checks = await Promise.all([
      this.databaseHealth.check(),
      this.redisHealth.check(),
    ]);

    const overallStatus = checks.every(check => check.status === 'healthy') 
      ? 'healthy' 
      : checks.some(check => check.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: checks.reduce((acc, check) => {
        acc[check.name] = {
          status: check.status,
          ...check.details
        };
        return acc;
      }, {})
    };
  }

  @Get('/database')
  async getDatabaseHealth() {
    return this.databaseHealth.check();
  }

  @Get('/redis')
  async getRedisHealth() {
    return this.redisHealth.check();
  }
}
```

## Kubernetes 集成

### 部署配置

在 Kubernetes 部署中使用健康检查：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rapidojs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rapidojs-app
  template:
    metadata:
      labels:
        app: rapidojs-app
    spec:
      containers:
      - name: app
        image: rapidojs-app:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

### 服务配置

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rapidojs-service
spec:
  selector:
    app: rapidojs-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Docker 健康检查

在 Dockerfile 中添加健康检查：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

## 监控集成

### Prometheus 指标

创建 Prometheus 兼容的健康检查指标：

```typescript
import { Controller, Get } from '@rapidojs/core';

@Controller('/metrics')
export class MetricsController {
  @Get('/health')
  getHealthMetrics() {
    return `
# HELP app_health Application health status
# TYPE app_health gauge
app_health{status="healthy"} 1
app_health{status="unhealthy"} 0

# HELP app_uptime_seconds Application uptime in seconds
# TYPE app_uptime_seconds counter
app_uptime_seconds ${process.uptime()}

# HELP nodejs_memory_usage_bytes Node.js memory usage
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${process.memoryUsage().rss}
nodejs_memory_usage_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}
nodejs_memory_usage_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}
    `.trim();
  }
}
```

### 日志集成

添加健康检查日志记录：

```typescript
import { Injectable, Logger } from '@rapidojs/core';

@Injectable()
export class HealthLogger {
  private readonly logger = new Logger(HealthLogger.name);

  logHealthCheck(endpoint: string, status: string, responseTime: number) {
    this.logger.log(`Health check ${endpoint}: ${status} (${responseTime}ms)`);
  }

  logHealthCheckFailure(endpoint: string, error: Error) {
    this.logger.error(`Health check ${endpoint} failed: ${error.message}`, error.stack);
  }
}
```

## 高级配置

### 配置健康检查选项

```typescript
import { Module } from '@rapidojs/core';
import { HealthModule } from '@rapidojs/core';

@Module({
  imports: [
    HealthModule.forRoot({
      // 自定义健康检查配置
      timeout: 5000, // 健康检查超时时间
      retries: 3,     // 重试次数
      interval: 30000, // 检查间隔
      endpoints: {
        health: '/health',
        detailed: '/health/detailed',
        readiness: '/health/readiness',
        liveness: '/health/liveness'
      }
    })
  ],
})
export class AppModule {}
```

## 最佳实践

1. **轻量级检查**：保持健康检查端点轻量级，避免复杂的业务逻辑
2. **快速响应**：健康检查应该快速响应，通常在几毫秒内
3. **依赖检查**：检查关键依赖项（数据库、缓存、外部服务）
4. **缓存结果**：对于昂贵的检查，考虑缓存结果
5. **监控告警**：设置基于健康检查的监控和告警
6. **文档化**：记录所有自定义健康检查端点
7. **测试**：为健康检查编写测试

## 故障排除

### 常见问题

1. **健康检查超时**
   - 检查网络连接
   - 验证应用程序是否正在运行
   - 检查防火墙设置

2. **依赖项检查失败**
   - 验证数据库连接
   - 检查外部服务可用性
   - 查看应用程序日志

3. **Kubernetes 探针失败**
   - 检查探针配置
   - 验证端点路径
   - 调整超时和重试设置

健康检查是确保应用程序可靠性和可观测性的重要工具。通过合理配置和使用健康检查，您可以提高应用程序的稳定性和运维效率。