# peer-to-peer-chess server

A minimal, standalone NestJS backend for the "save game" feature. It is
intentionally a thin vertical slice: no database, and a single endpoint — just
enough to receive a completed game from a signed-in player and hand back a
confirmation. Requests are authenticated with an AWS Cognito ID token.

This is a separate package from the root frontend project (its own
`package.json`/lockfile, not part of any pnpm workspace). Always `cd server`
before running any commands here.

## Running locally

```bash
cd server
pnpm install
pnpm run start:dev
```

The API listens on `http://localhost:3000` by default (override with the
`PORT` env var). CORS is wide open for now, which is fine for local/dev use
but should be locked down before this is exposed publicly.

## The endpoint

`POST /games`

Requires an `Authorization: Bearer <Cognito ID token>` header. Without a valid
token the request is rejected with `401`.

Body (JSON):

```json
{
  "pgn": "1. e4 e5 2. Qh5 ...",
  "status": "checkmate",
  "playedAt": "2026-01-01T12:00:00.000Z"
}
```

- `status` is the game's terminal status string (e.g. `checkmate`,
  `stalemate`, `draw`) from the frontend's `GameStatus` enum.
- `playedAt` is an ISO-8601 timestamp.
- The player's identity comes from the verified token (`sub`, plus `email` when
  the token carries that claim) and never from the body. An `email` field sent
  by an older client is silently stripped by the global `ValidationPipe`'s
  `whitelist` option rather than rejected.

Returns `201 Created` with `{ id, savedAt }`.

Submissions are kept in an in-memory array (see
`src/saved-games/saved-games.service.ts`) and logged by Cognito `sub` rather
than email, to keep personal data out of CloudWatch. Nothing is persisted
across restarts.

## Configuration

Two environment variables are required:

| Variable | Where it comes from |
| --- | --- |
| `COGNITO_USER_POOL_ID` | the `cognito_user_pool_id` output in `infra/` |
| `COGNITO_CLIENT_ID` | the `cognito_user_pool_client_id` output in `infra/` |

The app **fails to start** when either is missing rather than falling back to
accepting unverified tokens. There is deliberately no region variable — it is
derived from the user pool id. In the deployed stack the OpenTofu module sets
both on the Lambda automatically.

Tokens are verified with [`aws-jwt-verify`](https://github.com/awslabs/aws-jwt-verify)
in a guard registered as an `APP_GUARD`, so it covers every route through both
the `main.ts` and `lambda.ts` entry points. The signing keys are fetched once
per warm container and cached.

## Building

```bash
pnpm run build
```

Compiles to `dist/`. `dist/main.js` is the local Express entry point;
`dist/lambda.js` (built from `src/lambda.ts`) is a separate entry point meant
for AWS Lambda — see "Future work" below.

## Testing

```bash
pnpm test
```

Standard Nest/Jest unit tests live alongside the source (`*.spec.ts`), plus
`saved-games/saved-games.api.spec.ts`, which drives the real HTTP pipeline with
supertest to prove the guard rejects unauthenticated requests. That
integration-style spec sits under `src/` rather than the conventional `test/`
directory because Jest is configured inline in `package.json` with
`rootDir: "src"` — anything outside `src/` is not collected. It overrides the
token verifier, so it needs no AWS credentials and makes no network calls.

## Future work

- **Persistence**: swap the in-memory store in `SavedGamesService` for
  DynamoDB (or another managed store).
- **Deployment**: `src/lambda.ts` is a Lambda handler entry point that wraps
  this same Nest app for API Gateway's Lambda proxy integration. It isn't
  wired into any real AWS traffic yet — the OpenTofu module in
  [`infra/`](./infra) scaffolds the Lambda + HTTP API resources for that, but
  building/zipping the Lambda artifact and running `tofu apply` against real
  AWS credentials is still a manual, future step.
