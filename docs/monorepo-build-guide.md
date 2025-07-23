# RapidoJS Monorepo 构建指南

## 构建问题说明

在 RapidoJS monorepo 中，包之间存在依赖关系。例如：
- `@rapidojs/config` 依赖 `@rapidojs/core`
- `@rapidojs/cli` 依赖 `@rapidojs/common`
- `@rapidojs/testing` 依赖 `@rapidojs/common`

## 问题现象

当你在单个包目录下运行 `pnpm build` 时，可能会遇到类型错误：

```bash
cd packages/config
pnpm build
# 错误: Could not find a declaration file for module '@rapidojs/core'
```

但在项目根目录运行 `pnpm build` 却正常工作。

## 问题原因

### 根目录构建（正常）
- ✅ **Turbo 管理依赖**: `turbo.json` 中的 `"dependsOn": ["^build"]` 确保依赖包先构建
- ✅ **正确构建顺序**: `core` → `config` → 其他包
- ✅ **类型文件可用**: 依赖包的 `.d.ts` 文件在构建时已存在

### 单包构建（问题）
- ❌ **无依赖管理**: 直接构建当前包，不检查依赖状态
- ❌ **类型文件缺失**: 依赖包可能没有 `.d.ts` 文件
- ❌ **构建顺序错误**: 可能在依赖包未准备好时就开始构建

## 解决方案

### 方案 1: 使用 `build:with-deps` 脚本（推荐）

每个包都提供了 `build:with-deps` 脚本，它会自动处理依赖关系：

```bash
# 在任何包目录下
cd packages/config
pnpm build:with-deps  # 这会自动构建 core 包，然后构建 config 包
```

### 方案 2: 从根目录构建特定包

```bash
# 在项目根目录
turbo run build --filter=@rapidojs/config
```

### 方案 3: 手动确保依赖包已构建

```bash
# 先构建依赖包
cd packages/core
pnpm build

# 再构建目标包
cd ../config
pnpm build
```

## 最佳实践

### 开发时建议

1. **初始构建**: 在项目根目录运行 `pnpm build` 确保所有包都已构建
2. **单包开发**: 使用 `pnpm build:with-deps` 确保依赖正确
3. **监听模式**: 使用 `pnpm dev` 进行开发时的实时构建

### CI/CD 建议

在 CI/CD 环境中，始终从根目录构建：

```yaml
# GitHub Actions 示例
- name: Build packages
  run: pnpm build
```

### 包脚本说明

每个包都有以下构建脚本：

```json
{
  "scripts": {
    "build": "pnpm clean && pnpm build:swc && pnpm build:types",
    "build:with-deps": "cd ../.. && turbo run build --filter=<package-name>",
    "build:swc": "swc src -d dist --strip-leading-paths --source-maps --copy-files",
    "build:types": "tsc -p tsconfig.build.json --emitDeclarationOnly"
  }
}
```

- `build`: 常规构建，假设依赖已准备好
- `build:with-deps`: 智能构建，自动处理依赖关系
- `build:swc`: 只构建 JavaScript 文件
- `build:types`: 只构建 TypeScript 类型文件

## 依赖关系图

```
@rapidojs/common
├── @rapidojs/core
├── @rapidojs/cli
└── @rapidojs/testing

@rapidojs/core
└── @rapidojs/config
```

## 故障排除

### 类型错误
如果遇到类型找不到的错误，尝试：
1. 使用 `build:with-deps` 脚本
2. 清理并重新构建: `pnpm clean && pnpm build:with-deps`
3. 检查依赖包的 `dist/` 目录是否有 `.d.ts` 文件

### 缓存问题
如果遇到缓存相关问题：
```bash
# 清理 Turbo 缓存
turbo run build --force

# 清理包缓存
pnpm store prune
```

### 循环依赖
避免包之间的循环依赖。如果遇到循环依赖问题，重新设计包结构。 