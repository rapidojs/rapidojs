import { PipeTransform, ArgumentMetadata } from '@rapidojs/core';

/**
 * 全局日志管道示例
 * 记录所有进入控制器方法的参数
 */
export class GlobalLoggingPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    console.log(`[GlobalLoggingPipe] 参数类型: ${metadata.type}, 数据键: ${metadata.data}, 值:`, value);
    
    // 对于敏感信息进行脱敏处理
    if (metadata.type === 'body' && value && typeof value === 'object') {
      const sensitiveFields = ['password', 'token', 'secret'];
      const logValue = { ...value };
      
      sensitiveFields.forEach(field => {
        if (logValue[field]) {
          logValue[field] = '***';
        }
      });
      
      console.log(`[GlobalLoggingPipe] 脱敏后的请求体:`, logValue);
    }
    
    // 返回原始值，不做任何转换
    return value;
  }
} 