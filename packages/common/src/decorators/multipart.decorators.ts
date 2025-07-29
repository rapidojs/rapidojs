import { createParamDecorator } from './param-decorator.factory.js';
import { ParamType } from '../types.js';
import { METADATA_KEY } from '../constants.js';
import { MultipartOptions } from '../multipart.interfaces.js';

/**
 * 启用 Multipart 文件上传的装饰器
 * 应用于控制器方法上，启用该方法的文件上传功能
 * 
 * @param options - Multipart 配置选项
 * @returns MethodDecorator
 * 
 * @example
 * ```typescript
 * @Post('/upload')
 * @UseMultiPart({
 *   limits: {
 *     fileSize: 5 * 1024 * 1024, // 5MB
 *     files: 5
 *   },
 *   allowedMimeTypes: ['image/jpeg', 'image/png']
 * })
 * async uploadFile(@UploadedFile() file: MultipartFile) {
 *   return { filename: file.filename, size: file.size };
 * }
 * ```
 */
export function UseMultiPart(options?: MultipartOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol | undefined, descriptor: PropertyDescriptor) => {
    if (propertyKey) {
      // 设置 multipart 元数据
      Reflect.defineMetadata(
        METADATA_KEY.MULTIPART,
        options || {},
        target.constructor,
        propertyKey
      );
    }
  };
}

/**
 * 注入单个上传文件的参数装饰器
 * 
 * @param fieldname - 表单字段名，如果不指定则获取第一个文件
 * @returns ParameterDecorator
 * 
 * @example
 * ```typescript
 * @Post('/upload')
 * @UseMultiPart()
 * async uploadFile(@UploadedFile('avatar') file: MultipartFile) {
 *   return { filename: file.filename, size: file.size };
 * }
 * ```
 */
export const UploadedFile = createParamDecorator(
  (fieldname: unknown, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    
    if (!files) {
      return null;
    }
    
    if (fieldname) {
      // 获取指定字段名的文件
      return files[fieldname as string] || null;
    }
    
    // 如果没有指定字段名，返回第一个文件
    const fileKeys = Object.keys(files);
    if (fileKeys.length > 0) {
      const firstFile = files[fileKeys[0]];
      return Array.isArray(firstFile) ? firstFile[0] : firstFile;
    }
    
    return null;
  },
  ParamType.UPLOADED_FILE
);

/**
 * 注入多个上传文件的参数装饰器
 * 
 * @param fieldname - 表单字段名，如果不指定则获取所有文件
 * @returns ParameterDecorator
 * 
 * @example
 * ```typescript
 * @Post('/upload-multiple')
 * @UseMultiPart()
 * async uploadFiles(@UploadedFiles('photos') files: MultipartFile[]) {
 *   return files.map(file => ({ filename: file.filename, size: file.size }));
 * }
 * ```
 */
export const UploadedFiles = createParamDecorator(
  (fieldname: unknown, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const files = request.files;
    
    if (!files) {
      return [];
    }
    
    if (fieldname) {
      // 获取指定字段名的文件数组
      const fieldFiles = files[fieldname as string];
      if (!fieldFiles) {
        return [];
      }
      return Array.isArray(fieldFiles) ? fieldFiles : [fieldFiles];
    }
    
    // 如果没有指定字段名，返回所有文件
    const allFiles: any[] = [];
    Object.values(files).forEach(fileOrFiles => {
      if (Array.isArray(fileOrFiles)) {
        allFiles.push(...fileOrFiles);
      } else {
        allFiles.push(fileOrFiles);
      }
    });
    
    return allFiles;
  },
  ParamType.UPLOADED_FILES
);