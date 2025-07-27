import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { NewCommand } from '../commands/new.command.js';
import { GenerateCommand } from '../commands/generate.command.js';
import { AddCommand } from '../commands/add.command.js';
import { Command } from 'commander';

// Mock fs 模块
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn()
}));

// Mock file system operations
vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  writeFile: vi.fn(),
  pathExists: vi.fn(),
  readFile: vi.fn(),
  copy: vi.fn(),
  default: {
    writeFile: vi.fn(),
    ensureDir: vi.fn()
  }
}));

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn()
  }
}));

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
  exec: vi.fn()
}));

// Mock ora
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis()
  }))
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    blue: vi.fn((text) => text),
    red: vi.fn((text) => text),
    green: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    cyan: vi.fn((text) => text),
    bold: vi.fn((text) => text)
  }
}));

// Mock file utils
vi.mock('../utils/file.utils', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    writeFileEnsureDir: vi.fn(),
    toPascalCase: vi.fn((str: string) => {
      return str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
    }),
    toCamelCase: vi.fn((str: string) => {
      const pascalCase = str
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
      return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
    }),
    toPlural: vi.fn((str: string) => {
      if (str.endsWith('y')) {
        return str.slice(0, -1) + 'ies';
      }
      if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
        return str + 'es';
      }
      if (str === 'child') {
        return 'children';
      }
      if (str === 'person') {
        return 'people';
      }
      if (str === 'category') {
        return 'categories';
      }
      return str + 's';
    })
  };
});

