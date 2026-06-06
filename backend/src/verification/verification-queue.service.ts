import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class VerificationQueueService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue;
  private readonly logger = new Logger(VerificationQueueService.name);

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

    this.queue = new Queue('verification-queue', {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      connection: connection,
    });
    this.logger.log('Verification Queue initialized');
  }

  async addVerificationJob(verificationId: string, documentUrl: string) {
    const job = await this.queue.add(
      'verify-doc',
      { verificationId, documentUrl },
      {
        jobId: verificationId, // Idempotency: duplicate jobs with same ID will be discarded
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 60000, // starts at 60 seconds (1m -> 2m -> 4m -> 8m...)
        },
        removeOnComplete: {
          age: 3600, // keep completed jobs for 1 hour
        },
        removeOnFail: false, // keep failed jobs indefinitely
      },
    );
    this.logger.log(
      `Added verification job: ${verificationId} (jobId: ${job.id})`,
    );
    return job;
  }

  // Exposed for testing purposes
  getQueueInstance(): Queue {
    return this.queue;
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Verification Queue closed');
    }
  }
}
