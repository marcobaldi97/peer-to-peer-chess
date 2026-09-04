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

# --- Cognito (these feed the frontend's build-time env vars) ----------------

output "cognito_user_pool_id" {
  description = "Cognito user pool id. Set as COGNITO_USER_POOL_ID on the server."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "Cognito app client id. Set as VITE_COGNITO_CLIENT_ID (and COGNITO_CLIENT_ID on the server)."
  value       = aws_cognito_user_pool_client.spa.id
}

output "cognito_issuer_url" {
  description = "OIDC issuer for the user pool. Set as VITE_COGNITO_AUTHORITY."
  value       = "https://${aws_cognito_user_pool.main.endpoint}"
}

output "cognito_hosted_ui_domain" {
  description = "Hosted UI base URL. Set as VITE_COGNITO_DOMAIN (used for the non-standard /logout endpoint)."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}
