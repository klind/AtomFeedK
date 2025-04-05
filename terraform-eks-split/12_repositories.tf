# ECR Repositories
resource "aws_ecr_repository" "backend" {
  name = "hcm-developer-util-backend"
  force_delete = true
}

resource "aws_ecr_repository" "frontend" {
  name = "hcm-developer-util-frontend"
  force_delete = true
}