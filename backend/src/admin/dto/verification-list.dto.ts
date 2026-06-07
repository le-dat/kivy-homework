import { ApiProperty } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

export class VerificationItemDto {
  @ApiProperty({ example: 'clxyz456' })
  id: string;

  @ApiProperty({ example: 'clxyz123', description: 'Seller user ID' })
  seller_id: string;

  @ApiProperty({ example: 'seller@kivy.com' })
  seller_email: string;

  @ApiProperty({ example: '/uploads/documents/clxyz123-1717000000.pdf' })
  document_url: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;
}
