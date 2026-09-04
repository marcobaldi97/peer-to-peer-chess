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
  `var.reserved_concurrency`.
- A CloudWatch log group for the function.
- An API Gateway HTTP API (`aws_apigatewayv2_api`, protocol `HTTP`) with a
  Lambda proxy integration, a `$default` route, and an auto-deploying
  `$default` stage that throttles at `var.api_throttling_rate_limit`
  requests/sec with a `var.api_throttling_burst_limit` burst.
- The `aws_lambda_permission` that lets API Gateway invoke the function.
- **Cognito** (in [`cognito.tf`](./cognito.tf)): a user pool with email
  sign-in and self-service signup, a Hosted UI domain, a Google identity
  provider, and a public SPA app client using the authorization code flow with
  PKCE.
- An `aws_apigatewayv2_authorizer` (JWT) attached to the `$default` route,
  validating Cognito ID tokens at the edge.

### ⚠️ The JWT authorizer protects the whole API

`$default` is the catch-all route, so attaching the authorizer to it means
**every path and method requires a valid token**. That is intended — the entire
surface is `POST /games` and saving is exactly what should require sign-in — but
it does mean there is no unauthenticated health check. If a public endpoint is
ever needed, give it its own route (e.g. `route_key = "GET /health"`) with
`authorization_type = "NONE"`; more specific routes win over `$default`.

### ⚠️ CORS lives on the API, not just in Nest

`cors_configuration` on `aws_apigatewayv2_api` is load-bearing, not decorative.
Sending an `Authorization` header makes the request non-simple, so browsers
first send an `OPTIONS` preflight **without** that header. Without CORS
configured on the API itself, that preflight would hit `$default`, fail the
authorizer with a `401`, and surface in the browser as an opaque CORS error
with the real `POST` never being sent. With it configured, API Gateway answers
preflight itself and never invokes the route or the authorizer.

Nest's own `enableCors()` stays for local development; API Gateway ignores
integration-returned CORS headers when it has its own configuration.

### Cost/abuse protection

This is a pet project — the goal is capping worst-case cost from a flood of
requests (accidental or an actual attack), not handling real scale. Two
cheap, built-in guards do that instead of anything heavier:

- **API Gateway throttling** (`default_route_settings` on the stage) rejects
  excess requests with `429` at the edge, before they ever invoke the
  Lambda — so a flood doesn't turn into a pile of billed invocations.
- **Lambda reserved concurrency** caps how many invocations can run at once
  regardless of what gets past the gateway, so nothing runs unbounded.

- **The JWT authorizer** now also helps here: unauthenticated requests are
  rejected inside API Gateway without invoking the Lambda at all. JWT
  authorizers are evaluated at no extra charge, unlike Lambda authorizers,
  which bill an invocation per request.

Deliberately **not** added: AWS WAF. It can attach to an HTTP API, but it
has its own minimum monthly cost plus per-request/per-rule pricing, which is
overkill here — the throttle + concurrency cap above already bound the
downside for a low-traffic pet project. Revisit if this ever needs to handle
public, unauthenticated traffic at real scale.

Also deliberately **not** enabled: Cognito's `user_pool_add_ons` (threat
protection). That is the Cognito "Plus" feature tier and is the easiest way to
run up a bill on an otherwise near-free user pool. The Hosted UI on a prefix
domain is free, and email sending uses `COGNITO_DEFAULT`, which is free but
capped at 50 emails/day account-wide (signup verification and password resets
draw on that). Moving to SES is the upgrade path.

## ⚠️ Manual prerequisite: the Google OAuth client

OpenTofu cannot create this — do it **before** `tofu apply`:

1. In the Google Cloud Console, create or pick a project.
2. **APIs & Services → OAuth consent screen**: User type **External**, fill in
   the app name and support emails, and add the `openid`,
   `.../auth/userinfo.email` and `.../auth/userinfo.profile` scopes. Either
   publish the app or add yourself under **Test users** — an unpublished app
   only works for listed test users.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Web application**.
4. **Authorised JavaScript origins**:
   `https://<cognito_domain_prefix>.auth.<region>.amazoncognito.com`
5. **Authorised redirect URIs**:
   `https://<cognito_domain_prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse`
   — this exact path. Getting it wrong produces Google's
   `redirect_uri_mismatch` error on the first sign-in attempt.
6. Pass the client ID and secret as `TF_VAR_google_client_id` /
   `TF_VAR_google_client_secret`, or via a `terraform.tfvars` (already
   gitignored).

There is no chicken-and-egg problem: you choose `cognito_domain_prefix`
yourself, so the Cognito URL is predictable before the first apply. Note the
prefix must be **globally unique across all AWS accounts**, so namespace it.

## Wiring the outputs into the frontend

After `tofu apply`, set these as GitHub repository **Variables** (they are
public values that get inlined into the JS bundle, so they are not Secrets):

| Output | Frontend variable |
| --- | --- |
| `api_invoke_url` | `VITE_API_URL` |
| `cognito_issuer_url` | `VITE_COGNITO_AUTHORITY` |
| `cognito_user_pool_client_id` | `VITE_COGNITO_CLIENT_ID` |
| `cognito_hosted_ui_domain` | `VITE_COGNITO_DOMAIN` |

`.github/workflows/deploy.yml` already reads all four. Leaving them unset
builds a working site with sign-in and save hidden.

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
