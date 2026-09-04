import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  COGNITO_JWT_VERIFIER,
  type CognitoIdTokenVerifier,
} from './cognito-verifier.provider';
import type { AuthenticatedRequest } from './current-user.decorator';

const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private readonly logger = new Logger(CognitoAuthGuard.name);

  constructor(
    @Inject(COGNITO_JWT_VERIFIER)
    private readonly verifier: CognitoIdTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = await this.verifier.verify(
        header.slice(BEARER_PREFIX.length),
      );

      request.user = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : null,
      };

      return true;
    } catch (error) {
      // Log why the token was rejected, never the token itself.
      this.logger.warn(`Rejected token: ${(error as Error).message}`);

      throw new UnauthorizedException('Invalid token');
    }
  }
}
