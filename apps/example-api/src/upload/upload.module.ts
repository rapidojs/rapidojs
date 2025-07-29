import { Module } from '@rapidojs/common';
import { UploadController } from './upload.controller.js';

/**
 * 文件上传模块
 * 提供文件上传相关的功能
 */
@Module({
  controllers: [UploadController]
})
export class UploadModule {}