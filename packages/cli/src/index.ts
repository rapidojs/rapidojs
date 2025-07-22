#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { NewCommand } from './commands/new.command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取版本号
async function getVersion(): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = await import(packageJsonPath, { assert: { type: 'json' } });
    return packageJson.default.version;
  } catch {
    return '0.1.0';
  }
}

async function main() {
  const program = new Command();
  const version = await getVersion();

  program
    .name('rapido')
    .description(chalk.blue('⚡ RapidoJS CLI - 快速构建高性能 API 应用'))
    .version(version, '-v, --version', '显示版本号');

  // 添加 new 命令
  const newCommand = new NewCommand();
  program.addCommand(newCommand.create());

  program
    .command('generate <type> <name>')
    .alias('g')
    .description('生成代码模板')
    .action((type: string, name: string) => {
      console.log(chalk.green(`生成 ${type}: ${name}`));
      console.log(chalk.yellow('此功能正在开发中...'));
    });

  // 显示帮助信息
  program.on('--help', () => {
    console.log('');
    console.log(chalk.yellow('示例:'));
    console.log('  $ rapido new my-api              # 创建新项目');
    console.log('  $ rapido g controller users     # 生成用户控制器');
    console.log('  $ rapido g service auth          # 生成认证服务');
    console.log('');
    console.log(chalk.cyan('更多信息请访问: https://github.com/rapidojs/rapidojs'));
  });

  // 解析命令行参数
  program.parse();
}

// 处理未捕获的错误
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('未处理的 Promise 拒绝:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('未捕获的异常:'), error);
  process.exit(1);
});

main().catch((error) => {
  console.error(chalk.red('CLI 启动失败:'), error);
  process.exit(1);
});
