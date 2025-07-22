import 'reflect-metadata';
import { Module } from '@rapidojs/core';
import { ConfigController } from './config.controller.js';

@Module({
  controllers: [ConfigController],
  providers: [],
})
export class ConfigDemoModule {} 