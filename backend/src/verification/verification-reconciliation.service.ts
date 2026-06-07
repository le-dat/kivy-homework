import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationStatus, ActorType } from '@prisma/client';

@Injectable()
export class VerificationReconciliationService {
  private readonly logger = new Logger(VerificationReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: VerificationStateMachine,
    private readonly queueService: VerificationQueueService,
  ) {}

  // Cron runs every 5 minutes.
  @Cron('0 */5 * * * *')
  async handleReconciliation() {
    this.logger.log('Starting verification reconciliation cron job...');

    await Promise.all([
      this.reconcilePendingVerifications(),
      this.reconcileProcessingVerifications(),
    ]);

    this.logger.log('Verification reconciliation cron job completed.');
  }

  /**
   * Identifies verifications stuck in PENDING for too long and re-queues them.
   */
  private async reconcilePendingVerifications() {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stuckPending = await this.prisma.verification.findMany({
        where: {
          status: VerificationStatus.PENDING,
          createdAt: { lt: fiveMinutesAgo },
        },
      });

      if (stuckPending.length === 0) {
        return;
      }

      this.logger.warn(
        `Found ${stuckPending.length} stuck PENDING verifications. Re-queueing...`,
      );

      for (const ver of stuckPending) {
        try {
          await this.queueService.addVerificationJob(ver.id, ver.documentUrl);
          this.logger.log(`Successfully re-queued verification ${ver.id}`);
        } catch (queueErr) {
          const msg =
            queueErr instanceof Error ? queueErr.message : String(queueErr);
          this.logger.error(
            `Failed to re-queue verification ${ver.id}: ${msg}`,
          );
        }
      }
    } catch (pendingErr) {
      const msg =
        pendingErr instanceof Error ? pendingErr.message : String(pendingErr);
      this.logger.error(`Error resolving stuck PENDING verifications: ${msg}`);
    }
  }

  /**
   * Synchronizes verifications in PROCESSING status with the external mock service.
   */
  private async reconcileProcessingVerifications() {
    try {
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
    } catch (procErr) {
      const msg = procErr instanceof Error ? procErr.message : String(procErr);
      this.logger.error(
        `Error fetching PROCESSING verifications from DB: ${msg}`,
      );
    }
  }
}
