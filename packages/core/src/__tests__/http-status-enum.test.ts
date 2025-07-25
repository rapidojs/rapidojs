import { describe, it, expect } from 'vitest';
import { HttpStatus } from '../enums/http-status.enum.js';

describe('HTTP 状态枚举', () => {
  describe('基本功能', () => {
    it('应该定义为对象', () => {
      expect(typeof HttpStatus).toBe('object');
      expect(HttpStatus).toBeDefined();
    });

    it('应该是枚举类型', () => {
      // 检查枚举是否正确定义
      expect(HttpStatus.OK).toBeDefined();
      expect(typeof HttpStatus.OK).toBe('number');
    });
  });

  describe('重新导出验证', () => {
    it('应该正确重新导出 HttpStatus', () => {
      // 验证重新导出的枚举包含预期的值
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });

    it('应该包含常用状态码', () => {
      const commonCodes = [
        HttpStatus.OK,
        HttpStatus.CREATED,
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.INTERNAL_SERVER_ERROR
      ];

      commonCodes.forEach(code => {
        expect(typeof code).toBe('number');
        expect(code).toBeGreaterThan(0);
        expect(code).toBeLessThan(600);
      });
    });
  });

  describe('状态码分类', () => {
    it('应该能够按类别检查状态码', () => {
      // 验证不同类别的状态码
      expect(HttpStatus.OK >= 200 && HttpStatus.OK < 300).toBe(true);
      expect(HttpStatus.NOT_FOUND >= 400 && HttpStatus.NOT_FOUND < 500).toBe(true);
      expect(HttpStatus.INTERNAL_SERVER_ERROR >= 500 && HttpStatus.INTERNAL_SERVER_ERROR < 600).toBe(true);
    });
  });

  describe('枚举完整性', () => {
    it('应该包含足够数量的状态码', () => {
      const statusCodes = Object.values(HttpStatus);
      expect(statusCodes.length).toBeGreaterThan(10); // 至少包含基本的状态码
    });

    it('应该正确重新导出', () => {
      // 验证重新导出的功能性
      expect(HttpStatus).toBeDefined();
      expect(typeof HttpStatus.OK).toBe('number');
      expect(typeof HttpStatus.NOT_FOUND).toBe('number');
    });
  });
}); 