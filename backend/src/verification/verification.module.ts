import { Module } from '@nestjs/common';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationWorkerService } from './verification-worker.service';
import { VerificationReconciliationService } from './verification-reconciliation.service';
import { VerificationWebhookController } from './verification-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [VerificationWebhookController],
  providers: [
    VerificationStateMachine,
    VerificationQueueService,
    VerificationWorkerService,
    VerificationReconciliationService,
  ],
  exports: [
    VerificationStateMachine,
    VerificationQueueService,
    VerificationWorkerService,
    VerificationReconciliationService,
  ],
})
export class VerificationModule {}
