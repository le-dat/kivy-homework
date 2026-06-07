import { ApiProperty } from '@nestjs/swagger';

export class MetricsResponseDto {
  @ApiProperty({
    example: 3,
    description: 'Total PENDING + INCONCLUSIVE verifications awaiting review',
  })
  pending: number;

  @ApiProperty({
    example: 12,
    description: 'Total VERIFIED + APPROVED verifications',
  })
  verifiedCount: number;

  @ApiProperty({
    example: 2,
    description: 'Total REJECTED verifications',
  })
  rejectedCount: number;
}
