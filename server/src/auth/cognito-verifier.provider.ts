import { Provider } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { loadAuthConfig } from './auth.config';

export const COGNITO_JWT_VERIFIER = 'COGNITO_JWT_VERIFIER';

// The guard depends on this structural type rather than the concrete verifier
// so its unit test can pass a plain `{ verify: jest.fn() }`.
export type CognitoIdTokenVerifier = {
  verify(token: string): Promise<{ sub: string; email?: unknown }>;
};

export const cognitoJwtVerifierProvider: Provider = {
  provide: COGNITO_JWT_VERIFIER,
  useFactory: (): CognitoIdTokenVerifier => {
    const { userPoolId, clientId } = loadAuthConfig();

    // The ID token is what the SPA sends: unlike the access token it carries an
    // `email` claim, and its `aud` matches the app client id (which is also what
    // the API Gateway JWT authorizer checks).
    //
    // The JWKS is fetched once per warm container and cached from then on, so
    // this costs one HTTPS GET per cold start rather than one per request.
    return CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: 'id',
    });
  },
};
