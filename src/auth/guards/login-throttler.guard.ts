import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.body?.email || req.ip;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
  ): Promise<void> {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `Has excedido el número de intentos. Tu cuenta (${context.switchToHttp().getRequest().body?.email}) ha sido bloqueada temporalmente. Intenta de nuevo en 15 minutos.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
