import { describe, it, expect, beforeEach } from 'vitest';
import { DIContainer } from '../di/container.js';
import { Injectable } from '@rapidojs/common';

// 模拟 ConfigService 类用于测试
@Injectable()
class MockConfigService {
  private configData: Record<string, any>;

  constructor(configData: Record<string, any> = {}) {
    this.configData = configData;
  }

  get(key: string): any {
    // 支持点符号访问嵌套属性，如 'app.port'
    if (key.includes('.')) {
      const keys = key.split('.');
      let current = this.configData;
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return undefined;
        }
      }
      return current;
    }
    return this.configData[key];
  }

  getAll(): Record<string, any> {
    return { ...this.configData };
  }

  has(key: string): boolean {
    return key in this.configData;
  }
}

describe('DIContainer - Provider Override Protection', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  describe('useValue provider protection', () => {
    it('should prevent useClass provider from overriding useValue provider', async () => {
      // 1. 先注册一个 useValue 提供者（模拟 ConfigModule.forRoot() 创建的实例）
      const configuredInstance = new MockConfigService({
        app: { port: 3000, name: 'Test App' },
        database: { host: 'localhost' }
      });

      container.registerProvider({
        provide: MockConfigService,
        useValue: configuredInstance,
      });

      // 2. 尝试注册一个 useClass 提供者（模拟后续模块尝试覆盖）
      container.registerProvider(MockConfigService);

      // 3. 解析应该返回第一个 useValue 实例
      const resolvedInstance = await container.resolve(MockConfigService);

      expect(resolvedInstance).toBe(configuredInstance);
      expect(resolvedInstance.get('app.port')).toBe(3000);
      expect(resolvedInstance.get('app.name')).toBe('Test App');
      expect(resolvedInstance.has('app')).toBe(true);
    });

    it('should prevent useFactory provider from overriding useValue provider', async () => {
      // 1. 先注册一个 useValue 提供者
      const configuredInstance = new MockConfigService({
        debug: true,
        env: 'test'
      });

      container.registerProvider({
        provide: 'CONFIG_SERVICE',
        useValue: configuredInstance,
      });

      // 2. 尝试注册一个 useFactory 提供者
      container.registerProvider({
        provide: 'CONFIG_SERVICE',
        useFactory: () => new MockConfigService({ debug: false, env: 'production' }),
      });

      // 3. 解析应该返回第一个 useValue 实例
      const resolvedInstance = await container.resolve('CONFIG_SERVICE') as MockConfigService;

      expect(resolvedInstance).toBe(configuredInstance);
      expect(resolvedInstance.get('debug')).toBe(true);
      expect(resolvedInstance.get('env')).toBe('test');
    });

    it('should allow useValue provider to override useClass provider', async () => {
      // 1. 先注册一个 useClass 提供者
      container.registerProvider(MockConfigService);

      // 2. 注册一个 useValue 提供者（应该成功覆盖）
      const configuredInstance = new MockConfigService({
        override: true,
        value: 'configured'
      });

      container.registerProvider({
        provide: MockConfigService,
        useValue: configuredInstance,
      });

      // 3. 解析应该返回 useValue 实例
      const resolvedInstance = await container.resolve(MockConfigService);

      expect(resolvedInstance).toBe(configuredInstance);
      expect(resolvedInstance.get('override')).toBe(true);
      expect(resolvedInstance.get('value')).toBe('configured');
    });

    it('should allow useValue provider to override useFactory provider', async () => {
      // 1. 先注册一个 useFactory 提供者
      container.registerProvider({
        provide: 'TEST_SERVICE',
        useFactory: () => new MockConfigService({ factory: true }),
      });

      // 2. 注册一个 useValue 提供者（应该成功覆盖）
      const configuredInstance = new MockConfigService({
        value: true,
        source: 'useValue'
      });

      container.registerProvider({
        provide: 'TEST_SERVICE',
        useValue: configuredInstance,
      });

      // 3. 解析应该返回 useValue 实例
      const resolvedInstance = await container.resolve('TEST_SERVICE') as MockConfigService;

      expect(resolvedInstance).toBe(configuredInstance);
      expect(resolvedInstance.get('value')).toBe(true);
      expect(resolvedInstance.get('source')).toBe('useValue');
    });

    it('should allow multiple useValue providers to override each other', async () => {
      // 1. 注册第一个 useValue 提供者
      const firstInstance = new MockConfigService({ version: 1 });
      container.registerProvider({
        provide: 'VERSION_SERVICE',
        useValue: firstInstance,
      });

      // 2. 注册第二个 useValue 提供者（应该成功覆盖）
      const secondInstance = new MockConfigService({ version: 2 });
      container.registerProvider({
        provide: 'VERSION_SERVICE',
        useValue: secondInstance,
      });

      // 3. 解析应该返回最后一个 useValue 实例
      const resolvedInstance = await container.resolve('VERSION_SERVICE') as MockConfigService;

      expect(resolvedInstance).toBe(secondInstance);
      expect(resolvedInstance.get('version')).toBe(2);
    });
  });

  describe('ConfigService integration scenario', () => {
    it('should simulate the real ConfigModule.forRoot() + DI container scenario', async () => {
      // 模拟 ConfigModule.forRoot() 创建配置好的实例
      const yamlConfigData = {
        app: { name: 'RapidoJS Example API', port: 3000, debug: false },
        database: { host: 'localhost', port: 5432 },
        redis: { host: 'localhost', port: 6379 }
      };

      const configServiceFromModule = new MockConfigService(yamlConfigData);

      // 1. ConfigModule.forRoot() 注册 useValue 提供者
      container.registerProvider({
        provide: MockConfigService,
        useValue: configServiceFromModule,
      });

      // 2. 其他模块尝试注册普通的 useClass 提供者（应该被阻止）
      container.registerProvider(MockConfigService);
      container.registerProvider(MockConfigService); // 多次注册

      // 3. 验证从容器中解析的实例是配置正确的实例
      const resolvedConfigService = await container.resolve(MockConfigService);

      expect(resolvedConfigService).toBe(configServiceFromModule);
      expect(resolvedConfigService.has('app')).toBe(true);
      expect(resolvedConfigService.get('app.port')).toBe(3000);
      expect(resolvedConfigService.get('app.name')).toBe('RapidoJS Example API');
      expect(resolvedConfigService.get('database.host')).toBe('localhost');

      // 4. 验证只有一个实例（通过引用比较）
      const secondResolve = await container.resolve(MockConfigService);
      expect(secondResolve).toBe(resolvedConfigService);
    });

    it('should handle string token providers with same protection', async () => {
      // 使用字符串令牌模拟
      const configValue = { apiKey: 'secret-key', timeout: 30000 };

      // 1. 注册 useValue 提供者
      container.registerProvider({
        provide: 'CONFIG_SERVICE',
        useValue: configValue,
      });

      // 2. 尝试用 useFactory 覆盖（应该被阻止）
      container.registerProvider({
        provide: 'CONFIG_SERVICE',
        useFactory: () => ({ apiKey: 'different-key', timeout: 1000 }),
      });

      // 3. 验证原始值被保护
      const resolvedConfig = await container.resolve('CONFIG_SERVICE') as any;

      expect(resolvedConfig).toBe(configValue);
      expect(resolvedConfig.apiKey).toBe('secret-key');
      expect(resolvedConfig.timeout).toBe(30000);
    });
  });
}); 