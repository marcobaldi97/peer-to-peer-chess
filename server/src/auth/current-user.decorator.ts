import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedUser = {
  // The Cognito `sub` claim — stable for the life of the user, unlike email.
  id: string;
  email: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
