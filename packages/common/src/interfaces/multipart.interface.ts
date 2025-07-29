/**
 * Multipart 文件上传相关接口定义
 */

/**
 * 表示上传的文件对象
 */
export interface MultipartFile {
  /**
   * 文件字段名
   */
  fieldname: string;

  /**
   * 原始文件名
   */
  filename: string;

  /**
   * 文件编码
   */
  encoding: string;

  /**
   * 文件 MIME 类型
   */
  mimetype: string;

  /**
   * 文件大小（字节）
   */
  size: number;

  /**
   * 文件缓冲区数据
   */
  buffer: Buffer;

  /**
   * 文件流（如果使用流模式）
   */
  file?: NodeJS.ReadableStream;

  /**
   * 文件保存路径（如果已保存到磁盘）
   */
  filepath?: string;
}

/**
 * Multipart 表单数据
 */
export interface MultipartFormData {
  /**
   * 表单字段数据
   */
  fields: Record<string, any>;

  /**
   * 上传的文件
   */
  files: MultipartFile[];
}

/**
 * Multipart 配置选项
 */
export interface MultipartOptions {
  /**
   * 最大文件大小（字节），默认 1MB
   */
  limits?: {
    fileSize?: number;
    files?: number;
    fields?: number;
    fieldNameSize?: number;
    fieldSize?: number;
    headerPairs?: number;
  };

  /**
   * 是否将文件保存到磁盘
   */
  attachFieldsToBody?: boolean;

  /**
   * 文件保存目录
   */
  uploadDir?: string;

  /**
   * 允许的文件类型
   */
  allowedMimeTypes?: string[];

  /**
   * 是否保留文件扩展名
   */
  preserveExtension?: boolean;
}