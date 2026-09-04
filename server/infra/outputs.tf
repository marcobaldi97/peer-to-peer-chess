output "api_invoke_url" {
  description = "Invoke URL for the HTTP API's default stage."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_arn" {
  description = "ARN of the deployed Lambda function."
  value       = aws_lambda_function.api.arn
}

output "lambda_function_name" {
  description = "Name of the deployed Lambda function."
  value       = aws_lambda_function.api.function_name
}
