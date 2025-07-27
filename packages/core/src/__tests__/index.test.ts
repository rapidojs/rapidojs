import { describe, it, expect } from 'vitest';

describe('主导出文件', () => {
  it('应该导出所有核心模块', async () => {
    const coreModule = await import('../index.js');
    
    // 验证关键导出存在
    expect(coreModule.RapidoFactory).toBeDefined();
    expect(typeof coreModule.RapidoFactory.create).toBe('function');
    
    // 验证异常类导出
    expect(coreModule.HttpException).toBeDefined();
    expect(coreModule.BadRequestException).toBeDefined();
    expect(coreModule.UnauthorizedException).toBeDefined();
    expect(coreModule.ForbiddenException).toBeDefined();
    expect(coreModule.NotFoundException).toBeDefined();
    expect(coreModule.InternalServerErrorException).toBeDefined();
    
    // 验证管道导出
    expect(coreModule.ValidationPipe).toBeDefined();
    expect(coreModule.ParseIntPipe).toBeDefined();
    expect(coreModule.ParseFloatPipe).toBeDefined();
    expect(coreModule.ParseBoolPipe).toBeDefined();
    
    // 验证 HTTP 状态枚举
    expect(coreModule.HttpStatus).toBeDefined();
    expect(typeof coreModule.HttpStatus.OK).toBe('number');
    expect(coreModule.HttpStatus.OK).toBe(200);
  });

  it('应该能够创建 Rapido 应用实例', async () => {
    const { RapidoFactory } = await import('../index.js');
    const { Module } = await import('@rapidojs/common');
    
    @Module({})
    class TestModule {}
    
    const app = await RapidoFactory.create(TestModule);
    
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
    expect(typeof app.close).toBe('function');
    
    await app.close();
  });

  it('应该导出的异常类能正常工作', async () => {
    const { BadRequestException, HttpStatus } = await import('../index.js');
    
    const exception = new BadRequestException('Test error');
    
    expect(exception).toBeInstanceOf(Error);
    expect(exception.message).toBe('Test error');
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('应该导出的管道能正常工作', async () => {
    const { ParseIntPipe } = await import('../index.js');
    
    const pipe = new ParseIntPipe();
    
    expect(pipe).toBeDefined();
    expect(typeof pipe.transform).toBe('function');
    
    const result = await pipe.transform('123', {} as any);
    expect(result).toBe(123);
  });
}); 