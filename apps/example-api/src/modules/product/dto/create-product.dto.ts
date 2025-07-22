import { IsString, IsNumber, IsBoolean, Min, MinLength, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2, { message: 'Product name must be at least 2 characters long' })
  name!: string;

  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a valid number with up to 2 decimal places' })
  @Min(0, { message: 'Price must be a positive number' })
  @Transform(({ value }) => parseFloat(value))
  price!: number;

  @IsString()
  @MinLength(2, { message: 'Category must be at least 2 characters long' })
  category!: string;

  @IsBoolean({ message: 'inStock must be a boolean value' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  inStock!: boolean;

  @IsInt({ message: 'createdBy must be an integer' })
  @Min(1, { message: 'createdBy must be a positive integer' })
  @Transform(({ value }) => parseInt(value, 10))
  createdBy!: number;
}
