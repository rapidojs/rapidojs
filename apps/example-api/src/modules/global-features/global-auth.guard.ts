import { CanActivate, ExecutionContext } from '@rapidojs/common';

/**
 * 全局认证守卫示例
 * 验证请求头中的 Authorization 令牌
 */
export class GlobalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // 跳过不需要认证的端点
    const publicEndpoints = ['/health', '/', '/auth/login'];
    if (publicEndpoints.includes(request.url)) {
      return true;
    }
    
    const authHeader = request.headers.authorization;
    
    // 简单的令牌验证逻辑
    if (!authHeader) {
      console.log('请求被拒绝: 缺少 Authorization 头');
      return false;
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('请求被拒绝: Authorization 头格式错误');
      return false;
    }
    
    const token = authHeader.substring(7);
    
    // 这里可以添加更复杂的令牌验证逻辑
    // 比如 JWT 验证、数据库查询等
    if (token === 'valid-api-key') {
      console.log('请求通过认证:', request.method, request.url);
      return true;
    }
    
    console.log('请求被拒绝: 无效的令牌');
    return false;
  }
} 