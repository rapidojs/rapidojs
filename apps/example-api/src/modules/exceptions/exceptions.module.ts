import { Module } from '@rapidojs/core';
import { ExceptionsController } from './exceptions.controller.js';
import { CustomExceptionFilter } from './custom-exception.filter.js';

@Module({
  controllers: [ExceptionsController],
  providers: [CustomExceptionFilter],
})
export class ExceptionsModule {}
