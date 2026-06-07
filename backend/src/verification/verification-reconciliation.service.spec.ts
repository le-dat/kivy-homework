/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationReconciliationService } from './verification-reconciliation.service';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStateMachine } from './verification-state-machine.service';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationStatus, ActorType } from '@prisma/client';

describe('VerificationReconciliationService', () => {
  let service: VerificationReconciliationService;
  let prisma: jest.Mocked<PrismaService>;
  let stateMachine: jest.Mocked<VerificationStateMachine>;

  const mockPrisma = {
    verification: {
      findMany: jest.fn(),
    },
  };

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
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationReconciliationService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: VerificationStateMachine,
          useValue: mockStateMachine,
        },
        {
          provide: VerificationQueueService,
          useValue: {
            addVerificationJob: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<VerificationReconciliationService>(
      VerificationReconciliationService,
    );
    prisma = module.get(PrismaService);
    stateMachine = module.get(VerificationStateMachine);
  });

  it('should exit early if no verifications are in PROCESSING status', async () => {
    prisma.verification.findMany.mockResolvedValue([]);

    await service.handleReconciliation();

    expect(prisma.verification.findMany).toHaveBeenCalledWith({
      where: { status: VerificationStatus.PROCESSING },
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it('should sync verification status if status has changed in external service', async () => {
    prisma.verification.findMany.mockResolvedValue([
      {
        id: 'ver-123',
        sellerId: 'seller-123',
        documentUrl: '/uploads/documents/doc.pdf',
        status: VerificationStatus.PROCESSING,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'ver-123',
        status: 'VERIFIED',
        documentUrl: '/uploads/documents/doc.pdf',
      }),
    });

    await service.handleReconciliation();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/v1/verifications/ver-123',
    );
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'ver-123',
      VerificationStatus.VERIFIED,
      { type: ActorType.SYSTEM },
      'Reconciliation cron synced status from mock service (previous state: PROCESSING)',
    );
  });

  it('should NOT sync verification status if status has NOT changed', async () => {
    prisma.verification.findMany.mockResolvedValue([
      {
        id: 'ver-123',
        sellerId: 'seller-123',
        documentUrl: '/uploads/documents/doc.pdf',
        status: VerificationStatus.PROCESSING,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'ver-123',
        status: 'PROCESSING',
        documentUrl: '/uploads/documents/doc.pdf',
      }),
    });

    await service.handleReconciliation();

    expect(mockFetch).toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it('should log warning and continue if external service returns 404', async () => {
    prisma.verification.findMany.mockResolvedValue([
      {
        id: 'ver-123',
        sellerId: 'seller-123',
        documentUrl: '/uploads/documents/doc.pdf',
        status: VerificationStatus.PROCESSING,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockFetch.mockResolvedValue({
      status: 404,
      ok: false,
    });

    await service.handleReconciliation();

    expect(mockFetch).toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it('should handle fetch or database transition errors gracefully without stopping reconciliation loop', async () => {
    prisma.verification.findMany.mockResolvedValue([
      {
        id: 'ver-123',
        sellerId: 'seller-123',
        documentUrl: '/uploads/documents/doc.pdf',
        status: VerificationStatus.PROCESSING,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'ver-456',
        sellerId: 'seller-456',
        documentUrl: '/uploads/documents/doc2.pdf',
        status: VerificationStatus.PROCESSING,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // First call throws error, second call succeeds with status change
    mockFetch
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'ver-456',
          status: 'REJECTED',
          documentUrl: '/uploads/documents/doc2.pdf',
        }),
      });

    await service.handleReconciliation();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    // ver-456 should still transition despite the error in ver-123
    expect(stateMachine.transition).toHaveBeenCalledWith(
      'ver-456',
      VerificationStatus.REJECTED,
      { type: ActorType.SYSTEM },
      'Reconciliation cron synced status from mock service (previous state: PROCESSING)',
    );
  });
});
