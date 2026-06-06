/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationStatus, ActorType } from '@prisma/client';
import { VerificationStateMachine } from './verification-state-machine.service';
import { PrismaService } from '../prisma/prisma.service';

describe('VerificationStateMachine', () => {
  let service: VerificationStateMachine;
  let prisma: any;

  const mockPrisma = {
    $transaction: jest.fn().mockImplementation((cb) => cb(mockPrisma)),
    $queryRaw: jest.fn().mockResolvedValue([]),
    verification: {
      update: jest.fn(),
    },
    verificationEvent: {
      create: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationStateMachine,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<VerificationStateMachine>(VerificationStateMachine);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('canTransition', () => {
    it('should permit valid transitions', () => {
      expect(
        service.canTransition(
          VerificationStatus.PENDING,
          VerificationStatus.PROCESSING,
        ),
      ).toBe(true);

      expect(
        service.canTransition(
          VerificationStatus.PROCESSING,
          VerificationStatus.VERIFIED,
        ),
      ).toBe(true);
      expect(
        service.canTransition(
          VerificationStatus.PROCESSING,
          VerificationStatus.REJECTED,
        ),
      ).toBe(true);
      expect(
        service.canTransition(
          VerificationStatus.PROCESSING,
          VerificationStatus.INCONCLUSIVE,
        ),
      ).toBe(true);
      expect(
        service.canTransition(
          VerificationStatus.PROCESSING,
          VerificationStatus.SYSTEM_ERROR,
        ),
      ).toBe(true);

      expect(
        service.canTransition(
          VerificationStatus.INCONCLUSIVE,
          VerificationStatus.APPROVED,
        ),
      ).toBe(true);
      expect(
        service.canTransition(
          VerificationStatus.INCONCLUSIVE,
          VerificationStatus.REJECTED,
        ),
      ).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(
        service.canTransition(
          VerificationStatus.PENDING,
          VerificationStatus.PENDING,
        ),
      ).toBe(false);

      expect(
        service.canTransition(
          VerificationStatus.PENDING,
          VerificationStatus.VERIFIED,
        ),
      ).toBe(false);
      expect(
        service.canTransition(
          VerificationStatus.PENDING,
          VerificationStatus.APPROVED,
        ),
      ).toBe(false);

      expect(
        service.canTransition(
          VerificationStatus.INCONCLUSIVE,
          VerificationStatus.VERIFIED,
        ),
      ).toBe(false);
    });

    it('should reject transitions from terminal states', () => {
      const terminalStates = [
        VerificationStatus.VERIFIED,
        VerificationStatus.APPROVED,
        VerificationStatus.REJECTED,
        VerificationStatus.SYSTEM_ERROR,
      ];

      for (const from of terminalStates) {
        for (const to of Object.values(VerificationStatus)) {
          expect(service.canTransition(from, to)).toBe(false);
        }
      }
    });
  });

  describe('transition', () => {
    const id = 'verification-uuid-1';
    const sellerId = 'seller-uuid-1';

    const makeRow = (status: VerificationStatus) => ({
      id,
      seller_id: sellerId,
      status,
      reason: null,
    });

    const makeUpdated = (status: VerificationStatus, reason: string) => ({
      id,
      sellerId,
      documentUrl: 'http://example.com/doc.pdf',
      status,
      reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should throw NotFoundException if verification record is not found', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await expect(
        service.transition(
          id,
          VerificationStatus.PROCESSING,
          { type: ActorType.SYSTEM },
          'Processing started',
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('should throw BadRequestException if transition is invalid', async () => {
      prisma.$queryRaw.mockResolvedValue([makeRow(VerificationStatus.PENDING)]);

      await expect(
        service.transition(
          id,
          VerificationStatus.VERIFIED,
          { type: ActorType.SYSTEM },
          'Verified',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if actor_id is missing for non-SYSTEM actor', async () => {
      prisma.$queryRaw.mockResolvedValue([
        makeRow(VerificationStatus.INCONCLUSIVE),
      ]);

      await expect(
        service.transition(
          id,
          VerificationStatus.APPROVED,
          { type: ActorType.ADMIN, id: null },
          'Admin approval',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if PENDING->PROCESSING is triggered by non-SYSTEM actor', async () => {
      prisma.$queryRaw.mockResolvedValue([makeRow(VerificationStatus.PENDING)]);

      await expect(
        service.transition(
          id,
          VerificationStatus.PROCESSING,
          { type: ActorType.ADMIN, id: 'admin-1' },
          'Admin trigger',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if INCONCLUSIVE->APPROVED is triggered by non-ADMIN actor', async () => {
      prisma.$queryRaw.mockResolvedValue([
        makeRow(VerificationStatus.INCONCLUSIVE),
      ]);

      await expect(
        service.transition(
          id,
          VerificationStatus.APPROVED,
          { type: ActorType.SYSTEM },
          'System auto approve (not allowed)',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully execute a valid transition to PROCESSING', async () => {
      prisma.$queryRaw.mockResolvedValue([makeRow(VerificationStatus.PENDING)]);
      prisma.verification.update.mockResolvedValue(
        makeUpdated(
          VerificationStatus.PROCESSING,
          'Sending to external service',
        ),
      );

      const result = await service.transition(
        id,
        VerificationStatus.PROCESSING,
        { type: ActorType.SYSTEM },
        'Sending to external service',
      );

      expect(result.status).toBe(VerificationStatus.PROCESSING);
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.verification.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          status: VerificationStatus.PROCESSING,
          reason: 'Sending to external service',
        },
      });
      expect(prisma.verificationEvent.create).toHaveBeenCalledWith({
        data: {
          verificationId: id,
          fromStatus: VerificationStatus.PENDING,
          toStatus: VerificationStatus.PROCESSING,
          actorType: ActorType.SYSTEM,
          actorId: null,
          reason: 'Sending to external service',
        },
      });
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    });

    it('should update product visibility when transitioning to VERIFIED', async () => {
      prisma.$queryRaw.mockResolvedValue([
        makeRow(VerificationStatus.PROCESSING),
      ]);
      prisma.verification.update.mockResolvedValue(
        makeUpdated(VerificationStatus.VERIFIED, 'Auto-verified'),
      );

      const result = await service.transition(
        id,
        VerificationStatus.VERIFIED,
        { type: ActorType.SYSTEM },
        'Auto-verified',
      );

      expect(result.status).toBe(VerificationStatus.VERIFIED);
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { sellerId },
        data: { isVisible: true },
      });
    });

    it('should update product visibility when transitioning to APPROVED', async () => {
      prisma.$queryRaw.mockResolvedValue([
        makeRow(VerificationStatus.INCONCLUSIVE),
      ]);
      prisma.verification.update.mockResolvedValue(
        makeUpdated(VerificationStatus.APPROVED, 'Admin approved manually'),
      );

      const result = await service.transition(
        id,
        VerificationStatus.APPROVED,
        { type: ActorType.ADMIN, id: 'admin-id-123' },
        'Admin approved manually',
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { sellerId },
        data: { isVisible: true },
      });
    });

    it('should NOT update product visibility when transitioning to REJECTED', async () => {
      prisma.$queryRaw.mockResolvedValue([
        makeRow(VerificationStatus.PROCESSING),
      ]);
      prisma.verification.update.mockResolvedValue(
        makeUpdated(VerificationStatus.REJECTED, 'Rejected by webhook'),
      );

      const result = await service.transition(
        id,
        VerificationStatus.REJECTED,
        { type: ActorType.SYSTEM },
        'Rejected by webhook',
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
    });
  });
});
