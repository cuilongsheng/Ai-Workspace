import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { localizeMessage, resolveLocale } from './localize-message';

@Catch()
export class LocalizedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LocalizedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const locale = resolveLocale(request.headers['accept-language']);
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled request error',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const raw =
      exception instanceof HttpException
        ? exception.getResponse()
        : {
            statusCode: status,
            message:
              locale === 'en-US' ? 'Internal server error' : '服务器内部错误',
          };
    const body: Record<string, unknown> =
      typeof raw === 'string' ? { message: raw } : { ...raw };
    const messages = body.message;
    body.message = Array.isArray(messages)
      ? messages.map((message) => localizeMessage(String(message), locale))
      : localizeMessage(String(messages ?? ''), locale);

    response.setHeader('Content-Language', locale);
    response.status(status).json({ statusCode: status, ...body });
  }
}
