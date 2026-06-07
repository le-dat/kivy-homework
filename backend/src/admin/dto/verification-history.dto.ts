import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus, ActorType } from '@prisma/client';

export class VerificationEventDto {
  @ApiPropertyOptional({
    enum: VerificationStatus,
    nullable: true,
    example: null,
  })
  from_status: VerificationStatus | null;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  to_status: VerificationStatus;

  @ApiProperty({ enum: ActorType, example: ActorType.SELLER })
  actor_type: ActorType;

  @ApiProperty({ example: 'clxyz123' })
  actor_id: string;

  @ApiPropertyOptional({ example: 'seller@kivy.com', nullable: true })
  actor_email: string | null;

  @ApiPropertyOptional({
    example: 'Document uploaded by seller',
    nullable: true,
  })
  reason: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;
}
