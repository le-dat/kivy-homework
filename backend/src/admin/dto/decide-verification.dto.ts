import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client';

// ─── Request ────────────────────────────────────────────────────────────────

export class DecideVerificationDto {
  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED,
    description: 'Decision: APPROVED or REJECTED',
  })
  @IsEnum(VerificationStatus, {
    message: 'Status must be either APPROVED or REJECTED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: VerificationStatus;

  @ApiProperty({
    example: 'All documents are valid and clear.',
    description: 'Required reason for the decision',
  })
  @IsString({ message: 'Reason must be a string' })
  @IsNotEmpty({ message: 'Reason is required' })
  reason: string;
}

// ─── Response ───────────────────────────────────────────────────────────────

export class DecisionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.APPROVED,
  })
  new_status: VerificationStatus;
}
