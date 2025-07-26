import { Module } from '@rapidojs/common';
import { LifecycleTestController } from './lifecycle-test.controller.js';
import { LifecycleTestService } from './lifecycle-test.service.js';

@Module({
  controllers: [LifecycleTestController],
  providers: [LifecycleTestService],
  exports: [LifecycleTestService]
})
export class LifecycleTestModule {}