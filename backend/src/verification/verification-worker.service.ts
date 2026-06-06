/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationStatus, ActorType } from '@prisma/client';

@Injectable()
export class VerificationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private worker: Worker;
  private readonly logger = new Logger(VerificationWorkerService.name);

  constructor(private readonly stateMachine: VerificationStateMachine) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    let connection: any;

    if (redisUrl) {
      const parsed = new URL(redisUrl);
      connection = {
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
      };
    } else {
      connection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      };
    }

    const mockServiceUrl =
      process.env.MOCK_VERIFICATION_SERVICE_URL || 'http://localhost:3001';
    const callbackUrl =
      process.env.BACKEND_WEBHOOK_URL ||
      'http://localhost:5000/api/v1/webhooks/verification';

    this.worker = new Worker(
      'verification-queue',
      async (job: Job<{ verificationId: string; documentUrl: string }>) => {
        const { verificationId, documentUrl } = job.data;
        this.logger.log(
          `Processing job ${job.id} for verificationId: ${verificationId}`,
        );

        try {
          const response = await fetch(`${mockServiceUrl}/v1/verifications`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              document_url: documentUrl,
              callback_url: callbackUrl,
            }),
          });

          if (response.status === 429) {
            this.logger.warn(
              `Rate limit hit (429) for job ${job.id}. Triggering retry backoff.`,
            );
            throw new Error(`Rate limit hit (429)`);
          }

          if (!response.ok) {
            const body = await response.text();
            this.logger.error(
              `API returned error status ${response.status} for job ${job.id}: ${body}`,
            );
            throw new Error(`API returned error status ${response.status}`);
          }

          const result = (await response.json()) as unknown;
          this.logger.log(
            `Verification job ${job.id} submitted successfully to mock service: ${JSON.stringify(result)}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(`Failed to process job ${job.id}: ${errorMessage}`);
          throw error; // Re-throw to let BullMQ handle the retry/failure state
        }
      },
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        connection: connection as any,
        concurrency: 5,
        limiter: {
          max: 80,
          duration: 60000,
        },
      },
    );

    // Listen to failed event
    this.worker.on('failed', (job, error) => {
      // In BullMQ, if job is undefined it means it failed but couldn't be loaded
      if (!job) return;

      const maxAttempts = job.opts?.attempts ?? 5;
      if (job.attemptsMade >= maxAttempts) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Alert: Verification job ${job.id} has permanently failed after ${job.attemptsMade} attempts. Error: ${errorMessage}`,
        );

        const failedJob = job as Job<{
          verificationId: string;
          documentUrl: string;
        }>;
        const verificationId = failedJob.data.verificationId;

        void (async () => {
          try {
            // Update DB status to SYSTEM_ERROR via State Machine
            await this.stateMachine.transition(
              verificationId,
              VerificationStatus.SYSTEM_ERROR,
              { type: ActorType.SYSTEM },
              `Verification failed permanently after ${maxAttempts} attempts. Error: ${errorMessage}`,
            );
            this.logger.log(
              `Transitioned verification ${verificationId} to SYSTEM_ERROR`,
            );
          } catch (dbError) {
            const dbErrorMessage =
              dbError instanceof Error ? dbError.message : String(dbError);
            this.logger.error(
              `Failed to transition verification for permanently failed job ${job.id} to SYSTEM_ERROR: ${dbErrorMessage}`,
            );
          }
        })();
      }
    });

    this.logger.log('Verification Worker initialized');
  }

  // Exposed for testing
  getWorkerInstance(): Worker {
    return this.worker;
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Verification Worker closed');
    }
  }
}
