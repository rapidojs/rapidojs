/**
 * Multipart 文件上传相关接口定义
 */

/**
 * 上传文件的接口定义
 */
export interface MultipartFile {
  /**
   * 文件名
   */
  filename: string;
  
  /**
   * MIME 类型
   */
  mimetype: string;
  
  /**
   * 编码类型
   */
  encoding: string;
  
  /**
   * 文件缓冲区
   */
  buffer: Buffer;
  
  /**
   * 文件大小（字节）
   */
  size: number;
  
  /**
   * 表单字段名
   */
  fieldname: string;
}

/**
 * Multipart 配置选项
 */
export interface MultipartOptions {
  /**
   * 文件大小限制（字节）
   * @default 1048576 (1MB)
   */
  limits?: {
    /**
     * 单个文件大小限制
     */
    fileSize?: number;
    
    /**
     * 文件数量限制
     */
    files?: number;
    
    /**
     * 字段数量限制
     */
    fields?: number;
    
    /**
     * 字段名长度限制
     */
    fieldNameSize?: number;
    
    /**
     * 字段值长度限制
     */
    fieldSize?: number;
  };
  
  /**
   * 是否抛出文件大小限制错误
   * @default true
   */
  throwFileSizeLimit?: boolean;
  
  /**
   * 允许的文件类型（MIME 类型）
   */
  allowedMimeTypes?: string[];
  
  /**
   * 是否将表单字段附加到请求体
   * @default true
   */
  attachFieldsToBody?: boolean;
}

/**
 * Multipart 字段值类型
 */
export type MultipartValue = string | MultipartFile | MultipartFile[];

/**
 * Multipart 表单数据
 */
export interface MultipartFormData {
  [fieldname: string]: MultipartValue;
}