# CoreDNS addon - provides cluster DNS and service discovery
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  # CoreDNS depends on the node group being available
  depends_on = [
    aws_eks_node_group.simple
  ]
}

# kube-proxy addon - manages network rules on nodes for service-to-service traffic
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "OVERWRITE"

  # kube-proxy depends on the node group being available
  depends_on = [
    aws_eks_node_group.simple
  ]
} 