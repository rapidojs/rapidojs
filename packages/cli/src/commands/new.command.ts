import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import fs from 'fs-extra';
const { writeFile, ensureDir } = fs;
import { FileUtils } from '../utils/file.utils.js';

export class NewCommand {
  create(): Command {
    const command = new Command('new');

    command
      .description('创建一个新的 RapidoJS 项目')
      .argument('<project-name>', '项目名称')
      .action(async (projectName: string) => {
        await this.execute(projectName);
      });

    return command;
  }

  private async execute(projectName: string): Promise<void> {
    console.log(chalk.blue('\n⚡ 欢迎使用 RapidoJS!\n'));

    // 验证项目名称
    if (!this.isValidProjectName(projectName)) {
      console.error(chalk.red('❌ 项目名称无效。请使用有效的 npm 包名称。'));
      process.exit(1);
    }

    // 确定项目路径
    const targetDir = resolve(process.cwd(), projectName);

    // 检查目录是否已存在
    if (existsSync(targetDir)) {
      console.error(chalk.red(`❌ 目录 ${targetDir} 已存在。`));
      process.exit(1);
    }

    // 生成项目
    const spinner = ora('正在创建项目...').start();
    try {
      await this.generateProject(targetDir, projectName);
      spinner.succeed('项目创建成功!');

      // 显示完成信息
      this.showCompletionMessage(projectName);

    } catch (error) {
      spinner.fail('项目创建失败');
      console.error(chalk.red('错误:'), error);
      process.exit(1);
    }
  }

  private async generateProject(targetDir: string, projectName: string): Promise<void> {
    // 创建目录结构
    await ensureDir(join(targetDir, 'src'));
    await ensureDir(join(targetDir, 'src/modules'));
    await ensureDir(join(targetDir, 'src/modules/user'));
    await ensureDir(join(targetDir, 'src/modules/user/dto'));
    await ensureDir(join(targetDir, 'public'));

    // 生成 package.json
    const packageJson = {
      name: projectName,
      version: '0.1.0',
      description: `使用 RapidoJS 构建的 API 项目`,
      type: 'module',
      main: './dist/main.js',
      scripts: {
        start: 'node --enable-source-maps ./dist/main.js',
        build: 'pnpm run clean && pnpm run build:swc',
        'build:swc': 'swc src -d dist --strip-leading-paths --source-maps --copy-files',
        clean: 'rm -rf dist',
        dev: 'pnpm run build:swc --watch'
      },
      dependencies: {
        '@rapidojs/core': '^1.0.1',
        'class-transformer': '^0.5.1',
        'class-validator': '^0.14.1',
        'reflect-metadata': '^0.2.2'
      },
      devDependencies: {
        'fastify': '^5.4.0'
      }
    };

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // 生成 tsconfig.json
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        allowJs: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        resolveJsonModule: true,
        isolatedModules: true,
        useDefineForClassFields: false,
        outDir: './dist',
        rootDir: './src'
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'tsconfig.json'),
      JSON.stringify(tsconfig, null, 2)
    );

    // 生成 .swcrc
    const swcrc = {
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true
        },
        target: 'es2022',
        keepClassNames: true
      },
      module: {
        type: 'es6',
        strict: false,
        strictMode: false,
        lazy: false,
        noInterop: false
      },
      sourceMaps: true,
      inlineSourcesContent: true
    };

    await FileUtils.writeFileEnsureDir(
      join(targetDir, '.swcrc'),
      JSON.stringify(swcrc, null, 2)
    );

    // 生成 main.ts
    const mainTs = `import 'reflect-metadata';
import { RapidoFactory } from '@rapidojs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  try {
    console.log('Starting ${projectName}...');
    
    const app = await RapidoFactory.create(AppModule);
    
    console.log('App created successfully');

    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Server listening on http://localhost:3000');
  } catch (err) {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  }
}

bootstrap();
`;

    await FileUtils.writeFileEnsureDir(join(targetDir, 'src/main.ts'), mainTs);

    // 生成 app.module.ts
    const appModule = `import { Module } from '@rapidojs/core';
import { AppController } from './app.controller.js';
import { UserModule } from './modules/user/user.module.js';

@Module({
  imports: [UserModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
`;

    await FileUtils.writeFileEnsureDir(join(targetDir, 'src/app.module.ts'), appModule);

    // 生成 app.controller.ts
    const appController = `import { Controller, Get } from '@rapidojs/core';

@Controller()
export class AppController {
  @Get('/health')
  getHealth(): object {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Welcome to ${projectName}!'
    };
  }
}
`;

    await FileUtils.writeFileEnsureDir(join(targetDir, 'src/app.controller.ts'), appController);

    // 生成用户模块
    await this.generateUserModule(targetDir);

    // 生成 README.md
    const readme = `# ${projectName}

使用 RapidoJS 构建的 API 项目

## 快速开始

### 安装依赖

\`\`\`bash
pnpm install
\`\`\`

### 开发模式

\`\`\`bash
pnpm run dev
\`\`\`

### 生产构建

\`\`\`bash
pnpm run build
pnpm start
\`\`\`

## API 端点

- \`GET /health\` - 健康检查
- \`GET /users\` - 获取用户列表
- \`POST /users\` - 创建新用户

访问 http://localhost:3000/health 测试 API

Happy coding! 🚀
`;

    await FileUtils.writeFileEnsureDir(join(targetDir, 'README.md'), readme);
  }

  private async generateUserModule(targetDir: string): Promise<void> {
    // user.module.ts
    const userModule = `import { Module } from '@rapidojs/core';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
`;

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'src/modules/user/user.module.ts'), 
      userModule
    );

    // user.controller.ts
    const userController = `import { Controller, Get, Post, Body } from '@rapidojs/core';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Controller('/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body user: CreateUserDto) {
    return this.userService.create(user);
  }
}
`;

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'src/modules/user/user.controller.ts'), 
      userController
    );

    // user.service.ts
    const userService = `import { Injectable } from '@rapidojs/core';
import { CreateUserDto } from './dto/create-user.dto.js';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class UserService {
  private users: User[] = [
    {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      createdAt: new Date(),
    }
  ];

  private nextId = 2;

  findAll(): User[] {
    return this.users;
  }

  create(userData: CreateUserDto): User {
    const user: User = {
      id: this.nextId++,
      ...userData,
      createdAt: new Date(),
    };
    
    this.users.push(user);
    return user;
  }
}
`;

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'src/modules/user/user.service.ts'), 
      userService
    );

    // create-user.dto.ts
    const createUserDto = `import { IsNotEmpty, IsEmail } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}
`;

    await FileUtils.writeFileEnsureDir(
      join(targetDir, 'src/modules/user/dto/create-user.dto.ts'), 
      createUserDto
    );
  }

  private isValidProjectName(name: string): boolean {
    // 基本的 npm 包名验证
    const validNamePattern = /^[a-z0-9]([a-z0-9\-_]*[a-z0-9])?$/;
    return validNamePattern.test(name) && name.length <= 214;
  }

  private showCompletionMessage(projectName: string): void {
    console.log('\n' + chalk.green('🎉 项目创建成功!') + '\n');
    console.log('下一步:');
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan('  pnpm install'));
    console.log(chalk.cyan('  pnpm run dev'));
    console.log('\n然后访问 http://localhost:3000/health 查看你的 API!');
    console.log('\n' + chalk.yellow('开始构建你的高性能 API 吧! 🚀'));
  }
} 