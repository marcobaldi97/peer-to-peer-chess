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
  default     = 10
}

variable "reserved_concurrency" {
  description = <<-EOT
    Reserved (and therefore maximum) concurrent executions for the Lambda
    function. Acts as a hard cost/blast-radius cap — this is a pet project,
    not something that needs to scale. Requests beyond this concurrency are
    throttled by Lambda rather than running unbounded.
  EOT
  type        = number
  default     = 5
}

variable "api_throttling_rate_limit" {
  description = <<-EOT
    Steady-state requests-per-second allowed through the HTTP API's default
    stage before API Gateway starts returning 429s. Kept low on purpose: this
    throttles abusive/flooding traffic at the gateway, before it can reach
    (and bill) the Lambda.
  EOT
  type        = number
  default     = 5
}

variable "api_throttling_burst_limit" {
  description = "Token bucket burst capacity for the HTTP API's default stage, on top of api_throttling_rate_limit."
  type        = number
  default     = 10
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
