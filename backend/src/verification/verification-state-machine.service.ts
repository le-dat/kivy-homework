import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { VerificationStatus, ActorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface StateActor {
  type: ActorType;
  id?: string | null;
}

@Injectable()
export class VerificationStateMachine {
  private readonly logger = new Logger(VerificationStateMachine.name);

  constructor(private readonly prisma: PrismaService) {}

  canTransition(
    current: VerificationStatus,
    next: VerificationStatus,
  ): boolean {
    if (current === next) return false;

    switch (current) {
      case VerificationStatus.PENDING:
        return next === VerificationStatus.PROCESSING;
      case VerificationStatus.PROCESSING:
        return (
          [
            VerificationStatus.VERIFIED,
            VerificationStatus.REJECTED,
            VerificationStatus.INCONCLUSIVE,
            VerificationStatus.SYSTEM_ERROR,
          ] as VerificationStatus[]
        ).includes(next);
      case VerificationStatus.INCONCLUSIVE:
        return (
          [
            VerificationStatus.APPROVED,
            VerificationStatus.REJECTED,
          ] as VerificationStatus[]
        ).includes(next);
      case VerificationStatus.VERIFIED:
      case VerificationStatus.APPROVED:
      case VerificationStatus.REJECTED:
      case VerificationStatus.SYSTEM_ERROR:
      default:
        // Terminal states are immutable
        return false;
    }
  }

  private validateActorForTransition(
    current: VerificationStatus,
    next: VerificationStatus,
    actor: StateActor,
  ): void {
    if (actor.type !== ActorType.SYSTEM && !actor.id) {
      throw new BadRequestException(
        `Actor ID must be provided for actor type ${actor.type}`,
      );
    }

    if (
      current === VerificationStatus.PENDING &&
      next === VerificationStatus.PROCESSING
    ) {
      if (actor.type !== ActorType.SYSTEM) {
        throw new BadRequestException(
          `Only SYSTEM can transition from PENDING to PROCESSING`,
        );
      }
    }

    if (
      current === VerificationStatus.PROCESSING &&
      (
        [
          VerificationStatus.VERIFIED,
          VerificationStatus.REJECTED,
          VerificationStatus.INCONCLUSIVE,
          VerificationStatus.SYSTEM_ERROR,
        ] as VerificationStatus[]
      ).includes(next)
    ) {
      if (actor.type !== ActorType.SYSTEM) {
        throw new BadRequestException(
          `Only SYSTEM can transition from PROCESSING to ${next}`,
        );
      }
    }

    if (
      current === VerificationStatus.INCONCLUSIVE &&
      (
        [
          VerificationStatus.APPROVED,
          VerificationStatus.REJECTED,
        ] as VerificationStatus[]
      ).includes(next)
    ) {
      if (actor.type !== ActorType.ADMIN) {
        throw new BadRequestException(
          `Only ADMIN can transition from INCONCLUSIVE to ${next}`,
        );
      }
    }
  }

  async transition(
    verificationId: string,
    nextStatus: VerificationStatus,
    actor: StateActor,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{
          id: string;
          seller_id: string;
          status: VerificationStatus;
          reason: string | null;
        }>
      >`
        SELECT id, seller_id, status, reason
        FROM verifications
        WHERE id = ${verificationId}
        FOR UPDATE
      `;

      const row = rows[0];
      if (!row) {
        this.logger.warn(
          `Verification with ID ${verificationId} not found for transition to ${nextStatus}. ` +
          `This may be due to a race condition or the verification was already processed.`,
        );
        return null;
      }

      const verification = {
        id: row.id,
        sellerId: row.seller_id,
        status: row.status,
        reason: row.reason,
      };

      if (!this.canTransition(verification.status, nextStatus)) {
        throw new BadRequestException(
          `Invalid state transition from ${verification.status} to ${nextStatus}`,
        );
      }

      this.validateActorForTransition(verification.status, nextStatus, actor);

      const updatedVerification = await tx.verification.update({
        where: { id: verificationId },
        data: {
          status: nextStatus,
          reason: reason,
        },
      });

      await tx.verificationEvent.create({
        data: {
          verificationId,
          fromStatus: verification.status,
          toStatus: nextStatus,
          actorType: actor.type,
          actorId: actor.id || null,
          reason,
        },
      });

      if (
        nextStatus === VerificationStatus.VERIFIED ||
        nextStatus === VerificationStatus.APPROVED
      ) {
        await tx.product.updateMany({
          where: { sellerId: verification.sellerId },
          data: { isVisible: true },
        });
      }

      return updatedVerification;
    });
  }
}
