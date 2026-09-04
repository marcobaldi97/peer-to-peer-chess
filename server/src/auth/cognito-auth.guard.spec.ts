import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import type { CognitoIdTokenVerifier } from './cognito-verifier.provider';
import type { AuthenticatedRequest } from './current-user.decorator';

type MockRequest = { headers: { authorization?: string } } & Partial<
  Pick<AuthenticatedRequest, 'user'>
>;

function buildContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CognitoAuthGuard', () => {
  let verify: jest.Mock;
  let guard: CognitoAuthGuard;

  beforeEach(() => {
    verify = jest.fn();
    guard = new CognitoAuthGuard({
      verify,
    } as unknown as CognitoIdTokenVerifier);
  });

  it('rejects a request with no Authorization header', async () => {
    await expect(guard.canActivate(buildContext({ headers: {} }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects an Authorization header that is not a bearer token', async () => {
    const context = buildContext({ headers: { authorization: 'Basic abc123' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects when the verifier throws, and passes only the raw token', async () => {
    verify.mockRejectedValue(new Error('Token expired'));
    const context = buildContext({
      headers: { authorization: 'Bearer stale-token' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(verify).toHaveBeenCalledWith('stale-token');
  });

  it('accepts a valid token and attaches the user to the request', async () => {
    verify.mockResolvedValue({ sub: 'cognito-sub-123', email: 'a@b.c' });
    const request: MockRequest = {
      headers: { authorization: 'Bearer good-token' },
    };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'cognito-sub-123', email: 'a@b.c' });
  });

  it('falls back to a null email when the token carries no email claim', async () => {
    verify.mockResolvedValue({ sub: 'cognito-sub-123' });
    const request: MockRequest = {
      headers: { authorization: 'Bearer good-token' },
    };

    await guard.canActivate(buildContext(request));

    expect(request.user).toEqual({ id: 'cognito-sub-123', email: null });
  });
});
