import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStateMachine } from '../verification/verification-state-machine.service';
import { VerificationStatus, ActorType } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: VerificationStateMachine,
  ) {}

  async listVerifications(status?: VerificationStatus) {
    const verifications = await this.prisma.verification.findMany({
      where: status ? { status } : undefined,
      include: {
        seller: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map((v) => ({
      id: v.id,
      seller_id: v.sellerId,
      seller_email: v.seller.email,
      document_url: v.documentUrl,
      status: v.status,
      created_at: v.createdAt.toISOString(),
    }));
  }

  async listVerificationsVerifiedApproved() {
    const verifications = await this.prisma.verification.findMany({
      where: {
        status: {
          in: [VerificationStatus.VERIFIED, VerificationStatus.APPROVED],
        },
      },
      include: {
        seller: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map((v) => ({
      id: v.id,
      seller_id: v.sellerId,
      seller_email: v.seller.email,
      document_url: v.documentUrl,
      status: v.status,
      created_at: v.createdAt.toISOString(),
    }));
  }

  async makeDecision(
    adminId: string,
    verificationId: string,
    nextStatus: VerificationStatus,
    reason: string,
  ) {
    if (
      nextStatus !== VerificationStatus.APPROVED &&
      nextStatus !== VerificationStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Admin decision status must be either APPROVED or REJECTED',
      );
    }

    if (!reason || reason.trim() === '') {
      throw new BadRequestException(
        'Reason must be provided for admin decision',
      );
    }

    await this.stateMachine.transition(
      verificationId,
      nextStatus,
      { type: ActorType.ADMIN, id: adminId },
      reason,
    );

    return {
      success: true,
      new_status: nextStatus,
    };
  }

  async getVerificationHistory(verificationId: string) {
    const events = await this.prisma.verificationEvent.findMany({
      where: { verificationId },
      include: {
        actor: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return events.map((e) => ({
      from_status: e.fromStatus,
      to_status: e.toStatus,
      actor_type: e.actorType,
      actor_id: e.actorId,
      actor_email: e.actor?.email || null,
      reason: e.reason,
      created_at: e.createdAt.toISOString(),
    }));
  }

  async getSellerVerificationHistory(sellerId: string) {
    const verifications = await this.prisma.verification.findMany({
      where: { sellerId },
      include: {
        events: {
          include: {
            actor: {
              select: {
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return verifications.map((v) => ({
      id: v.id,
      status: v.status,
      document_url: v.documentUrl,
      reason: v.reason,
      created_at: v.createdAt.toISOString(),
      updated_at: v.updatedAt.toISOString(),
      events: v.events.map((e) => ({
        from_status: e.fromStatus,
        to_status: e.toStatus,
        actor_type: e.actorType,
        actor_id: e.actorId,
        actor_email: e.actor?.email || null,
        reason: e.reason,
        created_at: e.createdAt.toISOString(),
      })),
    }));
  }

  async getMetrics() {
    const [pending, inconclusive, verified, approved, rejected] =
      await Promise.all([
        this.prisma.verification.count({
          where: { status: VerificationStatus.PENDING },
        }),
        this.prisma.verification.count({
          where: { status: VerificationStatus.INCONCLUSIVE },
        }),
        this.prisma.verification.count({
          where: { status: VerificationStatus.VERIFIED },
        }),
        this.prisma.verification.count({
          where: { status: VerificationStatus.APPROVED },
        }),
        this.prisma.verification.count({
          where: { status: VerificationStatus.REJECTED },
        }),
      ]);

    return {
      pending: pending + inconclusive, // total pending review items
      verifiedCount: verified + approved,
      rejectedCount: rejected,
    };
  }
}
