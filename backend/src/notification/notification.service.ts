import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationStatus } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async createNotification(sellerId: string, title: string, message: string) {
    return this.prisma.notification.create({
      data: { sellerId, title, message },
    });
  }

  async getUnreadNotifications(sellerId: string) {
    return this.prisma.notification.findMany({
      where: { sellerId, isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string, sellerId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, sellerId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(sellerId: string) {
    return this.prisma.notification.updateMany({
      where: { sellerId, isRead: false },
      data: { isRead: true },
    });
  }

  async createVerificationOutcomeNotification(
    sellerId: string,
    status: VerificationStatus,
    reason?: string | null,
  ) {
    const notificationConfig: Record<
      VerificationStatus,
      { title: string; message: string }
    > = {
      [VerificationStatus.VERIFIED]: {
        title: 'Verification Approved',
        message:
          'Your identity has been verified. Your products are now visible to buyers.',
      },
      [VerificationStatus.APPROVED]: {
        title: 'Verification Approved by Admin',
        message:
          'Your identity has been approved by our team. Your products are now visible to buyers.',
      },
      [VerificationStatus.REJECTED]: {
        title: 'Verification Rejected',
        message: reason
          ? `Your verification was rejected: ${reason}`
          : 'Your verification was rejected. Please contact support for more information.',
      },
      [VerificationStatus.INCONCLUSIVE]: {
        title: 'Verification Requires Review',
        message:
          'Your verification is under manual review. We will notify you once the review is complete.',
      },
      [VerificationStatus.SYSTEM_ERROR]: {
        title: 'Verification Processing Issue',
        message:
          'There was an issue processing your verification. Please try again or contact support.',
      },
      [VerificationStatus.PENDING]: {
        title: 'Verification Submitted',
        message:
          'Your verification documents have been submitted and are being processed.',
      },
      [VerificationStatus.PROCESSING]: {
        title: 'Verification Under Review',
        message: 'Your verification is being processed by our system.',
      },
    };

    const config = notificationConfig[status];
    if (!config) return null;

    return this.createNotification(sellerId, config.title, config.message);
  }
}