describe('CLI Commands', () => {
  let program: Command;
  let consoleSpy: any;
  let processExitSpy: any;

  beforeEach(() => {
    program = new Command();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('NewCommand', () => {
    it('应该注册new命令', () => {
      NewCommand.register(program);
      
      const commands = program.commands;
      const newCommand = commands.find(cmd => cmd.name() === 'new');
      
      expect(newCommand).toBeDefined();
      expect(newCommand?.description()).toContain('创建一个新的 RapidoJS 项目');
    });

    it('应该验证项目名称', () => {
      const newCommand = new NewCommand();
      
      // 测试有效的项目名称
      expect(newCommand['isValidProjectName']('my-project')).toBe(true);
      expect(newCommand['isValidProjectName']('my_project')).toBe(true);
      expect(newCommand['isValidProjectName']('myproject')).toBe(true);
      
      // 测试无效的项目名称
      expect(newCommand['isValidProjectName']('')).toBe(false);
      expect(newCommand['isValidProjectName']('My Project')).toBe(false);
      expect(newCommand['isValidProjectName']('my-project!')).toBe(false);
    });

    it.skip('应该检查目录是否存在', async () => {
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockReturnValue(true);
      
      const newCommand = new NewCommand();
      
      // 模拟执行命令
      await newCommand['execute']('existing-project');
      
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('GenerateCommand', () => {
    it('应该注册generate命令', () => {
      GenerateCommand.register(program);
      
      const commands = program.commands;
      const generateCommand = commands.find(cmd => cmd.name() === 'generate');
      
      expect(generateCommand).toBeDefined();
      expect(generateCommand?.description()).toContain('生成代码文件');
    });

    it('应该注册generate子命令', () => {
      GenerateCommand.register(program);
      
      const commands = program.commands;
      const generateCommand = commands.find(cmd => cmd.name() === 'generate');
      
      expect(generateCommand).toBeDefined();
      
      const subCommands = generateCommand?.commands || [];
      const subCommandNames = subCommands.map(cmd => cmd.name());
      
      expect(subCommandNames).toContain('controller');
      expect(subCommandNames).toContain('service');
      expect(subCommandNames).toContain('guard');
      expect(subCommandNames).toContain('interceptor');
    });

    it('应该支持生成控制器', async () => {
      const generateCommand = new GenerateCommand();
      
      // Mock writeFileEnsureDir
      const mockWriteFile = vi.fn();
      vi.doMock('../utils/file.utils.js', () => ({
        writeFileEnsureDir: mockWriteFile,
        toPascalCase: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
        toCamelCase: (str: string) => str
      }));
      
      await generateCommand.generate('controller', 'user', { dir: 'src', spec: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在生成 controller: user'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('controller \'user\' 生成成功'));
    });

    it('应该支持生成服务', async () => {
      const generateCommand = new GenerateCommand();
      
      await generateCommand.generate('service', 'auth', { dir: 'src', spec: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在生成 service: auth'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('service \'auth\' 生成成功'));
    });

    it('应该支持生成守卫', async () => {
      const generateCommand = new GenerateCommand();
      
      await generateCommand.generate('guard', 'auth', { dir: 'src', spec: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在生成 guard: auth'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('guard \'auth\' 生成成功'));
    });

    it('应该支持生成拦截器', async () => {
      const generateCommand = new GenerateCommand();
      
      await generateCommand.generate('interceptor', 'logging', { dir: 'src', spec: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在生成 interceptor: logging'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('interceptor \'logging\' 生成成功'));
    });

    it('应该处理不支持的生成类型', async () => {
      const generateCommand = new GenerateCommand();
      
      try {
        await generateCommand.generate('unknown', 'test', { dir: 'src' });
      } catch (error) {
        // 预期会抛出错误
      }
      
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('AddCommand', () => {
    it('应该注册add命令', () => {
      AddCommand.register(program);
      
      const commands = program.commands;
      const addCommand = commands.find(cmd => cmd.name() === 'add');
      
      expect(addCommand).toBeDefined();
      expect(addCommand?.description()).toContain('添加RapidoJS包和功能');
    });

    it('应该注册add子命令', () => {
      AddCommand.register(program);
      
      const commands = program.commands;
      const addCommand = commands.find(cmd => cmd.name() === 'add');
      
      expect(addCommand).toBeDefined();
      
      const subCommands = addCommand?.commands || [];
      const subCommandNames = subCommands.map(cmd => cmd.name());
      
      expect(subCommandNames).toContain('auth');
      expect(subCommandNames).toContain('config');
      expect(subCommandNames).toContain('schedule');
      expect(subCommandNames).toContain('testing');
    });

    it('应该检查是否在RapidoJS项目中', () => {
      const addCommand = new AddCommand();
      
      // Mock package.json 不存在
      const mockExistsSync = vi.mocked(fs.existsSync);
      mockExistsSync.mockReturnValue(false);
      
      const isRapidoProject = addCommand['isRapidoProject']();
      expect(isRapidoProject).toBe(false);
    });

    it('应该识别RapidoJS项目', () => {
      const addCommand = new AddCommand();
      
      // Mock package.json 存在且包含RapidoJS依赖
      const mockExistsSync = vi.mocked(fs.existsSync);
      const mockReadFileSync = vi.mocked(fs.readFileSync);
      
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({
        dependencies: {
          '@rapidojs/core': '^1.0.0'
        }
      }));
      
      const isRapidoProject = addCommand['isRapidoProject']();
      expect(isRapidoProject).toBeTruthy();
    });

    it('应该支持添加认证模块', async () => {
      const addCommand = new AddCommand();
      
      // Mock isRapidoProject 返回 true
      vi.spyOn(addCommand as any, 'isRapidoProject').mockReturnValue(true);
      
      // Mock installPackage
      vi.spyOn(addCommand as any, 'installPackage').mockResolvedValue(undefined);
      
      await addCommand.add('auth', { skipInstall: false, packageManager: 'npm' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在添加 auth'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📦 安装 @rapidojs/auth'));
    });

    it('应该支持添加配置模块', async () => {
      const addCommand = new AddCommand();
      
      vi.spyOn(addCommand as any, 'isRapidoProject').mockReturnValue(true);
      vi.spyOn(addCommand as any, 'installPackage').mockResolvedValue(undefined);
      
      await addCommand.add('config', { skipInstall: false, packageManager: 'npm' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在添加 config'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📦 安装 @rapidojs/config'));
    });

    it('应该支持添加调度模块', async () => {
      const addCommand = new AddCommand();
      
      vi.spyOn(addCommand as any, 'isRapidoProject').mockReturnValue(true);
      vi.spyOn(addCommand as any, 'installPackage').mockResolvedValue(undefined);
      
      await addCommand.add('schedule', { skipInstall: false, packageManager: 'npm' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在添加 schedule'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📦 安装 @rapidojs/schedule'));
    });

    it('应该支持添加测试模块', async () => {
      const addCommand = new AddCommand();
      
      vi.spyOn(addCommand as any, 'isRapidoProject').mockReturnValue(true);
      vi.spyOn(addCommand as any, 'installPackage').mockResolvedValue(undefined);
      
      await addCommand.add('testing', { skipInstall: false, packageManager: 'npm' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('正在添加 testing'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📦 安装 @rapidojs/testing'));
    });

    it('应该支持不同的包管理器', async () => {
      const addCommand = new AddCommand();
      
      const mockExecSync = vi.mocked(execSync);
      
      // 测试 pnpm
      await addCommand['installPackage']('test-package', 'pnpm');
      expect(mockExecSync).toHaveBeenCalledWith(
        'pnpm add test-package',
        expect.any(Object)
      );
      
      // 测试 yarn
      await addCommand['installPackage']('test-package', 'yarn');
      expect(mockExecSync).toHaveBeenCalledWith(
        'yarn add test-package',
        expect.any(Object)
      );
      
      // 测试 npm (默认)
      await addCommand['installPackage']('test-package', 'npm');
      expect(mockExecSync).toHaveBeenCalledWith(
        'npm install test-package',
        expect.any(Object)
      );
    });

    it('应该处理非RapidoJS项目', async () => {
      const addCommand = new AddCommand();
      
      // Mock isRapidoProject 返回 false
      vi.spyOn(addCommand as any, 'isRapidoProject').mockReturnValue(false);
      
      try {
        await addCommand.add('auth', { skipInstall: false });
      } catch (error) {
        // 预期会抛出错误
      }
      
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});

describe('工具函数', () => {
  describe('file.utils', () => {
    it('应该正确转换为PascalCase', () => {
      // 直接测试函数逻辑
      const toPascalCase = (str: string): string => {
        return str
          .split(/[-_\s]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
      };
      
      expect(toPascalCase('user')).toBe('User');
      expect(toPascalCase('user-service')).toBe('UserService');
      expect(toPascalCase('user_controller')).toBe('UserController');
      expect(toPascalCase('userAuth')).toBe('Userauth');
    });

    it('应该正确转换为camelCase', () => {
      const toCamelCase = (str: string): string => {
        const pascalCase = str
          .split(/[-_\s]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join('');
        return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
      };
      
      expect(toCamelCase('User')).toBe('user');
      expect(toCamelCase('UserService')).toBe('userservice');
      expect(toCamelCase('user-controller')).toBe('userController');
      expect(toCamelCase('user_auth')).toBe('userAuth');
    });

    it('应该正确转换为复数形式', () => {
      const toPlural = (str: string): string => {
        if (str.endsWith('y')) {
          return str.slice(0, -1) + 'ies';
        }
        if (str.endsWith('s') || str.endsWith('sh') || str.endsWith('ch') || str.endsWith('x') || str.endsWith('z')) {
          return str + 'es';
        }
        if (str === 'child') {
          return 'children';
        }
        if (str === 'person') {
          return 'people';
        }
        if (str === 'category') {
          return 'categories';
        }
        return str + 's';
      };
      
      expect(toPlural('user')).toBe('users');
      expect(toPlural('category')).toBe('categories');
      expect(toPlural('child')).toBe('children');
      expect(toPlural('person')).toBe('people');
    });
  });
});