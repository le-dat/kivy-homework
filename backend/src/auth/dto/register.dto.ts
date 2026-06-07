import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { UserProfileDto } from './login.dto';

// ─── Request ────────────────────────────────────────────────────────────────

export class RegisterDto {
  @ApiProperty({
    example: 'seller@kivy.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'sellerpassword', description: 'User password' })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiProperty({
    enum: Role,
    example: Role.SELLER,
    description: 'Account role — SELLER or ADMIN',
  })
  @IsEnum(Role, { message: 'Role must be either SELLER or ADMIN' })
  @IsNotEmpty({ message: 'Role is required' })
  role: Role;
}

// ─── Response ───────────────────────────────────────────────────────────────

export class RegisterDataDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}

export class RegisterResponseDto {
  @ApiProperty({ type: RegisterDataDto })
  data: RegisterDataDto;
}
