terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # No state backend configured yet — this is scaffolding. Add a backend
  # block (S3 + DynamoDB lock table, Terraform Cloud, etc.) before this is
  # used for anything real.
}

provider "aws" {
  region = var.aws_region
}

# --- Lambda execution role -------------------------------------------------

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.function_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Lambda function ---------------------------------------------------

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 14
  tags              = var.tags
}

resource "aws_lambda_function" "api" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "dist/lambda.handler"
  runtime       = "nodejs20.x"
  memory_size   = var.memory_size
  timeout       = var.timeout

  # Hard ceiling on concurrent executions. This is a pet project, not a
  # service that needs to scale — the goal here is a cost/blast-radius cap
  # (a request flood queues or gets throttled instead of fanning out to
  # unbounded concurrent, billable invocations), not throughput.
  reserved_concurrent_executions = var.reserved_concurrency

  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)

  environment {
    variables = var.environment_variables
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic_execution,
    aws_cloudwatch_log_group.lambda,
  ]

  tags = var.tags
}

# --- HTTP API (API Gateway v2) ------------------------------------------

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.function_name}-http-api"
  protocol_type = "HTTP"
  tags          = var.tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  # Throttle at the API Gateway edge, ahead of the Lambda. This is the cheap,
  # built-in guard against a request flood (accidental or malicious) turning
  # into a runaway bill: excess requests get a 429 from API Gateway itself
  # instead of reaching (and billing) the Lambda. Deliberately conservative
  # for a pet project — raise these if real traffic ever needs more.
  default_route_settings {
    throttling_burst_limit = var.api_throttling_burst_limit
    throttling_rate_limit  = var.api_throttling_rate_limit
  }

  tags = var.tags
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
