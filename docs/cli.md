# 🛠️ CLI 工具指南

`@rapidojs/cli` 是 RapidoJS 框架的官方命令行工具，提供项目生成、模块管理和代码生成功能，让您能够快速搭建和开发 RapidoJS 应用。

## 📦 安装

### 全局安装（推荐）

```bash
# 使用 npm
npm install -g @rapidojs/cli

# 使用 pnpm
pnpm add -g @rapidojs/cli

# 使用 yarn
yarn global add @rapidojs/cli
```

### 临时使用

```bash
# 使用 npx（无需安装）
npx @rapidojs/cli@latest new my-api
```

## 🚀 快速开始

### 创建新项目

```bash
# 创建新的 RapidoJS 项目
rapido new my-api

# 进入项目目录
cd my-api

# 安装依赖
pnpm install

# 启动开发服务器
pnpm run dev
```

生成的项目包含：
- ✅ 完整的 TypeScript 配置
- ✅ SWC 快速编译器配置
- ✅ 示例用户模块（Controller + Service + DTO）
- ✅ 验证管道集成
- ✅ 开发脚本和构建配置
- ✅ ESLint 和 Prettier 配置
- ✅ 测试环境配置

## 📦 模块管理

### `rapido add` 命令

`add` 命令用于向现有的 RapidoJS 项目添加官方模块，自动处理依赖安装、配置文件生成和示例代码创建。

#### 添加认证模块

```bash
rapido add auth
```

**功能：**
- 安装 `@rapidojs/auth` 包
- 创建 `src/auth/` 目录结构
- 生成 JWT 配置文件
- 创建认证服务和守卫示例
- 更新环境变量模板

**生成的文件：**
```
src/auth/
├── auth.module.ts          # 认证模块
├── auth.service.ts         # 认证服务
├── jwt-auth.guard.ts       # JWT 守卫
└── strategies/
    └── jwt.strategy.ts     # JWT 策略
```

#### 添加配置模块

```bash
rapido add config
```

**功能：**
- 安装 `@rapidojs/config` 包
- 创建配置文件结构
- 生成环境变量验证 schema
- 创建配置服务示例

**生成的文件：**
```
src/config/
├── config.module.ts        # 配置模块
├── config.service.ts       # 配置服务
└── env.validation.ts       # 环境变量验证
```

#### 添加任务调度模块

```bash
rapido add schedule
```

**功能：**
- 安装 `@rapidojs/schedule` 包
- 创建任务调度目录结构
- 生成任务服务示例
- 创建 Cron、Interval 和 Timeout 任务示例

**生成的文件：**
```
src/tasks/
├── tasks.module.ts         # 任务模块
└── tasks.service.ts        # 任务服务
```

#### 添加测试模块

```bash
rapido add testing
```

**功能：**
- 安装测试相关依赖（vitest, @vitest/ui 等）
- 创建测试配置文件
- 生成测试工具和设置文件

**生成的文件：**
```
vitest.config.ts            # Vitest 配置
src/test/
├── setup.ts               # 测试设置
└── utils.ts               # 测试工具
```

## 🎨 代码生成

### `rapido g` 命令

`generate`（简写为 `g`）命令用于生成常用的代码文件，包括控制器、服务、守卫和拦截器等。

#### 生成控制器

```bash
# 生成用户控制器
rapido g controller user

# 生成带测试文件的控制器
rapido g controller user --with-test
```

**生成的文件：**
```
src/user/
├── user.controller.ts      # 用户控制器
└── user.controller.spec.ts # 控制器测试（可选）
```

**控制器模板包含：**
- 完整的 CRUD 操作（GET, POST, PUT, DELETE）
- 参数验证和 DTO 集成
- 错误处理
- API 文档注释

#### 生成服务

```bash
# 生成用户服务
rapido g service user

# 生成带测试文件的服务
rapido g service user --with-test
```

**生成的文件：**
```
src/user/
├── user.service.ts         # 用户服务
└── user.service.spec.ts    # 服务测试（可选）
```

**服务模板包含：**
- 基础 CRUD 方法
- 依赖注入装饰器
- 错误处理逻辑
- TypeScript 类型定义

#### 生成守卫

```bash
# 生成认证守卫
rapido g guard auth

# 生成带测试文件的守卫
rapido g guard auth --with-test
```

**生成的文件：**
```
src/guards/
├── auth.guard.ts           # 认证守卫
└── auth.guard.spec.ts      # 守卫测试（可选）
```

**守卫模板包含：**
- `CanActivate` 接口实现
- 请求上下文处理
- 认证逻辑框架
- 错误处理

