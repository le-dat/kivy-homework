import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[] = exception.message;
    let errorDetail = 'HttpException';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const respObj = exceptionResponse as Record<string, unknown>;
      if ('message' in respObj) {
        message = respObj.message as string | string[];
      }
      if ('error' in respObj && typeof respObj.error === 'string') {
        errorDetail = respObj.error;
      } else {
        errorDetail = exception.name;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorDetail,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
