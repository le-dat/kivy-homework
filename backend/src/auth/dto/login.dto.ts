import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Role } from '@prisma/client';

// ─── Request ────────────────────────────────────────────────────────────────

export class LoginDto {
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
}

// ─── Response ───────────────────────────────────────────────────────────────

export class UserProfileDto {
  @ApiProperty({ example: 'clxyz123', description: 'User UUID' })
  id: string;

  @ApiProperty({ example: 'seller@kivy.com' })
  email: string;

  @ApiProperty({ enum: Role, example: Role.SELLER })
  role: Role;
}

export class LoginDataDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}

export class LoginResponseDto {
  @ApiProperty({ type: LoginDataDto })
  data: LoginDataDto;
}

export class MeResponseDto {
  @ApiProperty({ type: LoginDataDto })
  data: LoginDataDto;
}

export class LogoutDataDto {
  @ApiProperty({ example: true })
  success: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({ type: LogoutDataDto })
  data: LogoutDataDto;
}
