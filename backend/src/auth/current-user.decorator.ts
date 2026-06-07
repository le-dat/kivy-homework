import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface UserPayload {
  id: string;
  email: string;
  role: Role;
}

interface HttpRequest {
  user?: UserPayload;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload | undefined => {
    const http = ctx.switchToHttp() as unknown as { getRequest(): HttpRequest };
    return http.getRequest().user;
  },
);
