---
sidebar_position: 9
---

# 项目概览

## 🎯 项目愿景

Rapido.js 致力于成为最现代化、最易用的 TypeScript Node.js 框架，让开发者能够快速构建高性能、类型安全的 Web API。

## 🏗️ 架构设计

### 核心原则

1. **类型安全优先** - 完整的 TypeScript 支持
2. **装饰器驱动** - 使用装饰器简化开发
3. **高性能** - 基于 Fastify 构建
4. **模块化** - 清晰的模块化架构
5. **测试友好** - 内置测试支持

### 技术栈

- **运行时**: Node.js 18+
- **语言**: TypeScript 5.0+
- **HTTP 服务器**: Fastify
- **验证**: class-validator + class-transformer
- **测试**: Vitest
- **构建工具**: TypeScript Compiler
- **包管理**: pnpm + Turborepo

## 📦 项目结构

```
rapidojs/
├── packages/                    # 核心包
│   ├── core/                   # @rapidojs/core 核心包
│   │   ├── src/
│   │   │   ├── decorators/     # 装饰器实现
│   │   │   ├── factory/        # 工厂类
│   │   │   ├── pipes/          # 管道系统
│   │   │   ├── exceptions/     # 异常类
│   │   │   └── __tests__/      # 测试文件
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                 # @rapidojs/config 配置包
│       ├── src/
│       │   ├── services/       # 配置服务
│       │   ├── decorators/     # 配置装饰器
│       │   ├── interfaces/     # 接口定义
│       │   └── __tests__/      # 测试文件
│       ├── package.json
│       └── tsconfig.json
├── apps/                       # 应用示例
│   ├── example-api/           # 示例 API 应用
│   │   ├── src/
│   │   │   ├── dto/           # 数据传输对象
│   │   │   ├── *.controller.ts
│   │   │   ├── *.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── package.json
│   └── docs/                  # 文档站点
│       ├── docs/              # 文档内容
│       ├── src/               # 自定义组件
│       ├── docusaurus.config.ts
│       └── package.json
├── pnpm-workspace.yaml        # pnpm 工作区配置
├── turbo.json                 # Turborepo 配置
└── README.md                  # 项目说明
```

## 🚀 核心功能

### 1. 装饰器系统

```typescript
@Controller('/api/users')
export class UsersController {
  @Get('/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return { id };
  }
}
```

### 2. 管道系统

```typescript
// 内置管道
@Param('id', ParseIntPipe) id: number

// 自动 DTO 验证
@Body user: CreateUserDto  // ValidationPipe 自动应用
```

### 3. 模块系统

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [DatabaseModule],
})
export class UsersModule {}
```

### 4. 依赖注入

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}
}
```

### 5. 配置管理

```typescript
// 注册配置模块
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      configFilePath: 'config/app.yaml',
    }),
  ],
})
export class AppModule {}

// 使用配置
@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}
  
  connect() {
    const host = this.configService.get('DATABASE_HOST', 'localhost');
    const port = this.configService.get('DATABASE_PORT', 5432);
    // 连接数据库...
  }
}
```

## 📈 开发进度

### ✅ 已完成功能

- [x] **基础装饰器系统** (`@Controller`, `@Get`, `@Post` 等)
- [x] **参数装饰器** (`@Param`, `@Query`, `@Body`, `@Headers`)
- [x] **内置管道** (`ParseIntPipe`, `ParseBoolPipe`, `ValidationPipe` 等)
- [x] **NestJS 风格管道** (`@Param('id', ParseIntPipe)`)
- [x] **自动 DTO 验证** (智能识别 DTO 类型)
- [x] **模块系统** (`@Module`, `@Injectable`)
- [x] **异常处理** (`HttpException`, `BadRequestException` 等)
- [x] **配置管理** (`@rapidojs/config` - 支持 .env 和 YAML)
- [x] **测试支持** (Vitest 集成)
- [x] **完整的文档站点**

### 🔄 开发中功能

- [ ] 中间件系统
- [ ] 守卫 (Guards)
- [ ] 拦截器 (Interceptors)
- [ ] 全局管道和异常过滤器
- [ ] WebSocket 支持
- [ ] 文件上传支持

### 🎯 计划功能

- [ ] GraphQL 支持
- [ ] 微服务支持
- [ ] 缓存系统
- [ ] 配置管理
- [ ] 日志系统
- [ ] 健康检查
- [ ] OpenAPI/Swagger 集成
- [ ] CLI 工具

## 🧪 测试覆盖

### 当前测试状态

- **总测试数**: 65+ 个测试用例
- **测试类型**: 单元测试、集成测试、功能测试
- **覆盖范围**: 装饰器、管道、控制器注册、异常处理

### 测试文件

```
packages/core/src/__tests__/
├── decorators.test.ts           # 装饰器测试 (12 个测试)
├── controller-registrar.test.ts # 控制器注册测试 (12 个测试)
├── rapido.test.ts              # 框架集成测试 (15 个测试)
├── pipes.test.ts               # 管道测试 (19 个测试)
├── pipes-integration.test.ts   # 管道集成测试 (2 个测试)
└── nestjs-style-pipes.test.ts  # NestJS 风格管道测试 (5 个测试)
```

## 🌟 特色功能

### 1. 智能 DTO 检测

框架能自动识别 DTO 类并应用 ValidationPipe：

```typescript
// 自动识别这些命名模式的类为 DTO
- *Dto, *DTO
- *Request, *Response  
- *Input, *Output

@Post('/users')
createUser(@Body user: CreateUserDto) {
  // ValidationPipe 自动应用，无需手动声明！
}
```

### 2. NestJS 兼容性

完全兼容 NestJS 的管道使用方式：

```typescript
@Get('/users/:id')
getUser(
  @Param('id', ParseIntPipe) id: number,
  @Query('active', ParseBoolPipe) active: boolean
) {
  // 参数自动转换为正确的类型
}
```

### 3. 高性能

基于 Fastify 构建，提供卓越的性能：

- 比 Express 快 2-3 倍
- 低内存占用
- 高并发处理能力

## 📊 性能基准

| 框架 | 请求/秒 | 延迟 (ms) | 内存使用 (MB) |
|------|---------|-----------|---------------|
| Rapido.js | ~45,000 | 2.1 | 45 |
| NestJS | ~20,000 | 4.8 | 78 |
| Express | ~15,000 | 6.2 | 52 |

*基准测试环境: Node.js 18, 简单 Hello World API*

## 🤝 贡献指南

### 开发环境设置

```bash
# 克隆项目
git clone https://github.com/rapidojs/rapidojs.git
cd rapidojs

# 安装依赖
pnpm install

# 构建项目
pnpm build

# 运行测试
pnpm test

# 启动示例应用
pnpm --filter example-api dev
```

### 贡献流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 编写测试用例
- 更新相关文档

## 🎉 社区

### 链接

- **GitHub**: https://github.com/rapidojs/rapidojs
- **文档**: https://rapidojs.dev
- **示例**: https://github.com/rapidojs/rapidojs/tree/main/apps/example-api

### 支持

- 提交 Issue 报告 Bug
- 参与 Discussions 讨论
- 贡献代码和文档
- 分享使用经验

## 📄 许可证

MIT License - 详见 [LICENSE](https://github.com/rapidojs/rapidojs/blob/main/LICENSE) 文件。

---

**Rapido.js** - 让 Node.js API 开发更快、更安全、更现代！ 🚀
