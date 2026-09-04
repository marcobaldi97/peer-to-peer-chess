import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { cognitoJwtVerifierProvider } from './cognito-verifier.provider';

// Registered as APP_GUARD rather than app.useGlobalGuards() on purpose: the
// bootstrap config is duplicated across main.ts and lambda.ts, so a guard added
// there would only cover whichever entry point someone remembered. Doing it in
// a module means both — and any future entry point — are protected by default.
@Module({
  providers: [
    cognitoJwtVerifierProvider,
    { provide: APP_GUARD, useClass: CognitoAuthGuard },
  ],
})
export class AuthModule {}
