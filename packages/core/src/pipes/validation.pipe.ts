import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { PipeTransform, ArgumentMetadata } from './pipe-transform.interface.js';

export interface ValidationPipeOptions {
  /**
   * If set to true, validator will strip validated (returned) object of any properties that do not use any validation decorators.
   */
  whitelist?: boolean;
  
  /**
   * If set to true, instead of stripping non-whitelisted properties validator will throw an exception.
   */
  forbidNonWhitelisted?: boolean;
  
  /**
   * If set to true, attempts to validate unknown objects fail immediately.
   */
  forbidUnknownValues?: boolean;
  
  /**
   * If set to true, class-transformer will attempt to convert primitive types to target type.
   */
  transform?: boolean;
  
  /**
   * If set to true, the validation process will be skipped if the object is not an instance of the target class.
   */
  skipMissingProperties?: boolean;
  
  /**
   * Groups to be used during validation of the object.
   */
  groups?: string[];
  
  /**
   * If set to true, the validation will not use default messages.
   */
  dismissDefaultMessages?: boolean;
  
  /**
   * Settings for the class-transformer.
   */
  transformOptions?: any;
  
  /**
   * Custom error message factory
   */
  errorHttpStatusCode?: number;
  
  /**
   * Expected error message
   */
  expectedType?: string;
}

/**
 * Built-in pipe that validates and transforms objects using class-validator and class-transformer
 */
export class ValidationPipe implements PipeTransform<any> {
  protected isTransformEnabled: boolean;
  protected validatorOptions: ValidationPipeOptions;

  constructor(options?: ValidationPipeOptions) {
    this.validatorOptions = {
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      forbidUnknownValues: false,
      skipMissingProperties: false,
      dismissDefaultMessages: false,
      errorHttpStatusCode: 400,
      ...options,
    };
    this.isTransformEnabled = this.validatorOptions.transform ?? true;
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    if (!metadata.metatype || !this.toValidate(metadata)) {
      return this.isTransformEnabled ? this.transformPrimitive(value, metadata) : value;
    }

    const object = this.isTransformEnabled
      ? plainToClass(metadata.metatype, value, this.validatorOptions.transformOptions)
      : value;

    const errors = await validate(object, this.validatorOptions);
    if (errors.length > 0) {
      throw new ValidationException(this.createErrorMessage(errors));
    }

    return object;
  }

  protected toValidate(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;
    const types = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype as any);
  }

  protected transformPrimitive(value: any, metadata: ArgumentMetadata) {
    if (!metadata.data) {
      // No transformation needed for non-parameterized decorators
      return value;
    }
    
    const { type, metatype } = metadata;
    if (type !== 'param' && type !== 'query') {
      return value;
    }
    
    if (metatype === Boolean) {
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return value;
    }
    
    if (metatype === Number) {
      const numericValue = +value;
      return isNaN(numericValue) ? value : numericValue;
    }
    
    return value;
  }

  protected createErrorMessage(errors: ValidationError[]): string {
    const messages = this.flattenValidationErrors(errors);
    return `Validation failed: ${messages.join(', ')}`;
  }

  protected flattenValidationErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      
      if (error.children && error.children.length > 0) {
        messages.push(...this.flattenValidationErrors(error.children));
      }
    }
    
    return messages;
  }
}

/**
 * Exception thrown when validation fails
 */
export class ValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationException';
  }
}
