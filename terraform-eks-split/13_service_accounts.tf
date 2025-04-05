# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Create the IAM role that can be assumed by the service account
resource "aws_iam_role" "backend_service_role" {
  name = "hcm-developer-util-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_iam_openid_connect_provider.eks.url, "https://", "")}:sub" = "system:serviceaccount:default:hcm-developer-util-backend-service-account"
          }
        }
      }
    ]
  })
}

# Attach DynamoDB Full Access policy to the role
resource "aws_iam_role_policy_attachment" "dynamodb_access" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# Service account for backend to access DynamoDB
resource "kubernetes_service_account" "backend_service_account" {
  metadata {
    name      = "hcm-developer-util-backend-service-account"
    namespace = "default"
    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.backend_service_role.arn
    }
  }

  depends_on = [
    aws_eks_cluster.main
  ]
} 