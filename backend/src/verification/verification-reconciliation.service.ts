import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationStatus, ActorType } from '@prisma/client';

@Injectable()
export class VerificationReconciliationService {
  private readonly logger = new Logger(VerificationReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: VerificationStateMachine,
  ) {}

  // Cron runs every 10 minutes.
  @Cron('0 */10 * * * *')
  async handleReconciliation() {
    this.logger.log('Running verification reconciliation cron job...');
    const processingVerifications = await this.prisma.verification.findMany({
      where: { status: VerificationStatus.PROCESSING },
    });

    if (processingVerifications.length === 0) {
      this.logger.log('No verifications in PROCESSING status to reconcile.');
      return;
    }

    const verificationServiceUrl =
      process.env.VERIFICATION_SERVICE_URL || 'http://localhost:3001';

    for (const ver of processingVerifications) {
      try {
        const response = await fetch(
          `${verificationServiceUrl}/v1/verifications/${ver.id}`,
        );

        if (response.status === 404) {
          this.logger.warn(
            `Verification ${ver.id} not found in mock service (reconciliation got 404).`,
          );
          continue;
        }

        if (!response.ok) {
          this.logger.error(
            `Failed to fetch status for verification ${ver.id}: ${response.statusText}`,
          );
          continue;
        }

        const data = (await response.json()) as {
          id: string;
          status: string;
          documentUrl: string;
        };

        if (data.status !== ver.status) {
          const nextStatus = data.status as VerificationStatus;

          this.logger.log(
            `Reconciliation: Transitioning verification ${ver.id} from ${ver.status} to ${nextStatus}`,
          );

          await this.stateMachine.transition(
            ver.id,
            nextStatus,
            { type: ActorType.SYSTEM },
            `Reconciliation cron synced status from mock service (previous state: ${ver.status})`,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Error reconciling verification ${ver.id}: ${message}`,
        );
      }
    }
  }
}
