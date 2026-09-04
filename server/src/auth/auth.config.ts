export type AuthConfig = {
  userPoolId: string;
  clientId: string;
};

// Read straight from process.env rather than pulling in @nestjs/config: there
// are only two values, they are required, and main.ts already reads PORT this
// way. The injectable `env` argument is what makes this testable.
//
// Note there is deliberately no region variable — CognitoJwtVerifier derives
// the region from the user pool id (`<region>_<suffix>`), and AWS_REGION is a
// reserved Lambda environment key that cannot be set from Terraform anyway.
export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const userPoolId = env.COGNITO_USER_POOL_ID;
  const clientId = env.COGNITO_CLIENT_ID;

  // Fail fast at bootstrap. A misconfigured deploy should be loudly broken
  // rather than quietly accepting unverified tokens.
  if (!userPoolId || !clientId) {
    throw new Error(
      'Missing Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must both be set.',
    );
  }

  return { userPoolId, clientId };
}
