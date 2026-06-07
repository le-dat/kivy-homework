import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CreateProductDto, SellerProductResponseDto } from './dto/product.dto';
import {
  VerificationResponseDto,
  LatestVerificationResponseDto,
  UploadDocumentResponseDto,
} from './dto/verification-response.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('Seller Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('seller')
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Post('documents')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDocumentDto })
  @ApiOperation({ summary: 'Upload seller business verification documents' })
  @ApiResponse({
    status: 202,
    description: 'Document accepted and verification request created',
    type: UploadDocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed / file too large / invalid type / already has active request',
  })
  async uploadDocuments(
    @CurrentUser() user: UserPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const buffer = file.buffer as Buffer;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const originalname = file.originalname as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const size = file.size as number;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const mimetype = file.mimetype as string;

    return this.sellerService.submitVerification(user.id, {
      originalname,
      buffer,
      size,
      mimetype,
    });
  }

  @Get('documents/:id')
  @ApiOperation({ summary: 'Check verification status and details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification request details',
    type: VerificationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Verification request not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden: resource belongs to another seller',
  })
  async checkVerification(
    @CurrentUser() user: UserPayload,
    @Param('id') verificationId: string,
  ) {
    return this.sellerService.checkVerificationStatus(user.id, verificationId);
  }

  @Get('verification/status')
  @ApiOperation({ summary: "Get seller's latest verification request status" })
  @ApiResponse({
    status: 200,
    description: 'Latest verification status (UNSUBMITTED if never submitted)',
    type: LatestVerificationResponseDto,
  })
  async checkLatestVerificationStatus(@CurrentUser() user: UserPayload) {
    return this.sellerService.getLatestVerificationStatus(user.id);
  }

  @Post('products')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created (visibility depends on seller verification)',
    type: SellerProductResponseDto,
  })
  async createProduct(
    @CurrentUser() user: UserPayload,
    @Body() dto: CreateProductDto,
  ) {
    return this.sellerService.createProduct(user.id, dto);
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products owned by the seller' })
  @ApiResponse({
    status: 200,
    description: 'Array of seller products',
    type: [SellerProductResponseDto],
  })
  async listProducts(@CurrentUser() user: UserPayload) {
    return this.sellerService.listProducts(user.id);
  }
}
