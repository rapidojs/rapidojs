# RapidoJS CLI 工具

RapidoJS CLI 是一个强大的命令行工具，用于快速创建和管理 RapidoJS 项目。

## 安装

### 全局安装（推荐）

```bash
pnpm add -g @rapidojs/cli
```

### 本地使用

```bash
npx @rapidojs/cli@latest
```

## 命令概览

```bash
rapido --help
```

输出：
```
Usage: rapido [options] [command]

⚡ RapidoJS CLI - 快速构建高性能 API 应用

Options:
  -v, --version             显示版本号
  -h, --help                display help for command

Commands:
  new <project-name>        创建一个新的 RapidoJS 项目
  generate|g <type> <name>  生成代码模板
  help [command]            display help for command
```

## 命令详解

### `rapido new` - 创建新项目

创建一个全新的 RapidoJS 项目，包含所有最佳实践配置。

```bash
rapido new my-api
```

#### 生成的项目结构

```
my-api/
├── src/                    # 源代码目录
│   ├── modules/           # 功能模块
│   │   └── user/         # 用户模块示例
│   │       ├── dto/      # 数据传输对象
│   │       │   └── create-user.dto.ts
│   │       ├── user.controller.ts
│   │       ├── user.service.ts
│   │       └── user.module.ts
│   ├── app.controller.ts  # 根控制器
│   ├── app.module.ts      # 根模块
│   └── main.ts           # 应用入口
├── public/               # 静态文件
├── package.json         # 项目配置
├── tsconfig.json       # TypeScript 配置
├── .swcrc             # SWC 编译器配置
└── README.md         # 项目文档
```

#### 包含的功能

- ✅ **完整的 TypeScript 配置** - ESM 模块、装饰器支持
- ✅ **SWC 快速构建** - 比 tsc 快 10-20 倍的编译速度
- ✅ **模块化架构** - 预置用户模块示例
- ✅ **验证管道** - 集成 class-validator 和 class-transformer
- ✅ **开发脚本** - 开发模式、构建、启动脚本
- ✅ **最佳实践** - 目录结构、命名约定、代码风格

#### 项目依赖

**生产依赖:**
- `@rapidojs/core` - RapidoJS 核心框架
- `class-transformer` - 对象转换工具
- `class-validator` - 验证装饰器
- `reflect-metadata` - 元数据反射支持

**开发依赖:**
- `fastify` - HTTP 服务器

### 快速开始

1. **创建项目**
   ```bash
   rapido new my-api
   cd my-api
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **开发模式**
   ```bash
   pnpm run dev
   ```

4. **测试 API**
   ```bash
   curl http://localhost:3000/health
   # 输出: {"status":"ok","timestamp":"...","message":"Welcome to my-api!"}
   
   curl http://localhost:3000/users
   # 输出: [{"id":1,"name":"张三","email":"zhangsan@example.com","createdAt":"..."}]
   ```

### `rapido generate` - 代码生成

> **注意**: 代码生成功能正在开发中，即将发布。

用于快速生成常用的代码模板，如控制器、服务等。

```bash
rapido g controller products  # 生成产品控制器
rapido g service auth         # 生成认证服务
```

## 开发脚本说明

生成的项目包含以下常用脚本：

| 脚本 | 命令 | 说明 |
|------|------|------|
| 开发模式 | `pnpm run dev` | 监听文件变化，自动重新编译 |
| 构建 | `pnpm run build` | 编译 TypeScript 到 dist/ |
| 启动 | `pnpm start` | 运行编译后的应用 |
| 清理 | `pnpm run clean` | 删除 dist/ 目录 |

## 配置说明

### TypeScript 配置 (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### SWC 配置 (.swcrc)

```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "target": "es2022",
    "keepClassNames": true
  },
  "module": {
    "type": "es6"
  }
}
```

## 故障排除

### 常见问题

1. **装饰器不工作**
   - 确保 `experimentalDecorators` 和 `emitDecoratorMetadata` 已启用
   - 确保在入口文件导入了 `reflect-metadata`

2. **模块导入错误**
   - 确保使用 `.js` 扩展名导入（即使源文件是 `.ts`）
   - 确保 `package.json` 中设置了 `"type": "module"`

3. **验证不工作**
   - 确保安装了 `class-validator` 和 `class-transformer`
   - 确保在 DTO 类上正确使用了验证装饰器

### 获取帮助

- 📖 [文档](https://github.com/rapidojs/rapidojs/tree/main/docs)
- 🐛 [报告问题](https://github.com/rapidojs/rapidojs/issues)
- 💬 [讨论](https://github.com/rapidojs/rapidojs/discussions)

## 更新日志

### v0.1.0 (2025-07)

- ✅ 实现 `rapido new` 命令
- ✅ 项目模板生成
- ✅ TypeScript + SWC 配置
- ✅ 模块化架构示例
- 🚧 代码生成功能开发中 