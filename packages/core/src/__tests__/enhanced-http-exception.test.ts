import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedHttpException, ErrorCodeManager } from '../exceptions/enhanced-http-exception.js';
import { HttpStatus } from '../enums/http-status.enum.js';

describe('Enhanced HTTP Exception', () => {
  beforeEach(() => {
    // 清理错误码管理器
    ErrorCodeManager.clear();
  });

  describe('Basic Exception Creation', () => {
    it('should create exception with message and status', () => {
      const exception = new EnhancedHttpException('Test error', HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe('Test error');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.name).toBe('EnhancedHttpException');
    });

    it('should create exception with response object', () => {
      const response = {
        message: 'Validation failed',
        errors: ['Field is required']
      };
      
      const exception = new EnhancedHttpException(response, HttpStatus.BAD_REQUEST);
      
      expect(exception.message).toBe('Validation failed');
      expect(exception.getResponse()).toEqual(response);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Error Code Management', () => {
    it('should create exception with error code', () => {
      const exception = EnhancedHttpException.withErrorCode(
        'User with ID 123 not found',
        HttpStatus.NOT_FOUND,
        'USER_NOT_FOUND'
      );
      
      expect(exception.getErrorCode()).toBe('USER_NOT_FOUND');
      expect(exception.message).toBe('User with ID 123 not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });

    it('should register and use predefined error codes', () => {
      ErrorCodeManager.register('INVALID_CREDENTIALS', {
        message: 'Invalid username or password',
        status: HttpStatus.UNAUTHORIZED,
        description: 'User provided invalid login credentials'
      });
      
      const exception = ErrorCodeManager.createException('INVALID_CREDENTIALS');
      
      expect(exception.getErrorCode()).toBe('INVALID_CREDENTIALS');
      expect(exception.message).toBe('Invalid username or password');
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('should override predefined error code message', () => {
      ErrorCodeManager.register('RATE_LIMIT_EXCEEDED', {
        message: 'Rate limit exceeded',
        status: HttpStatus.TOO_MANY_REQUESTS
      });
      
      const exception = ErrorCodeManager.createException(
        'RATE_LIMIT_EXCEEDED',
        { message: 'Rate limit exceeded: 100 requests per minute' }
      );
      
      expect(exception.getErrorCode()).toBe('RATE_LIMIT_EXCEEDED');
      expect(exception.message).toBe('Rate limit exceeded');
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('should throw error for unregistered error code', () => {
      expect(() => {
        ErrorCodeManager.createException('UNKNOWN_ERROR');
      }).toThrow('Error code UNKNOWN_ERROR is not registered');
    });

    it('should get error code definition', () => {
      ErrorCodeManager.register('TEST_ERROR', {
        message: 'Test error message',
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        description: 'This is a test error'
      });
      
      const definition = ErrorCodeManager.get('TEST_ERROR');
      
      expect(definition).toBeDefined();
      expect(definition!.message).toBe('Test error message');
      expect(definition!.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(definition!.description).toBe('This is a test error');
    });

    it('should list all registered error codes', () => {
      ErrorCodeManager.register('ERROR_1', {
        message: 'Error 1',
        status: HttpStatus.BAD_REQUEST
      });
      
      ErrorCodeManager.register('ERROR_2', {
        message: 'Error 2',
        status: HttpStatus.NOT_FOUND
      });
      
      const allCodes = ErrorCodeManager.getAllCodes();
      
      expect(allCodes.has('ERROR_1')).toBe(true);
      expect(allCodes.has('ERROR_2')).toBe(true);
      expect(allCodes.get('ERROR_1')!.message).toBe('Error 1');
      expect(allCodes.get('ERROR_2')!.message).toBe('Error 2');
    });
  });

  describe('Exception Chain (Cause)', () => {
    it('should create exception with cause', () => {
      const originalError = new Error('Database connection failed');
      const exception = EnhancedHttpException.withCause(
        'Service unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
        originalError
      );
      
      expect(exception.message).toBe('Service unavailable');
      expect(exception.getCause()).toBe(originalError);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should create exception from existing error', () => {
      const originalError = new Error('Original error message');
      originalError.stack = 'Original stack trace';
      
      const exception = EnhancedHttpException.fromError(
        originalError,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      
      expect(exception.message).toBe('Original error message');
      expect(exception.getCause()).toBe(originalError);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should preserve original stack trace when creating from error', () => {
      const originalError = new Error('Original error');
      const originalStack = originalError.stack;
      
      const exception = EnhancedHttpException.fromError(
        originalError,
        HttpStatus.BAD_REQUEST
      );
      
      expect(exception.stack).toContain('Original error');
      expect(exception.getCause()).toBe(originalError);
    });

    it('should handle nested exception chains', () => {
      const rootError = new Error('Root cause');
      const middleException = EnhancedHttpException.withCause(
        'Middle error',
        HttpStatus.BAD_REQUEST,
        rootError
      );
      const topException = EnhancedHttpException.withCause(
        'Top error',
        HttpStatus.INTERNAL_SERVER_ERROR,
        middleException
      );
      
      expect(topException.message).toBe('Top error');
      expect(topException.getCause()).toBe(middleException);
      expect(middleException.getCause()).toBe(rootError);
    });
  });

  describe('Context Information', () => {
    it('should store and retrieve context information', () => {
      const context = {
        userId: '12345',
        requestId: 'req-abc-123',
        operation: 'updateUser',
        timestamp: new Date().toISOString()
      };
      
      const exception = new EnhancedHttpException(
        'Operation failed',
        HttpStatus.BAD_REQUEST,
        undefined,
        context
      );
      
      expect(exception.getContext()).toEqual(context);
      expect(exception.getContext().userId).toBe('12345');
      expect(exception.getContext().operation).toBe('updateUser');
    });

    it('should add context to existing exception', () => {
      const exception = new EnhancedHttpException(
        'Test error',
        HttpStatus.BAD_REQUEST
      );
      
      exception.addContext('requestId', 'req-123');
      exception.addContext('userId', 'user-456');
      
      const context = exception.getContext();
      expect(context.requestId).toBe('req-123');
      expect(context.userId).toBe('user-456');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON with all information', () => {
      ErrorCodeManager.register('SERIALIZATION_TEST', {
        message: 'Serialization test error',
        status: HttpStatus.BAD_REQUEST
      });
      
      const originalError = new Error('Original cause');
      const exception = ErrorCodeManager.createException('SERIALIZATION_TEST')
        .withCause(originalError)
        .addContext('testKey', 'testValue');
      
      const json = exception.toJSON();
      
      expect(json.message).toBe('Serialization test error');
      expect(json.status).toBe(HttpStatus.BAD_REQUEST);
      expect(json.errorCode).toBe('SERIALIZATION_TEST');
      expect(json.context.testKey).toBe('testValue');
      expect(json.cause).toBeDefined();
      expect(json.cause?.message).toBe('Original cause');
      expect(json.timestamp).toBeDefined();
    });

    it('should handle serialization without optional fields', () => {
      const exception = new EnhancedHttpException(
        'Simple error',
        HttpStatus.NOT_FOUND
      );
      
      const json = exception.toJSON();
      
      expect(json.message).toBe('Simple error');
      expect(json.status).toBe(HttpStatus.NOT_FOUND);
      expect(json.errorCode).toBeUndefined();
      expect(json.cause).toBeUndefined();
      expect(json.context).toEqual({});
    });
  });

  describe('Method Chaining', () => {
    it('should support fluent interface for building exceptions', () => {
      const originalError = new Error('Database error');
      
      const exception = new EnhancedHttpException(
        'Service error',
        HttpStatus.INTERNAL_SERVER_ERROR
      )
        .withCause(originalError)
        .addContext('service', 'UserService')
        .addContext('method', 'createUser')
        .withErrorCode('USER_CREATION_FAILED');
      
      expect(exception.message).toBe('Service error');
      expect(exception.getCause()).toBe(originalError);
      expect(exception.getContext().service).toBe('UserService');
      expect(exception.getContext().method).toBe('createUser');
      expect(exception.getErrorCode()).toBe('USER_CREATION_FAILED');
    });
  });

  describe('Error Code Manager Edge Cases', () => {
    it('should handle duplicate error code registration', () => {
      ErrorCodeManager.register('DUPLICATE_TEST', {
        message: 'First registration',
        status: HttpStatus.BAD_REQUEST
      });
      
      // 第二次注册应该覆盖第一次
      ErrorCodeManager.register('DUPLICATE_TEST', {
        message: 'Second registration',
        status: HttpStatus.CONFLICT
      });
      
      const definition = ErrorCodeManager.getErrorCode('DUPLICATE_TEST');
      expect(definition!.message).toBe('Second registration');
      expect(definition!.status).toBe(HttpStatus.CONFLICT);
    });

    it('should clear all registered error codes', () => {
      ErrorCodeManager.register('CLEAR_TEST_1', {
        message: 'Test 1',
        status: HttpStatus.BAD_REQUEST
      });
      
      ErrorCodeManager.register('CLEAR_TEST_2', {
        message: 'Test 2',
        status: HttpStatus.NOT_FOUND
      });
      
      expect(Object.keys(ErrorCodeManager.getAllErrorCodes())).toHaveLength(2);
      
      ErrorCodeManager.clear();
      
      expect(Object.keys(ErrorCodeManager.getAllErrorCodes())).toHaveLength(0);
    });
  });

  describe('Compatibility with Base HttpException', () => {
    it('should maintain compatibility with base HttpException interface', () => {
      const exception = new EnhancedHttpException(
        'Compatibility test',
        HttpStatus.BAD_REQUEST
      );
      
      // 应该有基础 HttpException 的方法
      expect(typeof exception.getStatus).toBe('function');
      expect(typeof exception.getResponse).toBe('function');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should work with response objects like base HttpException', () => {
      const response = {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Validation failed',
        error: 'Unprocessable Entity'
      };
      
      const exception = new EnhancedHttpException(response, HttpStatus.UNPROCESSABLE_ENTITY);
      
      expect(exception.getResponse()).toEqual(response);
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(exception.message).toBe('Validation failed');
    });
  });
});