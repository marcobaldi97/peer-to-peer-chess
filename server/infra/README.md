# server/infra

OpenTofu scaffolding for hosting the `server/` NestJS API on AWS Lambda,
fronted by an API Gateway HTTP API. This is **scaffolding, not a deployed
stack**:

- No state backend is configured (state would default to local `tofu.tfstate`
  if ever applied). Add an S3 + DynamoDB (or Terraform Cloud) backend before
  using this for real.
- Nothing here is wired into CI/CD. No pipeline builds the Lambda zip or runs
  `tofu apply` automatically.
- This module does not build or package the Lambda code — you provide a
  path to an already-built zip via `lambda_zip_path`.

## What it creates

- An IAM role for the Lambda function (assume-role policy for
  `lambda.amazonaws.com`) with the AWS-managed basic execution policy
  attached (CloudWatch Logs).
- The `aws_lambda_function` itself (Node.js 20.x runtime, handler
  `dist/lambda.handler`, matching `server/src/lambda.ts`'s exported
  `handler`), with `reserved_concurrent_executions` capped at
  `var.reserved_concurrency` (default **5**).
- A CloudWatch log group for the function.
- An API Gateway HTTP API (`aws_apigatewayv2_api`, protocol `HTTP`) with a
  Lambda proxy integration, a `$default` route, and an auto-deploying
  `$default` stage that throttles at `var.api_throttling_rate_limit`
  requests/sec with a `var.api_throttling_burst_limit` burst (defaults **5**
  req/s, burst **10**).
- The `aws_lambda_permission` that lets API Gateway invoke the function.

### Cost/abuse protection

This is a pet project — the goal is capping worst-case cost from a flood of
requests (accidental or an actual attack), not handling real scale. Two
cheap, built-in guards do that instead of anything heavier:

- **API Gateway throttling** (`default_route_settings` on the stage) rejects
  excess requests with `429` at the edge, before they ever invoke the
  Lambda — so a flood doesn't turn into a pile of billed invocations.
- **Lambda reserved concurrency** caps how many invocations can run at once
  regardless of what gets past the gateway, so nothing runs unbounded.

Deliberately **not** added: AWS WAF. It can attach to an HTTP API, but it
has its own minimum monthly cost plus per-request/per-rule pricing, which is
overkill here — the throttle + concurrency cap above already bound the
downside for a low-traffic pet project. Revisit if this ever needs to handle
public, unauthenticated traffic at real scale.

## Using it (once you actually have AWS credentials)

1. Build the server and produce a deployment zip (not automated here):

   ```bash
   cd server
   pnpm install
   pnpm run build
   # package dist/ + production node_modules into a zip, e.g.:
   #   npm prune --omit=dev  (or an equivalent) then zip -r lambda.zip dist node_modules package.json
   ```

2. From this directory, with AWS credentials available in your environment:

   ```bash
   cd server/infra
   tofu init
   tofu plan -var lambda_zip_path=../lambda.zip
   tofu apply -var lambda_zip_path=../lambda.zip
   ```

3. The `api_invoke_url` output is the base URL to point the frontend's
   `VITE_API_URL` at.

## Validating without AWS credentials

```bash
cd server/infra
tofu init -backend=false
tofu validate
tofu fmt -check
```

This checks syntax/types only — it does not talk to AWS.
