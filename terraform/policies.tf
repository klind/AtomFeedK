# DynamoDB Policy
resource "aws_iam_policy" "dynamodb_access" {
  name        = "hcm-developer-util-dynamodb-access"
  description = "Policy for HCM Developer Util DynamoDB access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          "arn:aws:dynamodb:eu-north-1:*:table/hcm_atom_feed_employee_*",
          "arn:aws:dynamodb:eu-north-1:*:table/hcm_atom_feed_employee_*/index/*"
        ]
      }
    ]
  })
}

# Elastic Beanstalk Policy
resource "aws_iam_policy" "elasticbeanstalk_access" {
  name        = "hcm-developer-util-elasticbeanstalk-access"
  description = "Policy for HCM Developer Util Elastic Beanstalk access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "elasticbeanstalk:*",
          "ec2:*",
          "cloudwatch:*",
          "logs:*",
          "autoscaling:*",
          "cloudformation:*",
          "elasticloadbalancing:*",
          "iam:GetPolicyVersion",
          "iam:GetRole",
          "iam:PassRole",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "sns:*"
        ]
        Resource = "*"
      }
    ]
  })
}

# S3 Policy for Elastic Beanstalk deployments
resource "aws_iam_policy" "s3_access" {
  name        = "hcm-developer-util-s3-access"
  description = "Policy for HCM Developer Util S3 access for deployments"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetBucketLocation",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:ListAllMyBuckets"
        ]
        Resource = [
          "arn:aws:s3:::elasticbeanstalk-*",
          "arn:aws:s3:::elasticbeanstalk-*/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs Policy
resource "aws_iam_policy" "cloudwatch_logs_access" {
  name        = "hcm-developer-util-cloudwatch-logs-access"
  description = "Policy for HCM Developer Util CloudWatch Logs access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents"
        ]
        Resource = [
          "arn:aws:logs:eu-north-1:*:log-group:/aws/elasticbeanstalk/*",
          "arn:aws:logs:eu-north-1:*:log-group:/aws/elasticbeanstalk/*:log-stream:*"
        ]
      }
    ]
  })
}

# Policy Attachments
resource "aws_iam_user_policy_attachment" "dynamodb_policy_attach" {
  user       = aws_iam_user.hcm_developer_util.name
  policy_arn = aws_iam_policy.dynamodb_access.arn
}

resource "aws_iam_user_policy_attachment" "elasticbeanstalk_policy_attach" {
  user       = aws_iam_user.hcm_developer_util.name
  policy_arn = aws_iam_policy.elasticbeanstalk_access.arn
}

resource "aws_iam_user_policy_attachment" "s3_policy_attach" {
  user       = aws_iam_user.hcm_developer_util.name
  policy_arn = aws_iam_policy.s3_access.arn
}

resource "aws_iam_user_policy_attachment" "cloudwatch_logs_policy_attach" {
  user       = aws_iam_user.hcm_developer_util.name
  policy_arn = aws_iam_policy.cloudwatch_logs_access.arn
} 