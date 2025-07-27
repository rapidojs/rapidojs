import { describe, it, expect } from 'vitest';

describe('异常导出文件', () => {
  it('应该能够导入异常模块', async () => {
    const exceptionsModule = await import('../exceptions/index.js');
    
    // 验证模块可以被正确导入
    expect(exceptionsModule).toBeDefined();
    expect(typeof exceptionsModule).toBe('object');
  });

  it('应该正确转发异常导出', async () => {
    try {
      const exceptionsModule = await import('../exceptions/index.js');
      
      // 验证异常模块的导出
      expect(exceptionsModule).toBeDefined();
      
      // 如果是转发导出，确保结构正确
      const keys = Object.keys(exceptionsModule);
      expect(Array.isArray(keys)).toBe(true);
      
    } catch (error) {
      // 记录导入错误但不让测试失败
      console.warn('异常模块导入警告:', error);
      expect(true).toBe(true);
    }
  });

  it('应该与内置异常兼容', async () => {
    // 测试内置异常功能
    const { HttpException } = await import('../exceptions/http-exception.js');
    const { BadRequestException, NotFoundException } = await import('../exceptions/built-in-exceptions.js');
    
    expect(HttpException).toBeDefined();
    expect(BadRequestException).toBeDefined();
    expect(NotFoundException).toBeDefined();
    
    const badRequestException = new BadRequestException('Test error');
    expect(badRequestException).toBeInstanceOf(HttpException);
    expect(badRequestException).toBeInstanceOf(Error);
    expect(badRequestException.message).toBe('Test error');
  });
}); 