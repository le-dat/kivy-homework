import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${originalUrl} - IP: ${ip} - User Agent: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = http.getResponse<Response>();
          const statusCode = response.statusCode;
          this.logger.log(
            `Outgoing Response: ${method} ${originalUrl} ${statusCode} - ${Date.now() - now}ms`,
          );
        },
        error: (error: {
          status?: number;
          message?: string;
          stack?: string;
        }) => {
          const statusCode = error.status || 500;
          this.logger.error(
            `Outgoing Response Error: ${method} ${originalUrl} ${statusCode} - ${Date.now() - now}ms - Message: ${error.message ?? 'Unknown error'}`,
            error.stack,
          );
        },
      }),
    );
  }
}
