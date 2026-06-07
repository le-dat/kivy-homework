import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationStatus, ActorType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

class WebhookCallbackDto {
  @IsString()
  @IsNotEmpty({ message: 'verification_id is required' })
  verification_id: string;

  @IsEnum(VerificationStatus, {
    message:
      'status must be a valid VerificationStatus (e.g. VERIFIED, REJECTED, INCONCLUSIVE)',
  })
  @IsNotEmpty({ message: 'status is required' })
  status: VerificationStatus;

  @IsString()
  @IsOptional()
  reason?: string | null;
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class VerificationWebhookController {
  constructor(private readonly stateMachine: VerificationStateMachine) {}

  @Post('verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Callback endpoint for mock/external verification service',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid state transition or validation error',
  })
  async handleCallback(@Body() dto: WebhookCallbackDto) {
    const reasonText =
      dto.reason ||
      `Mock verification service callback status updated to ${dto.status}`;

    await this.stateMachine.transition(
      dto.verification_id,
      dto.status,
      { type: ActorType.SYSTEM },
      reasonText,
    );

    return { received: true };
  }
}
