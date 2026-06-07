import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VerificationQueueService } from '../verification/verification-queue.service';
import { VerificationStatus, ActorType } from '@prisma/client';
import * as path from 'path';

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: VerificationQueueService,
  ) {}

  async submitVerification(
    sellerId: string,
    file: {
      originalname: string;
      buffer: Buffer;
      size: number;
      mimetype?: string;
    },
  ) {
    // 1. Pre-validation checks: size < 2MB, allowed extensions
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 2MB');
    }

    const allowedExtensions = /\.(pdf|png|jpeg|jpg)$/i;
    if (!allowedExtensions.test(file.originalname)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, PNG, JPG, and JPEG are allowed.',
      );
    }

    const latest = await this.prisma.verification.findFirst({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });

    if (
      latest &&
      ([
        VerificationStatus.PENDING,
        VerificationStatus.PROCESSING,
        VerificationStatus.INCONCLUSIVE,
        VerificationStatus.APPROVED,
        VerificationStatus.VERIFIED,
      ] as VerificationStatus[]).includes(latest.status)
    ) {
      throw new BadRequestException(
        `Seller already has an active verification request with status ${latest.status}`,
      );
    }

    // 3. Upload the file to Supabase Storage
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new BadRequestException(
        'Supabase storage is not configured on the server',
      );
    }

    const bucketName = process.env.SUPABASE_BUCKET || 'kivy-bucket';
    const fileExt = path.extname(file.originalname);
    const filename = `${sellerId}-${Date.now()}${fileExt}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filename}`;

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
          'Content-Type': file.mimetype || 'application/octet-stream',
        },
        body: file.buffer as unknown as BodyInit,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Supabase returned status ${response.status}: ${errorText}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(
        `Failed to upload document to storage: ${msg}`,
      );
    }

    const documentUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filename}`;

    // 4. Create database records inside a transaction
    const verification = await this.prisma.$transaction(async (tx) => {
      const ver = await tx.verification.create({
        data: {
          sellerId,
          documentUrl,
          status: VerificationStatus.PENDING,
        },
      });

      await tx.verificationEvent.create({
        data: {
          verificationId: ver.id,
          fromStatus: null,
          toStatus: VerificationStatus.PENDING,
          actorType: ActorType.SELLER,
          actorId: sellerId,
          reason: 'Document uploaded by seller',
        },
      });

      return ver;
    });

    // 5. Publish queue job
    try {
      await this.queueService.addVerificationJob(
        verification.id,
        verification.documentUrl,
      );
    } catch (err) {
      // Log the queue failure, but we have already saved the DB record.
      // The reconciliation cron will catch and retry it later if queue failed.
      console.error(
        `Failed to add verification job to queue for ${verification.id}:`,
        err,
      );
    }

    return {
      verification_id: verification.id,
      status: verification.status,
    };
  }

  async checkVerificationStatus(sellerId: string, verificationId: string) {
    const ver = await this.prisma.verification.findUnique({
      where: { id: verificationId },
    });

    if (!ver) {
      throw new NotFoundException('Verification request not found');
    }

    if (ver.sellerId !== sellerId) {
      throw new ForbiddenException(
        'You do not have permission to view this verification',
      );
    }

    return {
      id: ver.id,
      status: ver.status,
      reason: ver.reason,
      created_at: ver.createdAt.toISOString(),
      updated_at: ver.updatedAt.toISOString(),
    };
  }

  async getLatestVerificationStatus(sellerId: string) {
    const latest = await this.prisma.verification.findFirst({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      return {
        status: 'UNSUBMITTED',
        reason: null,
        rejectionReason: null,
      };
    }

    return {
      id: latest.id,
      status: latest.status,
      reason: latest.reason,
      rejectionReason: latest.reason,
      created_at: latest.createdAt.toISOString(),
      updated_at: latest.updatedAt.toISOString(),
    };
  }

  async createProduct(
    sellerId: string,
    data: { name: string; description?: string; price: number },
  ) {
    // Determine visibility based on seller's latest verification status
    const latest = await this.prisma.verification.findFirst({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });

    const isVerified =
      latest &&
      (latest.status === VerificationStatus.VERIFIED ||
        latest.status === VerificationStatus.APPROVED);

    const product = await this.prisma.product.create({
      data: {
        sellerId,
        name: data.name,
        description: data.description,
        price: data.price,
        isVisible: !!isVerified,
      },
    });

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      is_visible: product.isVisible,
      created_at: product.createdAt.toISOString(),
    };
  }

  async listProducts(sellerId: string) {
    const products = await this.prisma.product.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      is_visible: p.isVisible,
    }));
  }

  async getNotifications(sellerId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        is_read: n.isRead,
        created_at: n.createdAt.toISOString(),
      })),
      unread_count: notifications.filter((n) => !n.isRead).length,
    };
  }

  async markNotificationAsRead(sellerId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, sellerId },
    });

    if (!notification) {
      return { success: false };
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markAllNotificationsAsRead(sellerId: string) {
    await this.prisma.notification.updateMany({
      where: { sellerId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }
}
