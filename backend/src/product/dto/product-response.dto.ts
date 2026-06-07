import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicProductDto {
  @ApiProperty({ example: 'clxyz789' })
  id: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  name: string;

  @ApiPropertyOptional({ example: 'Ergonomic wireless mouse', nullable: true })
  description: string | null;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiProperty({
    example: 'seller@kivy.com',
    description: 'Seller email address',
  })
  seller_name: string;
}
