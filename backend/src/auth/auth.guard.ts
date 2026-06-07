import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromCookie(request);

    if (!token) {
      throw new UnauthorizedException('Access token is missing or malformed');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        id: string;
        email: string;
        role: string;
      }>(token);

      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    const rawCookie = request.headers.cookie;
    if (!rawCookie) return undefined;

    const cookies = rawCookie.split(';').reduce(
      (acc, c) => {
        const eqIndex = c.indexOf('=');
        if (eqIndex === -1) return acc;
        const key = c.substring(0, eqIndex).trim();
        const val = c.substring(eqIndex + 1).trim();
        if (key) {
          acc[key] = val;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    return cookies['token'];
  }
}
