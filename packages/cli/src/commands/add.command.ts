import { Command } from 'commander';
import { writeFileEnsureDir } from '../utils/file.utils.js';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

/**
 * 添加命令类
 * 支持添加各种RapidoJS包和功能
 */
export class AddCommand {
  /**
   * 注册添加命令
   */
  static register(program: Command): void {
    const addCmd = program
      .command('add')
      .description('添加RapidoJS包和功能')
      .argument('<package>', '要添加的包名或功能')
      .option('--skip-install', '跳过依赖安装')
      .option('--package-manager <pm>', '指定包管理器 (npm|pnpm|yarn)', 'npm')
      .action(async (packageName: string, options: any) => {
        const addCommand = new AddCommand();
        await addCommand.add(packageName, options);
      });

    // 添加子命令
    addCmd
      .command('auth')
      .description('添加认证模块')
      .option('--skip-install', '跳过依赖安装')
      .option('--package-manager <pm>', '指定包管理器', 'npm')
      .action(async (options: any) => {
        const addCommand = new AddCommand();
        await addCommand.add('auth', options);
      });

    addCmd
      .command('config')
      .description('添加配置模块')
      .option('--skip-install', '跳过依赖安装')
      .option('--package-manager <pm>', '指定包管理器', 'npm')
      .action(async (options: any) => {
        const addCommand = new AddCommand();
        await addCommand.add('config', options);
      });

    addCmd
      .command('schedule')
      .description('添加任务调度模块')
      .option('--skip-install', '跳过依赖安装')
      .option('--package-manager <pm>', '指定包管理器', 'npm')
      .action(async (options: any) => {
        const addCommand = new AddCommand();
        await addCommand.add('schedule', options);
      });

    addCmd
      .command('testing')
      .description('添加测试模块')
      .option('--skip-install', '跳过依赖安装')
      .option('--package-manager <pm>', '指定包管理器', 'npm')
      .action(async (options: any) => {
        const addCommand = new AddCommand();
        await addCommand.add('testing', options);
      });
  }

  /**
   * 添加包或功能
   */
  async add(packageName: string, options: any): Promise<void> {
    try {
      console.log(`正在添加 ${packageName}...`);

      // 检查是否在RapidoJS项目中
      if (!this.isRapidoProject()) {
        console.error('❌ 当前目录不是RapidoJS项目');
        console.log('请在RapidoJS项目根目录中运行此命令');
        process.exit(1);
      }

      switch (packageName.toLowerCase()) {
        case 'auth':
        case '@rapidojs/auth':
          await this.addAuth(options);
          break;
        case 'config':
        case '@rapidojs/config':
          await this.addConfig(options);
          break;
        case 'schedule':
        case '@rapidojs/schedule':
          await this.addSchedule(options);
          break;
        case 'testing':
        case '@rapidojs/testing':
          await this.addTesting(options);
          break;
        default:
          // 尝试作为npm包安装
          await this.addNpmPackage(packageName, options);
          break;
      }

      console.log(`✅ ${packageName} 添加成功!`);
    } catch (error) {
      console.error(`❌ 添加失败:`, error);
      process.exit(1);
    }
  }

