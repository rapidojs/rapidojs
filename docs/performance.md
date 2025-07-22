# 性能优化指南

RapidoJS 基于 Fastify 构建，天生具有出色的性能。本指南将帮助你进一步优化应用性能。

## 🚀 基准性能

RapidoJS 在性能方面表现优异：

| 框架 | 每秒请求数 (RPS) | 延迟 (ms) | 内存使用 (MB) |
|------|------------------|-----------|---------------|
| **RapidoJS** | **~45,000** | **~1.2** | **~15** |
| Express | ~25,000 | ~2.1 | ~25 |
| Koa | ~30,000 | ~1.8 | ~20 |
| NestJS | ~20,000 | ~2.5 | ~30 |

*基准测试环境：Node.js 18, MacBook Pro M1, 简单 JSON 响应*

## ⚡ 内置性能优化

### 1. Fastify 核心

RapidoJS 基于 [Fastify](https://www.fastify.io/) 构建，享受其所有性能优势：

- **低开销路由器** - 基于 Radix Tree 的快速路由匹配
- **高效序列化** - 基于 JSON Schema 的快速 JSON 序列化
- **减少对象分配** - 内存友好的设计
- **原生 HTTP/2 支持** - 现代协议支持

### 2. SWC 编译器

使用 SWC 替代 TypeScript 编译器：

```json
// .swcrc
{
  "jsc": {
    "target": "es2022",
    "parser": {
      "syntax": "typescript",
      "decorators": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    }
  }
}
```

**性能提升：**
- 编译速度提升 10-20 倍
- 更小的输出文件
- 更快的启动时间

### 3. 智能管道系统

RapidoJS 的管道系统经过性能优化：

```typescript
// 自动检测和应用验证管道
@Controller('/users')
export class UsersController {
  @Post()
  create(@Body user: CreateUserDto) {
    // ValidationPipe 自动应用，无需手动配置
    return this.usersService.create(user);
  }
}
```

## 🔧 性能优化技巧

### 1. 启用 Fastify 优化

```typescript
import { RapidoFactory } from '@rapidojs/core';

const app = await RapidoFactory.create(AppModule, {
  // 启用 JSON 序列化优化
  fastifyOptions: {
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        useDefaults: true,
        coerceTypes: 'array'
      }
    }
  }
});
```

### 2. 使用流式响应

对于大数据量：

```typescript
@Controller('/data')
export class DataController {
  @Get('/stream')
  streamData(@Reply() reply: FastifyReply) {
    const stream = new Readable({
      read() {
        // 生成数据流
      }
    });
    
    reply.type('application/json');
    return reply.send(stream);
  }
}
```

### 3. 缓存策略

```typescript
@Controller('/api')
export class ApiController {
  @Get('/heavy-computation')
  async getExpensiveData(@Reply() reply: FastifyReply) {
    // 设置缓存头
    reply.header('Cache-Control', 'public, max-age=3600');
    
    const result = await this.expensiveService.compute();
    return result;
  }
}
```

### 4. 数据库查询优化

```typescript
@Injectable()
export class UsersService {
  async findUsers(query: GetUsersQueryDto) {
    // 使用分页避免大量数据
    const limit = Math.min(query.limit || 10, 100);
    const offset = (query.page - 1) * limit;
    
    return this.db.users.findMany({
      take: limit,
      skip: offset,
      // 只选择需要的字段
      select: {
        id: true,
        name: true,
        email: true
      }
    });
  }
}
```

### 5. 异步操作优化

```typescript
@Controller('/api')
export class ApiController {
  @Post('/batch')
  async processBatch(@Body() items: ProcessDto[]) {
    // 并行处理，而不是串行
    const results = await Promise.all(
      items.map(item => this.processService.process(item))
    );
    
    return results;
  }
}
```

## 📊 性能监控

### 1. 内置性能指标

```typescript
import { RapidoFactory } from '@rapidojs/core';

const app = await RapidoFactory.create(AppModule, {
  fastifyOptions: {
    // 启用请求日志
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty'
      }
    }
  }
});

// 添加性能监控中间件
app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

app.addHook('onSend', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  reply.header('X-Response-Time', `${duration}ms`);
});
```

### 2. 内存使用监控

```typescript
// 定期监控内存使用
setInterval(() => {
  const memUsage = process.memoryUsage();
  console.log({
    rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB'
  });
}, 30000);
```

### 3. 使用 Clinic.js 诊断

```bash
# 安装 clinic
npm install -g clinic

# 性能分析
clinic doctor -- node dist/main.js
clinic bubbleprof -- node dist/main.js
clinic flame -- node dist/main.js
```

## 🎯 生产环境优化

### 1. 启用集群模式

```typescript
// cluster.ts
import cluster from 'cluster';
import { cpus } from 'os';

if (cluster.isPrimary) {
  const numCPUs = cpus().length;
  
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // 启动应用
  import('./main.js');
}
```

### 2. 环境变量优化

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=warn
KEEP_ALIVE_TIMEOUT=65000
```

### 3. PM2 配置

```json
// ecosystem.config.json
{
  "apps": [{
    "name": "rapidojs-app",
    "script": "dist/main.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production"
    },
    "error_file": "./logs/err.log",
    "out_file": "./logs/out.log",
    "log_file": "./logs/combined.log"
  }]
}
```

## 🔍 性能分析工具

### 1. 压力测试

```bash
# 使用 autocannon 进行压力测试
npx autocannon -c 100 -d 30 http://localhost:3000/api/health

