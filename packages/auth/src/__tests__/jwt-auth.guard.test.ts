import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { JwtStrategy } from '../strategies/jwt.strategy.js';
import { UnauthorizedException } from '@rapidojs/core';
import { ExecutionContext } from '@rapidojs/common';

// Mocks
const mockJwtStrategy = {
  validate: vi.fn(),
};

const mockRequest = {
  headers: {
    authorization: undefined as string | undefined,
  },
  jwtVerify: vi.fn(),
  user: null,
};

const mockExecutionContext = {
  switchToHttp: () => ({
    getRequest: () => mockRequest,
  }),
} as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new JwtAuthGuard(mockJwtStrategy as unknown as JwtStrategy);
    mockRequest.headers.authorization = undefined;
    mockRequest.user = null;
  });

  it('should throw UnauthorizedException if no auth header', async () => {
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if scheme is not bearer', async () => {
    mockRequest.headers.authorization = 'Basic token';
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if jwtVerify fails', async () => {
    mockRequest.headers.authorization = 'Bearer token';
    mockRequest.jwtVerify.mockRejectedValue(new Error('verify failed'));
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if strategy.validate returns falsy', async () => {
    mockRequest.headers.authorization = 'Bearer token';
    mockRequest.jwtVerify.mockResolvedValue({ sub: '123' });
    mockJwtStrategy.validate.mockResolvedValue(null);
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
  });

  it('should return true and attach user to request on success', async () => {
    const user = { id: '123', name: 'Test User' };
    mockRequest.headers.authorization = 'Bearer token';
    mockRequest.jwtVerify.mockResolvedValue({ sub: '123' });
    mockJwtStrategy.validate.mockResolvedValue(user);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(user);
    expect(mockJwtStrategy.validate).toHaveBeenCalledWith(mockRequest, { sub: '123' });
  });
}); 