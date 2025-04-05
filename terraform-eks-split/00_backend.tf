# Backend Configuration for State Management
terraform {
  backend "s3" {
    bucket         = "tv2-terraform-state"              # Main state bucket
    key            = "tf-hcm-developer-util-eks-state/terraform.tfstate"  # EKS state folder
    region         = "eu-north-1"
    encrypt        = true
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
} 