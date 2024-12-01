import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionHandler implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionHandler.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let msg: string;

    if (exception instanceof UnauthorizedException) {
      status = HttpStatus.UNAUTHORIZED;
      msg = exception.message || 'Unauthorized';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      msg = exception.message || 'Internal server error';
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      msg = exception.message || 'Internal server error';
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      msg = 'Internal server error';
    }

    this.logger.error(`Global message: ${JSON.stringify(msg)}`);

    response.status(status).json({
      error: msg,
    });
  }
}
