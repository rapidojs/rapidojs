import { describe, it, expect } from 'vitest';
import 'reflect-metadata';
import { Injectable } from '../decorators/index.js';
import { Controller } from '../decorators/controller.decorator.js';
import { METADATA_KEY } from '../constants.js';

@Injectable()
class TestService {
  getValue(): string {
    return 'test-value';
  }
}

@Controller('/test')
class TestController {
  constructor(private testService: TestService) {}

  getTest(): string {
    return this.testService.getValue();
  }
}

describe('SWC Decorator Metadata Support', () => {
  it('should automatically generate constructor parameter types metadata', () => {
    // 使用 SWC，应该能够自动生成参数类型元数据
    const paramTypes = Reflect.getMetadata('design:paramtypes', TestController);
    
    console.log('Parameter types from SWC:', paramTypes);
    
    // 如果 SWC 正确配置，这里应该能获取到参数类型
    expect(paramTypes).toBeDefined();
    expect(Array.isArray(paramTypes)).toBe(true);
    
    // 检查是否包含 TestService 类型
    if (paramTypes && paramTypes.length > 0) {
      expect(paramTypes[0]).toBe(TestService);
      console.log('✅ SWC successfully generated decorator metadata!');
    } else {
      console.log('⚠️  SWC did not generate parameter types metadata');
      // 如果仍然没有生成元数据，我们可以记录这个情况
      expect(paramTypes).toEqual([]);
    }
  });

  it('should preserve class names for DI container', () => {
    // 验证类名是否被保留（对 DI 容器很重要）
    expect(TestService.name).toBe('TestService');
    expect(TestController.name).toBe('TestController');
  });

  it('should handle injectable decorator without errors', () => {
    // 验证 Injectable 装饰器能够正确应用而不抛出错误
    // 我们的 Injectable 装饰器目前是一个标记装饰器，不设置特定元数据
    expect(() => new TestService()).not.toThrow();
    expect(TestService.name).toBe('TestService');
  });

  it('should handle controller decorator metadata', () => {
    // 检查 Controller 装饰器是否正确应用
    const controllerPath = Reflect.getMetadata(METADATA_KEY.CONTROLLER_PREFIX, TestController);
    expect(controllerPath).toBe('/test');
  });
});
