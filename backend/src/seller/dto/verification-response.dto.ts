import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';

// ─── GET /seller/documents/:id ───────────────────────────────────────────────

export class VerificationResponseDto {
  @ApiProperty({ example: 'clxyz456', description: 'Verification request ID' })
  id: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @ApiPropertyOptional({ example: 'Document is unclear', nullable: true })
  reason: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2025-01-02T00:00:00.000Z' })
  updated_at: string;
}

// ─── GET /seller/verification/status ─────────────────────────────────────────

export class LatestVerificationResponseDto {
  @ApiPropertyOptional({
    example: 'clxyz456',
    description: 'Verification ID (null if UNSUBMITTED)',
  })
  id?: string;

  @ApiProperty({
    description:
      'Current verification status or UNSUBMITTED if never submitted',
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus | 'UNSUBMITTED';

  @ApiPropertyOptional({ nullable: true })
  reason: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Rejection reason (same as reason)',
  })
  rejectionReason: string | null;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  created_at?: string;

  @ApiPropertyOptional({ example: '2025-01-02T00:00:00.000Z' })
  updated_at?: string;
}

// ─── POST /seller/documents ──────────────────────────────────────────────────

export class UploadDocumentResponseDto {
  @ApiProperty({
    example: 'clxyz456',
    description: 'Created verification request ID',
  })
  verification_id: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus;
}
