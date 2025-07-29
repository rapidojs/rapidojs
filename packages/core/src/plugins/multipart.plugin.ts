import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { MultipartOptions, METADATA_KEY } from '@rapidojs/common';

/**
 * Multipart 插件，用于处理文件上传
 * 集成 @fastify/multipart 插件并提供 RapidoJS 特定的功能
 */
export class MultipartPlugin {
  private static isRegistered = false;

  /**
   * 注册 multipart 插件到 Fastify 实例
   * @param fastify - Fastify 实例
   * @param globalOptions - 全局 multipart 配置选项
   */
  static async register(
    fastify: FastifyInstance,
    globalOptions: MultipartOptions = {}
  ): Promise<void> {
    if (this.isRegistered) {
      return;
    }

    try {
      // 动态导入 @fastify/multipart
      const multipart = await import('@fastify/multipart');
      
      // 默认配置
      const defaultOptions: any = {
        limits: {
          fileSize: 1024 * 1024, // 1MB
          files: 1,
          fields: 10,
          fieldNameSize: 100,
          fieldSize: 1024 * 1024, // 1MB
          headerPairs: 2000
        },
        attachFieldsToBody: true, // 启用自动附加到 body，让 @fastify/multipart 正常工作
        ...globalOptions
      };

      // 注册 multipart 插件，尝试不同的导入方式
      const plugin = multipart.default || multipart;
      await fastify.register(plugin, defaultOptions);

      // 注意：我们不添加全局的 preHandler 钩子，因为这会干扰 @fastify/multipart 的正常工作
      // MultipartPlugin 的处理逻辑将通过装饰器在特定路由上触发

      this.isRegistered = true;
    } catch (error) {
      console.warn('Failed to register @fastify/multipart plugin. Make sure it is installed:', error);
      console.warn('Multipart functionality will be disabled.');
      // 不抛出错误，允许应用程序继续运行
      return;
    }
  }

  /**
   * 获取路由的 multipart 配置选项
   * @param request - Fastify 请求对象
   * @returns multipart 配置选项或 null
   */
  private static getRouteMultipartOptions(request: any): MultipartOptions | null {
    // 从路由上下文中获取控制器和方法信息
    const routeContext = (request as any).routeContext;
    if (!routeContext) {
      return null;
    }

    const { controller, methodName } = routeContext;
    if (!controller || !methodName) {
      return null;
    }

    // 获取方法的 multipart 配置
    const options = Reflect.getMetadata(
      METADATA_KEY.MULTIPART,
      controller,
      methodName
    );

    return options || null;
  }

  /**
   * 检查路由是否有 multipart 参数装饰器
   * @param request - Fastify 请求对象
   * @returns 是否有 multipart 参数
   */
  private static hasMultipartParams(request: any): boolean {
    // 由于 routeContext 在 preHandler 阶段可能还未设置，我们暂时返回 true
    // 让所有 multipart 请求都进行处理，然后在装饰器中进行过滤
    return true;
  }

  /**
   * 处理 multipart 数据
   * @param request - Fastify 请求对象
   * @param options - multipart 配置选项
   */
  private static async processMultipartData(
    request: any,
    options: MultipartOptions
  ): Promise<void> {
    try {
      console.log('🔍 [MultipartPlugin] 开始处理 multipart 数据，isMultipart:', request.isMultipart());
      
      // 检查是否是 multipart 请求
      if (request.isMultipart()) {
        const parts = request.parts();
        const files: any[] = [];
        const fields: Record<string, any> = {};

        for await (const part of parts) {
          console.log('🔍 [MultipartPlugin] 处理 part:', {
            fieldname: part.fieldname,
            filename: part.filename,
            type: part.type,
            file: !!part.file
          });
          
          if (part.type === 'file') {
            // 这是一个文件
            const buffer = await part.toBuffer();
            const file = {
              fieldname: part.fieldname,
              filename: part.filename,
              encoding: part.encoding,
              mimetype: part.mimetype,
              size: buffer.length,
              buffer: buffer,
              toBuffer: async () => buffer
            };

            console.log('🔍 [MultipartPlugin] 处理文件:', {
              fieldname: file.fieldname,
              filename: file.filename,
              mimetype: file.mimetype,
              size: file.size
            });

            // 验证文件类型
            if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
              if (!options.allowedMimeTypes.includes(file.mimetype)) {
                throw new Error(`File type ${file.mimetype} is not allowed`);
              }
            }

            // 验证文件大小
            if (options.limits?.fileSize && file.size > options.limits.fileSize) {
              throw new Error(`File size ${file.size} exceeds limit ${options.limits.fileSize}`);
            }

            files.push(file);
          } else {
            // 这是一个表单字段
            fields[part.fieldname] = part.value;
            console.log('🔍 [MultipartPlugin] 处理字段:', part.fieldname, '=', part.value);
          }
        }

        console.log('🔍 [MultipartPlugin] 处理完成，文件数量:', files.length, '字段数量:', Object.keys(fields).length);

        // 将文件按字段名组织
        const filesByField: Record<string, any> = {};
        files.forEach(file => {
          if (!filesByField[file.fieldname]) {
            filesByField[file.fieldname] = [];
          }
          filesByField[file.fieldname].push(file);
        });
        
        // 如果某个字段只有一个文件，直接赋值文件对象而不是数组
        Object.keys(filesByField).forEach(fieldName => {
          if (filesByField[fieldName].length === 1) {
            filesByField[fieldName] = filesByField[fieldName][0];
          }
        });
        
        // 设置 request.files
        (request as any).files = filesByField;
        console.log('🔍 [MultipartPlugin] 设置 request.files:', Object.keys(filesByField));
        
        // 如果只有一个文件，也设置 request.file
        if (files.length === 1) {
          (request as any).file = files[0];
          console.log('🔍 [MultipartPlugin] 设置 request.file:', files[0].fieldname);
        }

        // 将表单字段设置到 body
        (request as any).body = { ...(request as any).body, ...fields };
        console.log('🔍 [MultipartPlugin] 设置 request.body 字段:', Object.keys(fields));
      }
    } catch (error) {
      console.error('🔍 [MultipartPlugin] 处理失败:', error);
      throw new Error(`Multipart processing failed: ${error}`);
    }
  }

  /**
   * 检查插件是否已注册
   */
  static isPluginRegistered(): boolean {
    return this.isRegistered;
  }
}