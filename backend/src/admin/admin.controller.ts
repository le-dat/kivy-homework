import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { UserPayload } from '../auth/current-user.decorator';
import { Role, VerificationStatus } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  DecideVerificationDto,
  DecisionResponseDto,
} from './dto/decide-verification.dto';
import { VerificationItemDto } from './dto/verification-list.dto';
import { VerificationEventDto } from './dto/verification-history.dto';
import { MetricsResponseDto } from './dto/metrics-response.dto';

@ApiTags('Admin Console')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  @ApiOperation({
    summary:
      'Retrieve aggregate verification status metrics for admin dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification metrics aggregated by status',
    type: MetricsResponseDto,
  })
  async getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('verifications')
  @ApiOperation({
    summary: 'List verification requests, optionally filtered by status',
  })
  @ApiQuery({ name: 'status', required: false, enum: VerificationStatus })
  @ApiResponse({
    status: 200,
    description: 'Array of verification requests',
    type: [VerificationItemDto],
  })
  async getVerifications(@Query('status') status?: VerificationStatus) {
    return this.adminService.listVerifications(status);
  }

  @Get('verifications/all')
  @ApiOperation({
    summary:
      'List ALL verification requests without status filter (for All tab)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of all verification requests',
    type: [VerificationItemDto],
  })
  async getAllVerifications() {
    return this.adminService.listVerifications();
  }

  @Get('verifications/verified-approved')
  @ApiOperation({
    summary: 'List verifications with status VERIFIED or APPROVED (merged tab)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of verified/approved verification requests',
    type: [VerificationItemDto],
  })
  async getVerifiedAndApproved() {
    return this.adminService.listVerificationsVerifiedApproved();
  }

  @Post('verifications/:id/decide')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve or Reject a verification request in INCONCLUSIVE status',
  })
  @ApiResponse({
    status: 200,
    description: 'Decision recorded successfully',
    type: DecisionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status decision / invalid state transition',
  })
  async makeDecision(
    @CurrentUser() admin: UserPayload,
    @Param('id') verificationId: string,
    @Body() dto: DecideVerificationDto,
  ) {
    return this.adminService.makeDecision(
      admin.id,
      verificationId,
      dto.status,
      dto.reason,
    );
  }

  @Get('verifications/:id/history')
  @ApiOperation({
    summary: 'Retrieve full transition history / audit trail of a verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Ordered list of verification state transition events',
    type: [VerificationEventDto],
  })
  async getHistory(@Param('id') verificationId: string) {
    return this.adminService.getVerificationHistory(verificationId);
  }
}
