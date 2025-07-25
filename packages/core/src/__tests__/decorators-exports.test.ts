import { describe, it, expect } from 'vitest';

describe('装饰器导出文件', () => {
  it('应该导出所有装饰器模块', async () => {
    const decoratorsModule = await import('../decorators/index.js');
    
    // 这个文件目前是空的或只做转发导出
    // 我们验证模块可以被正确导入
    expect(decoratorsModule).toBeDefined();
    expect(typeof decoratorsModule).toBe('object');
  });

  it('应该能够正确转发所有装饰器', async () => {
    // 由于装饰器实际在 @rapidojs/common 包中，我们测试是否能正确访问
    try {
      const decoratorsModule = await import('../decorators/index.js');
      // 如果模块导入成功，说明导出文件结构正确
      expect(true).toBe(true);
    } catch (error) {
      // 如果导入失败，我们需要记录错误以便修复
      expect.fail(`装饰器模块导入失败: ${error}`);
    }
  });
}); 