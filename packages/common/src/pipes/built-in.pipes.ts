import { PipeTransform, ArgumentMetadata } from '../interfaces.js';

/**
 * Built-in pipe that parses string values to integers
 */
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new Error(`Validation failed (numeric string is expected). Received: ${value}`);
    }
    return val;
  }
}

/**
 * Built-in pipe that parses string values to floats
 */
export class ParseFloatPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseFloat(value);
    if (isNaN(val)) {
      throw new Error(`Validation failed (numeric string is expected). Received: ${value}`);
    }
    return val;
  }
}

/**
 * Built-in pipe that parses string values to booleans
 */
export class ParseBoolPipe implements PipeTransform<string, boolean> {
  transform(value: string, metadata: ArgumentMetadata): boolean {
    if (value === 'true' || value === '1') {
      return true;
    }
    if (value === 'false' || value === '0') {
      return false;
    }
    throw new Error(`Validation failed (boolean string is expected). Received: ${value}`);
  }
}

/**
 * Built-in pipe that validates UUIDs
 */
export class ParseUUIDPipe implements PipeTransform<string, string> {
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: string, metadata: ArgumentMetadata): string {
    if (!this.uuidRegex.test(value)) {
      throw new Error(`Validation failed (uuid is expected). Received: ${value}`);
    }
    return value;
  }
}

/**
 * Built-in pipe that validates and transforms array values
 */
export class ParseArrayPipe implements PipeTransform<string, any[]> {
  constructor(private readonly options?: { items?: PipeTransform; separator?: string }) {}

  transform(value: string, metadata: ArgumentMetadata): any[] {
    const separator = this.options?.separator || ',';
    const items = value.split(separator);
    
    if (this.options?.items) {
      return items.map(item => this.options!.items!.transform(item.trim(), metadata));
    }
    
    return items.map(item => item.trim());
  }
} 