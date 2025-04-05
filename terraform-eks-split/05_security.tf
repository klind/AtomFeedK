# Security Group for EKS Nodes
resource "aws_security_group" "eks_nodes" {
  name_prefix = "eks-nodes-"
  description = "Security group for EKS nodes"
  vpc_id      = aws_vpc.main.id

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow inter-node communication
  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  # Allow control plane to node communication on port 443 (HTTPS)
  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
    description     = "Allow HTTPS from control plane"
  }

  # Allow control plane to node communication
  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  tags = {
    Name = "eks-node-sg"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  }
}

# KMS key for cluster encryption
resource "aws_kms_key" "eks" {
  description = "EKS Secret Encryption Key"
  enable_key_rotation = true

  tags = {
    Name = "hcm-developer-util-eks-key"
  }
} 