#### 生成拦截器

```bash
# 生成日志拦截器
rapido g interceptor log

# 生成带测试文件的拦截器
rapido g interceptor log --with-test
```

**生成的文件：**
```
src/interceptors/
├── log.interceptor.ts      # 日志拦截器
└── log.interceptor.spec.ts # 拦截器测试（可选）
```

**拦截器模板包含：**
- `NestInterceptor` 接口实现
- 请求/响应处理逻辑
- 性能监控示例
- 日志记录功能

## 🔧 命令选项

### 全局选项

```bash
# 查看版本
rapido --version
rapido -v

# 查看帮助
rapido --help
rapido -h

# 详细输出
rapido --verbose
```

### `new` 命令选项

```bash
# 指定包管理器
rapido new my-api --package-manager pnpm
rapido new my-api --pm npm

# 跳过依赖安装
rapido new my-api --skip-install

# 指定目录
rapido new my-api --directory ./projects
```

### `generate` 命令选项

```bash
# 生成带测试文件
rapido g controller user --with-test
rapido g service user -t

# 指定输出目录
rapido g controller user --path src/modules

# 跳过文件覆盖确认
rapido g service user --force
```

## 📁 项目结构

使用 CLI 生成的项目遵循以下结构：

```
my-api/
├── src/
│   ├── app.module.ts       # 应用主模块
│   ├── main.ts            # 应用入口
│   ├── user/              # 用户模块
│   │   ├── dto/           # 数据传输对象
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── auth/              # 认证模块（可选）
│   ├── config/            # 配置模块（可选）
│   ├── tasks/             # 任务模块（可选）
│   ├── guards/            # 守卫
│   ├── interceptors/      # 拦截器
│   └── test/              # 测试工具
├── .env.example           # 环境变量示例
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts       # 测试配置
└── README.md
```

## 🛠️ 开发工作流

### 典型的开发流程

1. **创建项目**
   ```bash
   rapido new my-api
   cd my-api
   ```

2. **添加所需模块**
   ```bash
   rapido add auth
   rapido add config
   rapido add schedule
   ```

3. **生成业务代码**
   ```bash
   rapido g controller product
   rapido g service product
   ```

4. **添加守卫和拦截器**
   ```bash
   rapido g guard role
   rapido g interceptor transform
   ```

5. **运行和测试**
   ```bash
   pnpm run dev
   pnpm test
   ```

### 最佳实践

1. **模块组织**
   - 按功能模块组织代码
   - 每个模块包含 controller、service、dto 等
   - 使用 `@Module` 装饰器定义模块边界

2. **命名约定**
   - 使用 kebab-case 命名文件
   - 使用 PascalCase 命名类
   - 使用 camelCase 命名方法和属性

3. **测试策略**
   - 为每个服务和控制器生成测试文件
   - 使用 `--with-test` 选项自动生成测试模板
   - 定期运行测试确保代码质量

## 🔍 故障排除

### 常见问题

**Q: 命令找不到**
```bash
command not found: rapido
```
**A:** 确保已全局安装 CLI 工具：
```bash
npm install -g @rapidojs/cli
```

**Q: 不是 RapidoJS 项目**
```bash
Error: Not a RapidoJS project
```
**A:** `add` 和 `generate` 命令只能在 RapidoJS 项目中使用，确保在项目根目录执行命令。

**Q: 文件已存在**
```bash
Error: File already exists
```
**A:** 使用 `--force` 选项覆盖现有文件：
```bash
rapido g controller user --force
```

### 调试模式

使用 `--verbose` 选项查看详细输出：

```bash
rapido new my-api --verbose
rapido add auth --verbose
```

## 🔄 更新

### 更新 CLI 工具

```bash
# 检查当前版本
rapido --version

# 更新到最新版本
npm update -g @rapidojs/cli
```

### 版本兼容性

| CLI 版本 | RapidoJS 版本 | Node.js 版本 |
|----------|---------------|-------------|
| 1.0.x    | 1.0.x - 1.1.x | 18.0+ |
| 1.1.x    | 1.1.x+        | 18.0+ |

## 📚 相关文档

- [快速开始](./getting-started.md)
- [模块系统](./modules.md)
- [认证授权](./auth.md)
- [配置管理](./configuration.md)
- [任务调度](./schedule.md)
- [测试指南](./testing.md)

---

通过 RapidoJS CLI，您可以快速搭建高质量的 API 应用，专注于业务逻辑的实现而不是样板代码的编写。