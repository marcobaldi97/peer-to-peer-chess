variable "aws_region" {
  description = "AWS region to deploy the Lambda + API Gateway into."
  type        = string
  default     = "us-east-1"
}

variable "function_name" {
  description = "Name of the Lambda function (and related resources)."
  type        = string
  default     = "peer-to-peer-chess-api"
}

variable "lambda_zip_path" {
  description = <<-EOT
    Path to the built Lambda deployment package (a .zip containing at least
    dist/lambda.js and node_modules). This module does not build or zip
    anything itself — run `pnpm run build` in server/ and package dist/ +
    production node_modules yourself, then point this at the resulting zip.
  EOT
  type        = string
}

variable "memory_size" {
  description = "Memory (MB) allocated to the Lambda function."
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Lambda function timeout, in seconds."
  type        = number
  default     = 5
}

variable "reserved_concurrency" {
  description = <<-EOT
    Reserved (and therefore maximum) concurrent executions for the Lambda
    function. Acts as a hard cost/blast-radius cap — this is a pet project,
    not something that needs to scale. Requests beyond this concurrency are
    throttled by Lambda rather than running unbounded.
  EOT
  type        = number
  default     = 10
}

variable "api_throttling_rate_limit" {
  description = <<-EOT
    Steady-state requests-per-second allowed through the HTTP API's default
    stage before API Gateway starts returning 429s. Kept low on purpose: this
    throttles abusive/flooding traffic at the gateway, before it can reach
    (and bill) the Lambda.
  EOT
  type        = number
  default     = 20
}

variable "api_throttling_burst_limit" {
  description = "Token bucket burst capacity for the HTTP API's default stage, on top of api_throttling_rate_limit."
  type        = number
  default     = 40
}

variable "cognito_domain_prefix" {
  description = <<-EOT
    Prefix for the Cognito Hosted UI domain, giving
    https://<prefix>.auth.<region>.amazoncognito.com. Must be globally unique
    across all AWS accounts, so namespace it (e.g. "p2p-chess-marcobaldi").
  EOT
  type        = string
}

variable "callback_urls" {
  description = <<-EOT
    OAuth redirect URIs the Cognito app client will accept. The frontend derives
    its redirect URI from window.location.origin plus a trailing slash, so these
    must carry that trailing slash to match exactly.
  EOT
  type        = list(string)
  default     = ["https://chess.marcobaldi.me/", "http://localhost:5173/"]
}

variable "logout_urls" {
  description = "Post-logout redirect URIs. Cognito requires logout_uri to match one of these exactly."
  type        = list(string)
  default     = ["https://chess.marcobaldi.me/", "http://localhost:5173/"]
}

variable "cors_allowed_origins" {
  description = <<-EOT
    Origins allowed by the HTTP API's CORS configuration. Unlike the callback
    URLs these are scheme+host+port only — no trailing slash.
  EOT
  type        = list(string)
  default     = ["https://chess.marcobaldi.me", "http://localhost:5173"]
}

variable "google_client_id" {
  description = "OAuth client ID from the Google Cloud Console (created by hand — see README)."
  type        = string
}

variable "google_client_secret" {
  description = "OAuth client secret from the Google Cloud Console."
  type        = string
  sensitive   = true
}

variable "environment_variables" {
  description = "Extra environment variables to pass to the Lambda function."
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Tags applied to all resources created by this module."
  type        = map(string)
  default     = {}
}
