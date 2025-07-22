import { Injectable } from '@rapidojs/core';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  // Mock user database
  private users: (AuthUser & { password: string })[] = [
    {
      id: 1,
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      password: 'admin123', // In real app, this would be hashed
    },
    {
      id: 2,
      email: 'user@example.com',
      name: 'Regular User',
      role: 'user',
      password: 'user123', // In real app, this would be hashed
    },
  ];

  async login(credentials: LoginCredentials): Promise<AuthResponse | null> {
    const user = this.users.find(
      u => u.email === credentials.email && u.password === credentials.password
    );

    if (!user) {
      return null;
    }

    // Generate a mock JWT token (in real app, use proper JWT library)
    const token = this.generateMockToken(user);
    const expiresIn = 3600; // 1 hour

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
      expiresIn,
    };
  }

  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      // Mock token validation (in real app, verify JWT)
      const payload = this.decodeMockToken(token);
      const user = this.users.find(u => u.id === payload.userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch {
      return null;
    }
  }

  async refreshToken(oldToken: string): Promise<string | null> {
    const user = await this.validateToken(oldToken);
    if (!user) {
      return null;
    }

    return this.generateMockToken(user);
  }

  private generateMockToken(user: AuthUser): string {
    // Mock JWT token generation (in real app, use proper JWT library)
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Date.now(),
      exp: Date.now() + 3600 * 1000, // 1 hour
    };

    return `mock.jwt.${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
  }

  private decodeMockToken(token: string): any {
    // Mock JWT token decoding (in real app, use proper JWT library)
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'mock' || parts[1] !== 'jwt') {
      throw new Error('Invalid token format');
    }

    const payload = JSON.parse(Buffer.from(parts[2], 'base64').toString());
    
    if (payload.exp < Date.now()) {
      throw new Error('Token expired');
    }

    return payload;
  }
}
