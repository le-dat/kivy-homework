import { Module } from '@nestjs/common';
import { VerificationStateMachine } from './verification-state-machine.service';

@Module({
  providers: [VerificationStateMachine],
  exports: [VerificationStateMachine],
})
export class VerificationModule {}
