import 'reflect-metadata';
import { beforeAll, afterAll } from 'vitest';

// 全局测试设置
beforeAll(async () => {
  // 测试前的全局设置
  console.log('开始调度模块测试...');
});

afterAll(async () => {
  // 测试后的清理工作
  console.log('调度模块测试完成');
});