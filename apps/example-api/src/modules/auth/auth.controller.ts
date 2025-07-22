import { Controller, Post, Get, Body, Headers } from '@rapidojs/core';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  async login(@Body() loginDto: LoginDto) {
    const authResponse = await this.authService.login(loginDto);
    
    if (!authResponse) {
      return {
        success: false,
        error: 'Invalid email or password',
        statusCode: 401,
      };
    }

    return {
      success: true,
      data: authResponse,
      message: 'Login successful',
    };
  }

  @Post('/refresh')
  async refreshToken(@Headers('authorization') authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Authorization header is required',
        statusCode: 401,
      };
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix
    const newToken = await this.authService.refreshToken(token);
    
    if (!newToken) {
      return {
        success: false,
        error: 'Invalid or expired token',
        statusCode: 401,
      };
    }

    return {
      success: true,
      data: {
        token: newToken,
        expiresIn: 3600,
      },
      message: 'Token refreshed successfully',
    };
  }

  @Get('/profile')
  async getProfile(@Headers('authorization') authorization?: string) {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Authorization header is required',
        statusCode: 401,
      };
    }

    const token = authorization.substring(7); // Remove 'Bearer ' prefix
    const user = await this.authService.validateToken(token);
    
    if (!user) {
      return {
        success: false,
        error: 'Invalid or expired token',
        statusCode: 401,
      };
    }

    return {
      success: true,
      data: user,
      message: 'Profile retrieved successfully',
    };
  }

  @Get('/demo-users')
  getDemoUsers() {
    return {
      success: true,
      data: [
        {
          email: 'admin@example.com',
          password: 'admin123',
          role: 'admin',
          note: 'Demo admin user',
        },
        {
          email: 'user@example.com',
          password: 'user123',
          role: 'user',
          note: 'Demo regular user',
        },
      ],
      message: 'Demo users for testing (remove in production!)',
    };
  }
}
