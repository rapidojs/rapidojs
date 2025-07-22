# 生产环境部署指南

本指南将指导你如何将 RapidoJS 应用部署到生产环境。

## 🚀 部署前准备

### 1. 构建优化

确保你的项目已经进行了生产构建：

```bash
# 使用 SWC 进行快速构建
pnpm run build

# 检查构建输出
ls -la dist/
```

### 2. 环境变量配置

创建 `.env.production` 文件：

```bash
# .env.production
NODE_ENV=production
APP_CONFIG_PATH=./config/production.yaml

# 服务配置
PORT=3000
HOST=0.0.0.0

# 日志配置
LOG_LEVEL=warn
LOG_FORMAT=json

# 性能配置
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000
```

### 3. 生产配置文件

```yaml
# config/production.yaml
app:
  name: "my-rapidojs-app"
  version: "1.0.0"
  environment: "production"

server:
  port: 3000
  host: "0.0.0.0"
  keepAliveTimeout: 65000

logging:
  level: "warn"
  format: "json"
  
security:
  cors:
    origin: ["https://yourdomain.com"]
    credentials: true
  rateLimit:
    max: 1000
    timeWindow: 60000
```

### 4. 健康检查端点

确保你的应用有健康检查端点：

```typescript
@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  @Get('/ready')
  ready() {
    // 检查数据库连接、外部服务等
    return { status: 'ready' };
  }
}
```

## 🐳 Docker 部署

### 1. Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装 pnpm
RUN npm install -g pnpm

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖（仅生产依赖）
RUN pnpm install --prod --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S rapidojs -u 1001

# 切换到非 root 用户
USER rapidojs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["node", "dist/main.js"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./config:/app/config:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
```

### 3. 构建和运行

```bash
# 构建镜像
docker build -t my-rapidojs-app .

# 运行容器
docker run -d \
  --name rapidojs-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  my-rapidojs-app

# 使用 Docker Compose
docker-compose up -d
```

## 🔧 进程管理器部署

### 1. PM2 配置

```json
// ecosystem.config.json
{
  "apps": [{
    "name": "rapidojs-app",
    "script": "dist/main.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "development"
    },
    "env_production": {
      "NODE_ENV": "production",
      "PORT": 3000
    },
    "error_file": "./logs/err.log",
    "out_file": "./logs/out.log",
    "log_file": "./logs/combined.log",
    "time": true,
    "max_memory_restart": "1G",
    "node_args": "--max-old-space-size=1024"
  }]
}
```

### 2. 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 开始部署 RapidoJS 应用..."

# 拉取最新代码
git pull origin main

# 安装依赖
pnpm install --prod

# 构建项目
pnpm build

# 重启 PM2 进程
pm2 reload ecosystem.config.json --env production

# 保存 PM2 配置
pm2 save

echo "✅ 部署完成！"
```

### 3. PM2 部署命令

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.json --env production

# 监控
pm2 monit

# 查看日志
pm2 logs

# 重启
pm2 restart rapidojs-app

# 停止
pm2 stop rapidojs-app
```

## 🌐 Nginx 反向代理

### 1. Nginx 配置

```nginx
# /etc/nginx/sites-available/rapidojs-app
upstream rapidojs_backend {
    server 127.0.0.1:3000;
    # 如果使用多个实例
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL 证书配置
    ssl_certificate /path/to/your/certificate.pem;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # 安全头
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types application/json application/javascript text/css text/xml;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API 请求代理
    location / {
        proxy_pass http://rapidojs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查
    location /health {
        proxy_pass http://rapidojs_backend/health;
        access_log off;
    }
}
```

### 2. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/rapidojs-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## ☁️ 云平台部署

### 1. Heroku

```bash
# 安装 Heroku CLI
npm install -g heroku

# 登录
heroku login

# 创建应用
heroku create my-rapidojs-app

# 设置环境变量
heroku config:set NODE_ENV=production
heroku config:set PORT=\$PORT

# 部署
git push heroku main
```

`Procfile`:
```
web: node dist/main.js
```

### 2. Vercel

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 3. Railway

```toml
# railway.toml
[build]
command = "pnpm build"

[deploy]
startCommand = "node dist/main.js"

[env]
NODE_ENV = "production"
```

### 4. AWS ECS

```json
{
  "family": "rapidojs-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "rapidojs-app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/rapidojs-app:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/rapidojs-app",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## 📊 监控和日志

### 1. 应用监控

```typescript
// 集成 Prometheus 指标
import client from 'prom-client';

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// 在路由中间件中使用
app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

app.addHook('onSend', async (request, reply) => {
  const duration = (Date.now() - request.startTime) / 1000;
  httpDuration
    .labels(request.method, request.url, reply.statusCode.toString())
    .observe(duration);
});
```

### 2. 结构化日志

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty'
  } : undefined
});

// 在应用中使用
app.register(require('@fastify/sensible'));
app.setLogger(logger);
```

### 3. 错误追踪

```typescript
// 集成 Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});

// 错误处理中间件
app.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error);
  reply.status(500).send({ error: 'Internal Server Error' });
});
```

## 🔒 安全配置

### 1. 安全中间件

```typescript
// 注册安全插件
await app.register(require('@fastify/helmet'), {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
});

await app.register(require('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute'
});

await app.register(require('@fastify/cors'), {
  origin: (origin, callback) => {
    const hostname = new URL(origin).hostname;
    if (allowedOrigins.includes(hostname)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"), false);
  }
});
```

### 2. 环境变量安全

```bash
# 使用 dotenv-vault 管理敏感配置
npx dotenv-vault new
npx dotenv-vault push
npx dotenv-vault pull
```

## 📋 部署检查清单

### 构建阶段
- [ ] 生产构建完成 (`pnpm build`)
- [ ] 依赖项已优化（移除 devDependencies）
- [ ] 环境变量已配置
- [ ] 健康检查端点已实现

### 安全配置
- [ ] HTTPS 证书已配置
- [ ] 安全头已设置
- [ ] CORS 策略已配置
- [ ] 速率限制已启用
- [ ] 敏感信息已加密

### 性能优化
- [ ] 启用了 gzip 压缩
- [ ] 静态文件缓存已配置
- [ ] 数据库连接池已优化
- [ ] CDN 已配置（如适用）

### 监控和日志
- [ ] 应用监控已设置
- [ ] 错误追踪已配置
- [ ] 日志聚合已实现
- [ ] 告警规则已设置

### 备份和恢复
- [ ] 数据库备份策略已实施
- [ ] 配置文件已备份
- [ ] 恢复流程已测试

---

通过遵循这个部署指南，你的 RapidoJS 应用将能够在生产环境中稳定、安全、高效地运行。 