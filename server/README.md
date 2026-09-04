# peer-to-peer-chess server

A minimal, standalone NestJS backend for the "save game" feature. It is
intentionally a thin vertical slice: no auth, no database — just enough to
receive a completed game and hand back a confirmation.

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

Body (JSON):

```json
{
  "email": "player@example.com",
  "pgn": "1. e4 e5 2. Qh5 ...",
  "status": "checkmate",
  "playedAt": "2026-01-01T12:00:00.000Z"
}
```

- `email` is a plain, unauthenticated stand-in identity — there is no login
  yet, the client just sends whatever email the player types in.
- `status` is the game's terminal status string (e.g. `checkmate`,
  `stalemate`, `draw`) from the frontend's `GameStatus` enum.
- `playedAt` is an ISO-8601 timestamp.

Returns `201 Created` with `{ id, email, savedAt }`.

Submissions are kept in an in-memory array (see
`src/saved-games/saved-games.service.ts`) and logged — nothing is persisted
across restarts.

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

A couple of standard Nest/Jest unit tests live alongside the source
(`*.spec.ts`).

## Future work

- **Auth**: replace the plain `email` field with a real identity from AWS
  Cognito (or similar) once auth exists.
- **Persistence**: swap the in-memory store in `SavedGamesService` for
  DynamoDB (or another managed store).
- **Deployment**: `src/lambda.ts` is a Lambda handler entry point that wraps
  this same Nest app for API Gateway's Lambda proxy integration. It isn't
  wired into any real AWS traffic yet — the OpenTofu module in
  [`infra/`](./infra) scaffolds the Lambda + HTTP API resources for that, but
  building/zipping the Lambda artifact and running `tofu apply` against real
  AWS credentials is still a manual, future step.
