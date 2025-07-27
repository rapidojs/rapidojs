import 'reflect-metadata';
import { beforeAll, afterAll } from 'vitest';
import { container } from 'tsyringe';

// 全局测试设置
beforeAll(async () => {
  // 测试前的全局设置
});

afterAll(async () => {
  // 清理 DI 容器
  container.clearInstances();
});