# Configure AWS Provider
provider "aws" {
  region = "eu-north-1"
}

# Create IAM User
resource "aws_iam_user" "hcm_developer_util" {
  name = "hcm-developer-util"

  tags = {
    Environment = "dev"
    Application = "HCM Developer Util"
  }
}

# Create access key for the IAM user
resource "aws_iam_access_key" "hcm_developer_util_key" {
  user = aws_iam_user.hcm_developer_util.name
}

# Create a secret in AWS Secrets Manager
resource "aws_secretsmanager_secret" "hcm_developer_util_credentials" {
  name        = "hcm-developer-util/credentials"
  description = "Access credentials for HCM Developer Util application"

  tags = {
    Environment = "development"
    Application = "HCM Developer Util"
  }
}

# Store the credentials in the secret
resource "aws_secretsmanager_secret_version" "credentials" {
  secret_id = aws_secretsmanager_secret.hcm_developer_util_credentials.id
  secret_string = jsonencode({
    access_key_id     = aws_iam_access_key.hcm_developer_util_key.id
    secret_access_key = aws_iam_access_key.hcm_developer_util_key.secret
    region            = "eu-north-1"
    application       = "hcm-developer-util"
  })
}

# Outputs for reference (be careful with these in production)
output "secret_arn" {
  value       = aws_secretsmanager_secret.hcm_developer_util_credentials.arn
  description = "ARN of the secret containing the credentials"
} 