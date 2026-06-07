import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async findLiveProducts() {
    const products = await this.prisma.product.findMany({
      where: { isVisible: true },
      include: {
        seller: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      price: Number(p.price),
      seller_name: p.seller.email,
    }));
  }
}