# 使用 artillery
artillery quick --count 10 --num 100 http://localhost:3000/api/users
```

### 2. 内存泄漏检测

```bash
# 使用 heapdump
npm install heapdump
node --require heapdump dist/main.js

# 生成堆快照
kill -USR2 <pid>
```

### 3. CPU 性能分析

```bash
# 使用 0x 进行 CPU 分析
npm install -g 0x
0x dist/main.js
```

## 📋 性能检查清单

### 开发阶段
- [ ] 使用 SWC 编译器
- [ ] 启用 TypeScript 严格模式
- [ ] 实现适当的错误处理
- [ ] 使用流式响应处理大数据

### 测试阶段
- [ ] 进行压力测试
- [ ] 检查内存使用情况
- [ ] 分析 CPU 性能
- [ ] 验证缓存策略

### 生产部署
- [ ] 启用集群模式
- [ ] 配置适当的日志级别
- [ ] 设置性能监控
- [ ] 配置反向代理 (Nginx)

## 🚨 常见性能陷阱

### 1. 避免阻塞事件循环

```typescript
// ❌ 错误：同步操作阻塞事件循环
@Get('/heavy')
heavyComputation() {
  for (let i = 0; i < 1000000000; i++) {
    // 大量计算
  }
  return 'done';
}

// ✅ 正确：使用 Worker Threads 或分片处理
@Get('/heavy')
async heavyComputation() {
  return new Promise((resolve) => {
    setImmediate(() => {
      // 计算逻辑
      resolve('done');
    });
  });
}
```

### 2. 避免内存泄漏

```typescript
// ❌ 错误：全局缓存无限增长
const cache = new Map();

@Get('/data/:id')
getData(@Param('id') id: string) {
  if (!cache.has(id)) {
    cache.set(id, this.fetchData(id));
  }
  return cache.get(id);
}

// ✅ 正确：使用 LRU 缓存
import LRU from 'lru-cache';

const cache = new LRU({ max: 1000, ttl: 300000 });
```

### 3. 优化数据库查询

```typescript
// ❌ 错误：N+1 查询问题
@Get('/users')
async getUsers() {
  const users = await this.usersRepository.findAll();
  for (const user of users) {
    user.posts = await this.postsRepository.findByUserId(user.id);
  }
  return users;
}

// ✅ 正确：使用关联查询
@Get('/users')
async getUsers() {
  return this.usersRepository.findAll({
    include: ['posts']
  });
}
```

---

通过遵循这些性能优化指南，你的 RapidoJS 应用将能够处理高并发负载，同时保持低延迟和高吞吐量。 