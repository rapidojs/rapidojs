import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '../services/config.service.js';
import { ConfigModuleOptions } from '../interfaces/config.interface.js';

describe('ConfigService', () => {
  let configService: ConfigService;
  let tempDir: string;
  let envFile: string;
  let envLocalFile: string;
  let yamlFile: string;

  beforeEach(() => {
    // 创建临时目录
    tempDir = fs.mkdtempSync(path.join(__dirname, 'temp-'));
    envFile = path.join(tempDir, '.env');
    envLocalFile = path.join(tempDir, '.env.local');
    yamlFile = path.join(tempDir, 'config.yaml');
  });

  afterEach(() => {
    // 清理临时文件
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('环境变量加载', () => {
    it('应该加载 .env 文件中的配置', () => {
      fs.writeFileSync(envFile, 'APP_NAME=TestApp\nAPP_PORT=3000\n');
      
      configService = new ConfigService({
        envFilePath: envFile,
        throwOnMissingFile: false,
      });

      expect(configService.get('APP_NAME')).toBe('TestApp');
      expect(configService.get('APP_PORT')).toBe('3000');
    });

    it('应该优先使用 .env.local 文件中的配置', () => {
      fs.writeFileSync(envFile, 'APP_NAME=TestApp\nAPP_PORT=3000\n');
      fs.writeFileSync(envLocalFile, 'APP_PORT=4000\n');
      
      configService = new ConfigService({
        envFilePath: envFile,
        throwOnMissingFile: false,
      });

      expect(configService.get('APP_NAME')).toBe('TestApp');
      expect(configService.get('APP_PORT')).toBe('4000'); // .env.local 优先级更高
    });

    it('应该支持多个 .env 文件', () => {
      const envFile2 = path.join(tempDir, '.env.production');
      fs.writeFileSync(envFile, 'APP_NAME=TestApp\n');
      fs.writeFileSync(envFile2, 'DATABASE_URL=postgres://test\n');
      
      configService = new ConfigService({
        envFilePath: [envFile, envFile2],
        throwOnMissingFile: false,
      });

      expect(configService.get('APP_NAME')).toBe('TestApp');
      expect(configService.get('DATABASE_URL')).toBe('postgres://test');
    });
  });

  describe('YAML 配置文件加载', () => {
    it('应该加载 YAML 配置文件', () => {
      const yamlContent = `
database:
  host: localhost
  port: 5432
  name: testdb

app:
  name: MyApp
  debug: true
      `;
      fs.writeFileSync(yamlFile, yamlContent);
      
      configService = new ConfigService({
        configFilePath: yamlFile,
        ignoreEnvFile: true,
        throwOnMissingFile: false,
      });

      expect(configService.get('database.host')).toBe('localhost');
      expect(configService.get('database.port')).toBe(5432);
      expect(configService.get('app.name')).toBe('MyApp');
      expect(configService.get('app.debug')).toBe(true);
    });

    it('应该支持 JSON 配置文件', () => {
      const jsonFile = path.join(tempDir, 'config.json');
      const jsonContent = {
        server: {
          port: 8080,
          host: '0.0.0.0'
        }
      };
      fs.writeFileSync(jsonFile, JSON.stringify(jsonContent, null, 2));
      
      configService = new ConfigService({
        configFilePath: jsonFile,
        ignoreEnvFile: true,
        throwOnMissingFile: false,
      });

      expect(configService.get('server.port')).toBe(8080);
      expect(configService.get('server.host')).toBe('0.0.0.0');
    });
  });

  describe('配置合并', () => {
    it('应该正确合并环境变量和配置文件', () => {
      fs.writeFileSync(envFile, 'APP_NAME=EnvApp\nAPP_DEBUG=true\n');
      
      const yamlContent = `
app:
  name: YamlApp
  version: 1.0.0
      `;
      fs.writeFileSync(yamlFile, yamlContent);
      
      configService = new ConfigService({
        envFilePath: envFile,
        configFilePath: yamlFile,
        throwOnMissingFile: false,
      });

      // 环境变量应该优先
      expect(configService.get('APP_NAME')).toBe('EnvApp');
      expect(configService.get('APP_DEBUG')).toBe('true');
      
      // YAML 配置应该被合并
      expect(configService.get('app.name')).toBe('YamlApp');
      expect(configService.get('app.version')).toBe('1.0.0');
    });
  });

  describe('自定义配置加载器', () => {
    it('应该支持自定义配置加载器', () => {
      configService = new ConfigService({
        ignoreEnvFile: true,
        load: [
          () => ({
            custom: {
              value: 'from-loader',
              number: 42
            }
          })
        ],
        throwOnMissingFile: false,
      });

      expect(configService.get('custom.value')).toBe('from-loader');
      expect(configService.get('custom.number')).toBe(42);
    });
  });

  describe('API 方法', () => {
    beforeEach(() => {
      fs.writeFileSync(envFile, 'TEST_KEY=test_value\nNUMBER=123\n');
      
      configService = new ConfigService({
        envFilePath: envFile,
        throwOnMissingFile: false,
      });
    });

    it('get() 应该返回正确的值', () => {
      expect(configService.get('TEST_KEY')).toBe('test_value');
      expect(configService.get('NONEXISTENT')).toBeUndefined();
    });

    it('get() 应该支持默认值', () => {
      expect(configService.get('NONEXISTENT', 'default')).toBe('default');
      expect(configService.get('TEST_KEY', 'default')).toBe('test_value');
    });

    it('has() 应该正确检查键是否存在', () => {
      expect(configService.has('TEST_KEY')).toBe(true);
      expect(configService.has('NONEXISTENT')).toBe(false);
    });

    it('set() 应该在内存中设置值', () => {
      configService.set('NEW_KEY', 'new_value');
      expect(configService.get('NEW_KEY')).toBe('new_value');
      expect(configService.has('NEW_KEY')).toBe(true);
    });

    it('getAll() 应该返回所有配置', () => {
      const allConfig = configService.getAll();
      expect(allConfig).toHaveProperty('TEST_KEY', 'test_value');
      expect(allConfig).toHaveProperty('NUMBER', '123');
    });
  });

  describe('错误处理', () => {
    it('在找不到必需文件时应该抛出错误', () => {
      expect(() => {
        new ConfigService({
          envFilePath: '/nonexistent/.env',
          throwOnMissingFile: true,
        });
      }).toThrow('找不到环境配置文件');
    });

    it('在解析无效 YAML 时应该抛出错误', () => {
      fs.writeFileSync(yamlFile, 'invalid: yaml: content: [');
      
      expect(() => {
        new ConfigService({
          configFilePath: yamlFile,
          ignoreEnvFile: true,
          throwOnMissingFile: false,
        });
      }).toThrow('解析配置文件失败');
    });
  });
}); 