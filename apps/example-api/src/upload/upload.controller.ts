import { Controller, Post, UseMultiPart, UploadedFile, UploadedFiles, Body } from '@rapidojs/common';
import type { MultipartFile } from '@rapidojs/common';

/**
 * 文件上传控制器
 * 演示 RapidoJS v1.1.0 的 Multipart 文件上传功能
 */
@Controller('/upload')
export class UploadController {
  
  /**
   * 单文件上传
   * @param file - 上传的文件
   * @param body - 表单数据
   * @returns 上传结果
   */
  @Post('/single')
  @UseMultiPart({
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 1
    },
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain']
  })
  async uploadSingle(
    @UploadedFile('file') file: MultipartFile,
    @Body() body: any
  ) {
    if (!file) {
      return {
        success: false,
        message: '没有上传文件'
      };
    }

    return {
      success: true,
      message: '文件上传成功',
      file: {
        fieldname: file.fieldname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding
      },
      formData: body
    };
  }

  /**
   * 多文件上传
   * @param files - 上传的文件数组
   * @param body - 表单数据
   * @returns 上传结果
   */
  @Post('/multiple')
  @UseMultiPart({
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 5
    },
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain']
  })
  async uploadMultiple(
    @UploadedFiles('files') files: MultipartFile[],
    @Body() body: any
  ) {
    if (!files || files.length === 0) {
      return {
        success: false,
        message: '没有上传文件'
      };
    }

    return {
      success: true,
      message: `成功上传 ${files.length} 个文件`,
      files: files.map(file => ({
        fieldname: file.fieldname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding
      })),
      formData: body
    };
  }

  /**
   * 混合上传（头像 + 附件）
   * @param avatar - 头像文件
   * @param attachments - 附件文件数组
   * @param body - 表单数据
   * @returns 上传结果
   */
  @Post('/mixed')
  @UseMultiPart({
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 6 // 1个头像 + 5个附件
    }
  })
  async uploadMixed(
    @UploadedFile('avatar') avatar: MultipartFile,
    @UploadedFiles('attachments') attachments: MultipartFile[],
    @Body() body: any
  ) {
    const result: any = {
      success: true,
      message: '文件上传成功',
      formData: body
    };

    if (avatar) {
      result.avatar = {
        fieldname: avatar.fieldname,
        filename: avatar.filename,
        mimetype: avatar.mimetype,
        size: avatar.size,
        encoding: avatar.encoding
      };
    }

    if (attachments && attachments.length > 0) {
      result.attachments = attachments.map(file => ({
        fieldname: file.fieldname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding
      }));
    }

    return result;
  }

  /**
   * 获取所有上传的文件（不指定字段名）
   * @param files - 所有上传的文件
   * @param body - 表单数据
   * @returns 上传结果
   */
  @Post('/any')
  @UseMultiPart({
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 10
    }
  })
  async uploadAny(
    @UploadedFiles() files: MultipartFile[],
    @Body() body: any
  ) {
    return {
      success: true,
      message: `接收到 ${files.length} 个文件`,
      files: files.map(file => ({
        fieldname: file.fieldname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        encoding: file.encoding
      })),
      formData: body
    };
  }
}