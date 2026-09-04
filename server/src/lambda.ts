import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import serverlessExpress from '@vendia/serverless-express';
import type { Handler, Context, APIGatewayProxyEventV2 } from 'aws-lambda';
import { AppModule } from './app.module';

// Lambda entry point for future AWS deployment behind API Gateway (HTTP API,
// Lambda proxy integration). Not exercised locally — `start`/`start:dev` use
// main.ts instead. See server/infra for the OpenTofu module that wires this
// up to API Gateway.

let cachedHandler: Handler;

async function bootstrapServer(): Promise<Handler> {
  const expressAdapter = new ExpressAdapter();
  const app = await NestFactory.create(AppModule, expressAdapter);

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();

  return serverlessExpress({ app: expressAdapter.getInstance() });
}

export const handler: Handler = async (
  event: APIGatewayProxyEventV2,
  context: Context,
) => {
  cachedHandler = cachedHandler ?? (await bootstrapServer());

  return cachedHandler(event, context, () => undefined);
};
