import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigModule } from '../config.module.js';
import { ConfigService } from '../services/config.service.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigModule DI Integration', () => {
  let tempDir: string;
  let configFilePath: string;

  beforeEach(() => {
    // 创建临时目录和配置文件
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rapidojs-config-test-'));
    configFilePath = path.join(tempDir, 'app.yaml');
    
    // 创建测试配置文件
    const testConfig = `
app:
  name: Test Application
  port: 3000
  debug: true

database:
  host: localhost
  port: 5432
  name: test_db
`;
    fs.writeFileSync(configFilePath, testConfig);
  });

  afterEach(() => {
    // 清理临时文件
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('ConfigModule.forRoot() provider registration', () => {
    it('should create useValue provider with configured ConfigService instance', () => {
      // 1. 使用 ConfigModule.forRoot() 创建动态模块
      const DynamicConfigModule = ConfigModule.forRoot({
        configFilePath: configFilePath,
        ignoreEnvFile: true // 忽略 .env 文件，只测试 YAML 配置
      }) as any;

      // 2. 验证返回的模块结构
      expect(DynamicConfigModule).toBeDefined();
      expect(DynamicConfigModule.providers).toBeDefined();
      expect(Array.isArray(DynamicConfigModule.providers)).toBe(true);
      expect(DynamicConfigModule.providers.length).toBe(1);

      // 3. 验证提供者是 useValue 类型
      const provider = DynamicConfigModule.providers[0];
      expect(provider).toHaveProperty('provide', ConfigService);
      expect(provider).toHaveProperty('useValue');
      expect(provider.useValue).toBeInstanceOf(ConfigService);

      // 4. 验证 ConfigService 实例已正确配置
      const configService = provider.useValue as ConfigService;
      expect(configService.get('app.name')).toBe('Test Application');
      expect(configService.get('app.port')).toBe(3000);
      expect(configService.get('app.debug')).toBe(true);
      expect(configService.get('database.host')).toBe('localhost');
    });

    it('should create different instances for different forRoot() calls', () => {
      // 创建第二个配置文件
      const secondConfigPath = path.join(tempDir, 'app2.yaml');
      const secondConfig = `
app:
  name: Second Application
  port: 4000
  debug: false
`;
      fs.writeFileSync(secondConfigPath, secondConfig);

      // 1. 第一次 forRoot() 调用
      const FirstModule = ConfigModule.forRoot({
        configFilePath: configFilePath,
        ignoreEnvFile: true
      }) as any;

      // 2. 第二次 forRoot() 调用
      const SecondModule = ConfigModule.forRoot({
        configFilePath: secondConfigPath,
        ignoreEnvFile: true
      }) as any;

      // 3. 验证两个模块都有有效的提供者
      expect(FirstModule.providers[0].useValue).toBeInstanceOf(ConfigService);
      expect(SecondModule.providers[0].useValue).toBeInstanceOf(ConfigService);

      // 4. 验证两个实例是不同的
      const firstConfigService = FirstModule.providers[0].useValue as ConfigService;
      const secondConfigService = SecondModule.providers[0].useValue as ConfigService;
      expect(firstConfigService).not.toBe(secondConfigService);

      // 5. 验证各自的配置
      expect(firstConfigService.get('app.name')).toBe('Test Application');
      expect(firstConfigService.get('app.port')).toBe(3000);
      expect(secondConfigService.get('app.name')).toBe('Second Application');
      expect(secondConfigService.get('app.port')).toBe(4000);
    });

    it('should handle missing configuration file gracefully', () => {
      // 1. 使用不存在的配置文件路径
      const nonExistentPath = path.join(tempDir, 'nonexistent.yaml');

      // 2. ConfigModule.forRoot() 应该仍能创建模块
      const DynamicConfigModule = ConfigModule.forRoot({
        configFilePath: nonExistentPath,
        throwOnMissingFile: false,
        ignoreEnvFile: true
      }) as any;

      // 3. 验证模块结构
      expect(DynamicConfigModule.providers).toBeDefined();
      expect(DynamicConfigModule.providers.length).toBe(1);

      // 4. 验证 ConfigService 实例存在但没有 YAML 配置
      const configService = DynamicConfigModule.providers[0].useValue as ConfigService;
      expect(configService).toBeInstanceOf(ConfigService);
      expect(configService.has('app')).toBe(false); // 没有 YAML 配置
      // 注意：由于 ignoreEnvFile: true，环境变量也不会被加载
    });

    it('should preserve ConfigService instance identity', () => {
      // 1. 创建动态模块
      const DynamicConfigModule = ConfigModule.forRoot({
        configFilePath: configFilePath,
        ignoreEnvFile: true
      }) as any;

      // 2. 多次获取提供者中的 ConfigService 实例
      const configService1 = DynamicConfigModule.providers[0].useValue;
      const configService2 = DynamicConfigModule.providers[0].useValue;

      // 3. 验证是同一个实例
      expect(configService1).toBe(configService2);
      expect(configService1.get('app.name')).toBe('Test Application');
    });

    it('should use default options when none provided', () => {
      // 1. 不提供任何选项调用 forRoot()
      const DynamicConfigModule = ConfigModule.forRoot({
        ignoreEnvFile: true
      }) as any;

      // 2. 验证模块结构
      expect(DynamicConfigModule.providers).toBeDefined();
      expect(DynamicConfigModule.providers.length).toBe(1);

      // 3. 验证 ConfigService 实例使用默认配置
      const configService = DynamicConfigModule.providers[0].useValue as ConfigService;
      expect(configService).toBeInstanceOf(ConfigService);
      
      // 应该没有配置，因为 ignoreEnvFile: true
      expect(configService.has('app')).toBe(false);
    });
  });

  describe('Provider registration simulation', () => {
    it('should demonstrate useValue provider protection concept', () => {
      // 这个测试展示了为什么需要 DI 容器的保护机制
      
      // 1. 模拟 ConfigModule.forRoot() 创建的提供者
      const configuredModule = ConfigModule.forRoot({
        configFilePath: configFilePath,
        ignoreEnvFile: true
      }) as any;
      
      const useValueProvider = configuredModule.providers[0];
      const configuredInstance = useValueProvider.useValue as ConfigService;

      // 2. 模拟其他模块可能注册的 useClass 提供者
      const useClassProvider = {
        provide: ConfigService,
        useClass: ConfigService
      };

      // 3. 在没有保护机制的情况下，useClass 会创建新实例
      const newInstance = new useClassProvider.useClass({ ignoreEnvFile: true });

      // 4. 验证问题：新实例没有配置
      expect(configuredInstance.get('app.name')).toBe('Test Application');
      expect(newInstance.get('app.name')).toBeUndefined(); // 没有配置

      // 5. 验证实例不同
      expect(configuredInstance).not.toBe(newInstance);
    });
  });
}); 