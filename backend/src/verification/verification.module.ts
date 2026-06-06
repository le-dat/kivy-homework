import { Module } from '@nestjs/common';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationWorkerService } from './verification-worker.service';

@Module({
  providers: [
    VerificationStateMachine,
    VerificationQueueService,
    VerificationWorkerService,
  ],
  exports: [
    VerificationStateMachine,
    VerificationQueueService,
    VerificationWorkerService,
  ],
})
export class VerificationModule {}