  /**
   * 检查是否在RapidoJS项目中
   */
  private isRapidoProject(): boolean {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.dependencies && (
        packageJson.dependencies['@rapidojs/core'] ||
        packageJson.dependencies['@rapidojs/common']
      );
    } catch {
      return false;
    }
  }

  /**
   * 添加认证模块
   */
  private async addAuth(options: any): Promise<void> {
    console.log('📦 安装 @rapidojs/auth...');
    
    // 安装依赖
    if (!options.skipInstall) {
      await this.installPackage('@rapidojs/auth', options.packageManager);
    }

    // 创建认证配置文件
    const authConfigPath = path.join(process.cwd(), 'src', 'config', 'auth.config.ts');
    const authConfigContent = `import { AuthConfig } from '@rapidojs/auth';

export const authConfig: AuthConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '1d',
    issuer: 'rapidojs-app'
  },
  bcrypt: {
    saltRounds: 10
  },
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    }
  }
};
`;

    await writeFileEnsureDir(authConfigPath, authConfigContent);
    console.log(`📁 创建配置文件: ${authConfigPath}`);

    // 创建认证服务示例
    const authServicePath = path.join(process.cwd(), 'src', 'auth', 'auth.service.ts');
    const authServiceContent = `import { Injectable } from '@rapidojs/common';
import { AuthService as BaseAuthService, JwtService } from '@rapidojs/auth';

@Injectable()
export class AuthService extends BaseAuthService {
  constructor(private jwtService: JwtService) {
    super();
  }

  /**
   * 用户登录
   */
  async login(email: string, password: string) {
    // TODO: 实现用户验证逻辑
    const user = await this.validateUser(email, password);
    
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user
    };
  }

  /**
   * 验证用户
   */
  private async validateUser(email: string, password: string) {
    // TODO: 从数据库查询用户并验证密码
    // 这里是示例代码
    if (email === 'admin@example.com' && password === 'password') {
      return {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User'
      };
    }
    return null;
  }
}
`;

    await writeFileEnsureDir(authServicePath, authServiceContent);
    console.log(`📁 创建服务文件: ${authServicePath}`);

    console.log('\n🔐 认证模块添加完成!');
    console.log('请在 app.module.ts 中导入 AuthModule:');
    console.log('import { AuthModule } from \'@rapidojs/auth\';');
  }

  /**
   * 添加配置模块
   */
  private async addConfig(options: any): Promise<void> {
    console.log('📦 安装 @rapidojs/config...');
    
    // 安装依赖
    if (!options.skipInstall) {
      await this.installPackage('@rapidojs/config', options.packageManager);
    }

    // 创建配置文件
    const configPath = path.join(process.cwd(), 'src', 'config', 'app.config.ts');
    const configContent = `import { ConfigService } from '@rapidojs/config';

export interface AppConfig {
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export const appConfig = (): AppConfig => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'rapidojs'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  }
});
`;

    await writeFileEnsureDir(configPath, configContent);
    console.log(`📁 创建配置文件: ${configPath}`);

    // 创建环境变量示例文件
    const envExamplePath = path.join(process.cwd(), '.env.example');
    const envExampleContent = `# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=rapidojs

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# 会话配置
SESSION_SECRET=your-session-secret
`;

    if (!fs.existsSync(envExamplePath)) {
      await writeFileEnsureDir(envExamplePath, envExampleContent);
      console.log(`📁 创建环境变量示例: ${envExamplePath}`);
    }

    console.log('\n⚙️ 配置模块添加完成!');
    console.log('请在 app.module.ts 中导入 ConfigModule:');
    console.log('import { ConfigModule } from \'@rapidojs/config\';');
  }

  /**
   * 添加任务调度模块
   */
  private async addSchedule(options: any): Promise<void> {
    console.log('📦 安装 @rapidojs/schedule...');
    
    // 安装依赖
    if (!options.skipInstall) {
      await this.installPackage('@rapidojs/schedule', options.packageManager);
    }

    // 创建任务服务示例
    const taskServicePath = path.join(process.cwd(), 'src', 'tasks', 'task.service.ts');
    const taskServiceContent = `import { Injectable } from '@rapidojs/common';
import { Cron, Interval, Timeout } from '@rapidojs/schedule';

@Injectable()
export class TaskService {
  /**
   * 每天凌晨执行的清理任务
   */
  @Cron('0 0 * * *', { name: 'daily-cleanup' })
  async handleDailyCleanup() {
    console.log('执行每日清理任务...');
    // TODO: 实现清理逻辑
  }

  /**
   * 每5分钟执行的健康检查
   */
  @Interval(5 * 60 * 1000)
  async handleHealthCheck() {
    console.log('执行健康检查...');
    // TODO: 实现健康检查逻辑
  }

  /**
   * 应用启动10秒后执行的初始化任务
   */
  @Timeout(10000)
  async handleStartupTask() {
    console.log('执行启动初始化任务...');
    // TODO: 实现初始化逻辑
  }

  /**
   * 每小时执行的数据同步任务
   */
  @Cron('0 * * * *')
  async handleDataSync() {
    console.log('执行数据同步任务...');
    // TODO: 实现数据同步逻辑
  }
}
`;

    await writeFileEnsureDir(taskServicePath, taskServiceContent);
    console.log(`📁 创建任务服务: ${taskServicePath}`);

    // 创建任务模块
    const taskModulePath = path.join(process.cwd(), 'src', 'tasks', 'task.module.ts');
    const taskModuleContent = `import { Module } from '@rapidojs/common';
import { ScheduleModule } from '@rapidojs/schedule';
import { TaskService } from './task.service.js';

@Module({
  imports: [
    ScheduleModule.forRoot({
      enabled: true,
      timezone: 'Asia/Shanghai',
      enableLogging: true
    })
  ],
  providers: [TaskService]
})
export class TaskModule {}
`;

    await writeFileEnsureDir(taskModulePath, taskModuleContent);
    console.log(`📁 创建任务模块: ${taskModulePath}`);

    console.log('\n⏰ 任务调度模块添加完成!');
    console.log('请在 app.module.ts 中导入 TaskModule:');
    console.log('import { TaskModule } from \'./tasks/task.module.js\';');
  }

  /**
   * 添加测试模块
   */
  private async addTesting(options: any): Promise<void> {
    console.log('📦 安装 @rapidojs/testing...');
    
    // 安装依赖
    if (!options.skipInstall) {
      await this.installPackage('@rapidojs/testing', options.packageManager);
    }

    // 创建测试配置文件
    const vitestConfigPath = path.join(process.cwd(), 'vitest.config.ts');
    if (!fs.existsSync(vitestConfigPath)) {
      const vitestConfigContent = `import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});
`;

      await writeFileEnsureDir(vitestConfigPath, vitestConfigContent);
      console.log(`📁 创建测试配置: ${vitestConfigPath}`);
    }

    // 创建测试设置文件
    const testSetupPath = path.join(process.cwd(), 'src', 'test', 'setup.ts');
    const testSetupContent = `import 'reflect-metadata';
import { beforeAll, afterAll } from 'vitest';

// 全局测试设置
beforeAll(async () => {
  // 测试前的全局设置
  console.log('开始测试...');
});

afterAll(async () => {
  // 测试后的清理工作
  console.log('测试完成');
});
`;

    await writeFileEnsureDir(testSetupPath, testSetupContent);
    console.log(`📁 创建测试设置: ${testSetupPath}`);

    // 创建测试工具文件
    const testUtilsPath = path.join(process.cwd(), 'src', 'test', 'utils.ts');
    const testUtilsContent = `import { TestingModule } from '@rapidojs/testing';

/**
 * 创建测试模块
 */
export async function createTestingModule(metadata: any): Promise<TestingModule> {
  const module = await TestingModule.createTestingModule(metadata).compile();
  return module;
}

/**
 * 模拟HTTP请求
 */
export function createMockRequest(options: any = {}) {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    query: {},
    params: {},
    ...options
  };
}

/**
 * 模拟HTTP响应
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  return res;
}
`;

    await writeFileEnsureDir(testUtilsPath, testUtilsContent);
    console.log(`📁 创建测试工具: ${testUtilsPath}`);

    console.log('\n🧪 测试模块添加完成!');
    console.log('现在可以使用 npm test 运行测试');
  }

  /**
   * 添加npm包
   */
  private async addNpmPackage(packageName: string, options: any): Promise<void> {
    console.log(`📦 安装 ${packageName}...`);
    
    if (!options.skipInstall) {
      await this.installPackage(packageName, options.packageManager);
    }

    console.log(`✅ ${packageName} 安装完成`);
  }

  /**
   * 安装包
   */
  private async installPackage(packageName: string, packageManager: string): Promise<void> {
    try {
      let command: string;
      
      switch (packageManager) {
        case 'pnpm':
          command = `pnpm add ${packageName}`;
          break;
        case 'yarn':
          command = `yarn add ${packageName}`;
          break;
        default:
          command = `npm install ${packageName}`;
          break;
      }

      console.log(`执行: ${command}`);
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    } catch (error) {
      throw new Error(`安装 ${packageName} 失败: ${error}`);
    }
  }
}