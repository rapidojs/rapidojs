import 'reflect-metadata';
import { beforeAll, afterAll } from 'vitest';

// 全局测试设置
beforeAll(async () => {
  // 测试前的全局设置
  console.log('开始CLI测试...');
});

afterAll(async () => {
  // 测试后的清理工作
  console.log('CLI测试完成');
});

// 抑制console.log输出以保持测试输出清洁
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = () => {};
  console.error = () => {};
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});