resource "aws_launch_template" "eks_nodes" {
  name_prefix            = "hcm-developer-util-eks-node-"
  description            = "EKS Node Launch Template"
  update_default_version = true

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "hcm-developer-util-eks-node"
    }
  }
}

resource "aws_eks_node_group" "simple" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "hcm-developer-util-eks-node-group"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id
  
  # Use Amazon Linux 2023
  ami_type       = "AL2023_x86_64_STANDARD"
  
  instance_types = ["t3.medium"]
  
  scaling_config {
    desired_size = 2
    max_size     = 3
    min_size     = 2
  }
  
  # Add capacity type
  capacity_type = "ON_DEMAND"
  
  # Use the launch template instead of direct disk_size parameter
  launch_template {
    id      = aws_launch_template.eks_nodes.id
    version = aws_launch_template.eks_nodes.latest_version
  }
  
  # Add update config to control node updates
  update_config {
    max_unavailable = 1
  }
  
  # Add labels for better identification
  labels = {
    "os" = "al2023"
    "role" = "worker"
  }
  
  # Tags for better integration with cluster autoscaler and other tools
  tags = {
    "kubernetes.io/cluster/${aws_eks_cluster.main.name}" = "owned"
  }
  
  # Add dependencies on the IAM role policies and VPC CNI addon for proper node initialization
  depends_on = [
    aws_iam_role_policy_attachment.eks_node_group_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry,
    aws_eks_addon.vpc_cni
    # CoreDNS and kube-proxy are intentionally not dependencies
    # They will be installed after the node group
  ]
}