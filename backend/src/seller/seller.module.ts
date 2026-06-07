import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [PrismaModule, VerificationModule],
  providers: [SellerService],
  controllers: [SellerController],
  exports: [SellerService],
})
export class SellerModule {}
