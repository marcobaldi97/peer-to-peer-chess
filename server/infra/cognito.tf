# --- Cognito user pool -----------------------------------------------------

resource "aws_cognito_user_pool" "main" {
  name = "${var.function_name}-users"

  # Users sign in with their email address rather than a separate username.
  # NOTE: this is immutable — changing it later forces the pool to be replaced,
  # which loses every registered user.
  username_attributes = ["email"]

  # Cognito emails a verification code on self-signup, and the Hosted UI renders
  # the code-entry and forgot-password screens itself. This is what saves us
  # from building those flows.
  auto_verified_attributes = ["email"]

  deletion_protection = "INACTIVE"

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 8
    require_lowercase                = true
    require_numbers                  = true
    require_uppercase                = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  admin_create_user_config {
    allow_admin_create_user_only = false
  }

  # COGNITO_DEFAULT sending is free but capped at 50 emails/day account-wide,
  # which covers signup verification and password resets at this scale. Moving
  # to SES is the upgrade path if that cap is ever hit.
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 1
      max_length = 256
    }
  }

  # Deliberately no `user_pool_add_ons` block: threat protection is the Cognito
  # "Plus" feature tier and is the easiest way to run up a bill here.

  tags = var.tags
}

resource "aws_cognito_user_pool_domain" "main" {
  # Must be globally unique across ALL AWS accounts, not just this one.
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.main.id
}

# --- Google identity provider ----------------------------------------------

# Requires an OAuth client created by hand in the Google Cloud Console, with the
# authorised redirect URI set to this pool's /oauth2/idpresponse endpoint. See
# the README for the exact steps.
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
    # Space-separated string, not a list.
    authorize_scopes = "openid email profile"
  }

  # `username` mapping to `sub` is required by Cognito. `picture` is what lets
  # the frontend show a real Google profile photo in the header avatar.
  attribute_mapping = {
    username       = "sub"
    email          = "email"
    email_verified = "email_verified"
    name           = "name"
    picture        = "picture"
  }
}

# --- App client (public SPA) -----------------------------------------------

resource "aws_cognito_user_pool_client" "spa" {
  name         = "${var.function_name}-spa"
  user_pool_id = aws_cognito_user_pool.main.id

  # A browser cannot keep a secret — the SPA uses the authorization code flow
  # with PKCE instead.
  generate_secret = false

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = var.callback_urls
  logout_urls   = var.logout_urls

  # Referencing the resource rather than the literal "Google" forces Terraform
  # to create the identity provider before this client refers to it.
  supported_identity_providers = [
    "COGNITO",
    aws_cognito_identity_provider.google.provider_name,
  ]

  # A Hosted-UI-only client has no use for the legacy SRP/password auth flows.
  explicit_auth_flows = ["ALLOW_REFRESH_TOKEN_AUTH"]

  # Stops the login page leaking whether a given email is registered.
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 30

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}
