import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

// ─── Request ────────────────────────────────────────────────────────────────

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mouse', description: 'Product name' })
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @ApiProperty({
    example: 'Ergonomic wireless mouse with 2.4GHz connection',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 29.99,
    description: 'Price in USD, must be greater than 0',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Price must be a number' })
  @IsPositive({ message: 'Price must be greater than zero' })
  price: number;
}

// ─── Response ───────────────────────────────────────────────────────────────

export class SellerProductResponseDto {
  @ApiProperty({ example: 'clxyz789' })
  id: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  name: string;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiProperty({
    example: false,
    description: 'Visible on marketplace only if seller is verified',
  })
  is_visible: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', required: false })
  created_at?: string;
}
