# Terraform Runner Infrastructure Configuration
# ------------------------------------------
# This configuration creates the infrastructure required by terraform-remote-executor.sh
# to execute Terraform commands remotely and securely on AWS.
#
# Purpose:
# 1. Creates an EC2 instance that runs Terraform commands
# 2. Sets up SSM for remote command execution
# 3. Configures S3 buckets for file transfer and state management
# 4. Establishes necessary IAM roles and permissions
#
# Components Created:
# ------------------------------------------
# EC2 Instance:
#   - Runs on Amazon Linux 2
#   - Pre-installed with Terraform
#   - Accessible via AWS Systems Manager (SSM)
#   - No direct SSH access required
#
# IAM Resources:
#   - EC2 instance role with permissions for:
#     * SSM operations
#     * S3 access for file transfer
#     * Full AWS access for Terraform operations
#   - Instance profile to attach the role
#
# S3 Buckets:
#   - terraform-runner-files: For temporary file transfer
#   - terraform-runner-state: For Terraform state storage
#   Both buckets are:
#     * Encrypted with AES-256
#     * Blocked from public access
#     * Configured for secure operations
#
# Security:
#   - Security group with only outbound access
#   - SSM for secure command execution
#   - Encrypted storage and transfer
#
# Usage:
# ------------------------------------------
# 1. Apply this configuration first:
#    terraform init && terraform apply
#
# 2. Use terraform-remote-executor.sh to run Terraform commands:
#    ./terraform-remote-executor.sh <directory> <command>
#
# Accessing Logs:
# ------------------------------------------
# 1. Connect to the EC2 instance using SSM:
#    aws ssm start-session --target <instance-id>
#    Example: aws ssm start-session --target i-074a9631a2132a1d3
#
# 2. Switch to ec2-user:
#    sudo su - ec2-user
#
# 3. Monitor Terraform logs:
#    - Log directory: /var/log/terraform
#    - Log file: /var/log/terraform/terraform.log
#    - To watch logs in real-time:
#      tail -f /var/log/terraform/terraform.log
#
# Note: The log directory and file will be created automatically
# when executing terraform commands through terraform-remote-executor.sh
# ------------------------------------------

# Backend Configuration for State Management
terraform {
  backend "s3" {
    bucket         = "tv2-terraform-state"         # Main state bucket
    key            = "tf-runner-state/terraform.tfstate"  # Runner state folder
    region         = "eu-north-1"
    encrypt        = true
  }
}

# AWS Provider configuration
provider "aws" {
  region = "eu-north-1"
}

# S3 bucket for Terraform files
resource "aws_s3_bucket" "terraform_files" {
  bucket        = "terraform-runner-files"
  force_destroy = true  # Allow deletion of bucket with contents
}

# Block public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "terraform_files" {
  bucket = aws_s3_bucket.terraform_files.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable S3 bucket encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_files" {
  bucket = aws_s3_bucket.terraform_files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Add S3 permissions to the instance role
resource "aws_iam_role_policy" "s3_access" {
  name = "terraform-runner-s3-access"
  role = aws_iam_role.terraform_runner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.terraform_files.arn,
          "${aws_s3_bucket.terraform_files.arn}/*"
        ]
      }
    ]
  })
}

# IAM Role for EC2 instance
resource "aws_iam_role" "terraform_runner" {
  name = "terraform-runner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Attach SSM policy to the role
resource "aws_iam_role_policy_attachment" "ssm_policy" {
  role       = aws_iam_role.terraform_runner.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach AdministratorAccess for Terraform operations
# Note: In production, you should create a more restricted policy
resource "aws_iam_role_policy_attachment" "terraform_policy" {
  role       = aws_iam_role.terraform_runner.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

# Create EC2 instance profile
resource "aws_iam_instance_profile" "terraform_runner" {
  name = "terraform-runner-profile"
  role = aws_iam_role.terraform_runner.name
}

# Security Group for EC2 instance
# Note: This security group will be created in the default VPC of the region.
# No vpc_id is specified intentionally, allowing AWS to use the default VPC.
# This ensures the VPC remains untouched during terraform destroy operations.
resource "aws_security_group" "terraform_runner" {
  name        = "terraform-runner-sg"
  description = "Security group for Terraform runner EC2 instance"

  # No inbound rules needed for SSM
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "terraform-runner-sg"
  }
}

# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User data script to install Terraform and AWS CLI v2
locals {
  user_data = <<-EOF
              #!/bin/bash
              set -e # Exit on error
              
              # Redirect yum output to log file
              exec 1> >(tee -a /var/log/user-data.log) 2>&1
              
              echo "Starting system updates and package installation..."
              # Update system packages quietly
              yum update -y -q
              yum install -y -q yum-utils git unzip jq

              echo "Installing Terraform..."
              # Install latest Terraform
              yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo > /dev/null
              yum clean all -q
              yum install -y -q terraform

              echo "Updating AWS CLI..."
              # Remove AWS CLI version 1 quietly
              yum remove -y -q awscli

              # Install AWS CLI version 2
              echo "Installing AWS CLI v2..."
              curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
              unzip -q awscliv2.zip
              sudo ./aws/install --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli --update
              rm -rf aws awscliv2.zip

              # Update PATH for all users
              echo 'export PATH="/usr/local/bin:$PATH"' | sudo tee /etc/profile.d/aws-cli.sh > /dev/null
              source /etc/profile.d/aws-cli.sh

              # Create log directory with proper permissions
              sudo mkdir -p /var/log/terraform
              sudo chown ec2-user:ec2-user /var/log/terraform
              
              echo "Installation complete. Verifying versions..."
              # Verify installations and log versions
              {
                echo "=== Installation Verification ==="
                echo "Terraform Version:"
                terraform version
                echo -e "\nAWS CLI Version:"
                aws --version
                echo -e "\nGit Version:"
                git --version
                echo -e "\nAWS Identity:"
                aws sts get-caller-identity
              } | sudo tee /var/log/terraform/install.log
              
              echo "Setup completed successfully!"
              EOF
}

# EC2 Instance
resource "aws_instance" "terraform_runner" {
  ami                    = data.aws_ami.amazon_linux_2.id
  instance_type          = "t3.micro"
  iam_instance_profile   = aws_iam_instance_profile.terraform_runner.name
  user_data             = base64encode(local.user_data)
  user_data_replace_on_change = true

  vpc_security_group_ids = [aws_security_group.terraform_runner.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  tags = {
    Name = "terraform-runner"
    Purpose = "Terraform Automation"
  }
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.terraform_runner.id
}

output "ssm_connection_command" {
  description = "Command to connect to the instance using SSM"
  value       = "aws ssm start-session --target ${aws_instance.terraform_runner.id}"
}

# Output the S3 bucket name
output "s3_bucket" {
  description = "Name of the S3 bucket for Terraform files"
  value       = aws_s3_bucket.terraform_files.id
}
