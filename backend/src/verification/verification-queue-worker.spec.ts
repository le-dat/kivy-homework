/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationWorkerService } from './verification-worker.service';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationStatus, ActorType } from '@prisma/client';

const mockQueueAdd = jest.fn();
const mockQueueClose = jest.fn();
const mockQueueClean = jest.fn();
const mockWorkerClose = jest.fn();
const mockWorkerOn = jest.fn();
let capturedProcessor: any;
const workerListeners: Record<string, any> = {};

jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => {
      return {
        add: mockQueueAdd,
        close: mockQueueClose,
        clean: mockQueueClean,
      };
    }),
    Worker: jest.fn().mockImplementation((name, processor) => {
      capturedProcessor = processor;
      return {
        on: mockWorkerOn.mockImplementation((event, listener) => {
          workerListeners[event] = listener;
        }),
        close: mockWorkerClose,
      };
    }),
  };
});

describe('Queue and Worker Services', () => {
  let queueService: VerificationQueueService;
  let workerService: VerificationWorkerService;
  let stateMachine: jest.Mocked<VerificationStateMachine>;

  const mockStateMachine = {
    transition: jest.fn(),
  };

  const mockFetch = jest.fn();
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = mockFetch as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockWorkerOn.mockClear();
    mockQueueAdd.mockClear();
    mockQueueClose.mockClear();
    mockWorkerClose.mockClear();
    capturedProcessor = null;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationQueueService,
        VerificationWorkerService,
        {
          provide: VerificationStateMachine,
          useValue: mockStateMachine,
        },
      ],
    }).compile();

    queueService = module.get<VerificationQueueService>(
      VerificationQueueService,
    );
    workerService = module.get<VerificationWorkerService>(
      VerificationWorkerService,
    );
    stateMachine = module.get(VerificationStateMachine);

    // Trigger onModuleInit to initialize mock Queue and Worker
    queueService.onModuleInit();
    workerService.onModuleInit();
  });

  afterEach(async () => {
    await queueService.onModuleDestroy();
    await workerService.onModuleDestroy();
  });

  describe('VerificationQueueService', () => {
    it('should push jobs to the queue with the correct options and jobId for idempotency', async () => {
      const verificationId = 'test-uuid-id';
      const documentUrl = 'http://example.com/license.pdf';

      mockQueueAdd.mockResolvedValue({ id: verificationId });

      const result = await queueService.addVerificationJob(
        verificationId,
        documentUrl,
      );

      expect(result.id).toBe(verificationId);
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'verify-doc',
        { verificationId, documentUrl },
        {
          jobId: verificationId,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
          removeOnComplete: {
            age: 3600,
          },
          removeOnFail: false,
        },
      );
    });

    it('should clean completed and failed jobs older than 24 hours when cleanOldJobs is triggered', async () => {
      mockQueueClean.mockResolvedValue([]);

      await queueService.cleanOldJobs();

      expect(mockQueueClean).toHaveBeenCalledWith(
        24 * 3600 * 1000,
        1000,
        'completed',
      );
      expect(mockQueueClean).toHaveBeenCalledWith(
        24 * 3600 * 1000,
        1000,
        'failed',
      );
    });
  });

  describe('VerificationWorkerService Processor', () => {
    it('should process the job and post to the mock verification service successfully', async () => {
      const job = {
        id: 'job-123',
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      mockFetch.mockResolvedValue({
        status: 202,
        ok: true,
        json: jest.fn().mockResolvedValue({
          verification_id: 'mock-123',
          status: 'PROCESSING',
        }),
      });

      await expect(capturedProcessor(job)).resolves.not.toThrow();
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/v1/verifications',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_url: job.data.documentUrl,
            callback_url: 'http://localhost:5000/api/v1/webhooks/verification',
            verification_id: job.data.verificationId,
          }),
        }),
      );
    });

    it('should throw an error if mock verification service returns HTTP 429 to trigger backoff retry', async () => {
      const job = {
        id: 'job-123',
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      mockFetch.mockResolvedValue({
        status: 429,
        ok: false,
        text: jest.fn().mockResolvedValue('Too Many Requests'),
      });

      await expect(capturedProcessor(job)).rejects.toThrow(
        'Rate limit hit (429)',
      );
    });

    it('should throw an error if mock verification service returns other unsuccessful status codes', async () => {
      const job = {
        id: 'job-123',
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      mockFetch.mockResolvedValue({
        status: 500,
        ok: false,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      });

      await expect(capturedProcessor(job)).rejects.toThrow(
        'API returned error status 500',
      );
    });
  });

  describe('VerificationWorkerService Failure Listener', () => {
    it('should NOT transition database state if job fails but attempts have not reached the limit', async () => {
      const failedListener = workerListeners['failed'];
      expect(failedListener).toBeDefined();

      const job = {
        id: 'job-123',
        attemptsMade: 3,
        opts: { attempts: 5 },
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      await failedListener(job, new Error('Temporary connection issue'));

      expect(stateMachine.transition).not.toHaveBeenCalled();
    });

    it('should transition database state to SYSTEM_ERROR on permanent failure (attempts >= attempts limit)', async () => {
      const failedListener = workerListeners['failed'];
      expect(failedListener).toBeDefined();

      const job = {
        id: 'job-123',
        attemptsMade: 5,
        opts: { attempts: 5 },
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      await failedListener(job, new Error('Permanent API failure'));

      expect(stateMachine.transition).toHaveBeenCalledWith(
        'verification-123',
        VerificationStatus.SYSTEM_ERROR,
        { type: ActorType.SYSTEM },
        'Verification failed permanently after 5 attempts. Error: Permanent API failure',
      );
    });

    it('should handle state machine transition errors gracefully without breaking the worker listener', async () => {
      const failedListener = workerListeners['failed'];
      expect(failedListener).toBeDefined();

      const job = {
        id: 'job-123',
        attemptsMade: 5,
        opts: { attempts: 5 },
        data: {
          verificationId: 'verification-123',
          documentUrl: 'http://example.com/license.pdf',
        },
      };

      stateMachine.transition.mockRejectedValue(
        new Error('Database lock error'),
      );

      expect(() => {
        failedListener(job, new Error('Permanent API failure'));
      }).not.toThrow();

      // Wait a tick for background async logic to run
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
});
