#!/bin/bash

# Script to destroy the EKS infrastructure in the proper order
# This script runs Terraform commands directly on your local machine

# Exit on error
set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Display a confirmation prompt
echo "⚠️ WARNING: This script will destroy all EKS infrastructure resources."
echo "This action is IRREVERSIBLE and will delete all data in the EKS cluster."
echo ""
read -p "Are you sure you want to proceed? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

echo "🔄 Starting destruction process..."

# Function to run terraform commands and check for errors
run_terraform() {
    local command=$1
    local description=$2
    
    echo ""
    echo "🔄 $description"
    
    eval "terraform $command"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: $description failed"
        exit 1
    fi
    
    echo "✅ $description completed successfully"
}

# Step 1: Initialize Terraform (just in case)
run_terraform "init" "Initializing Terraform configuration"

# Step 2: Remove kubernetes auth config map first
run_terraform "destroy -target=kubernetes_config_map.aws_auth -auto-approve" "Removing auth config map"

# Step 3: Destroy repositories
run_terraform "destroy -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend -auto-approve" "Destroying repositories"

# Step 4: Destroy CoreDNS and kube-proxy addons
run_terraform "destroy -target=aws_eks_addon.kube_proxy -target=aws_eks_addon.coredns -auto-approve" "Destroying CoreDNS and kube-proxy addons"

# Step 5: Destroy node group
run_terraform "destroy -target=aws_eks_node_group.simple -auto-approve" "Destroying node group"

# Step 6: Destroy VPC CNI addon
run_terraform "destroy -target=aws_eks_addon.vpc_cni -auto-approve" "Destroying VPC CNI addon"

# Step 7: Destroy cluster autoscaler role
run_terraform "destroy -target=aws_iam_role_policy.cluster_autoscaler -target=aws_iam_role.cluster_autoscaler -auto-approve" "Destroying cluster autoscaler role"

# Step 8: Destroy OIDC provider
run_terraform "destroy -target=aws_iam_openid_connect_provider.eks -auto-approve" "Destroying OIDC provider"

# Step 9: Destroy EKS cluster
run_terraform "destroy -target=aws_eks_cluster.main -auto-approve" "Destroying EKS cluster"

# Step 10: Destroy security groups and KMS key
run_terraform "destroy -target=aws_security_group.eks_nodes -target=aws_kms_key.eks -auto-approve" "Destroying security groups and KMS key"

# Step 11: Destroy IAM roles and policies
run_terraform "destroy -target=aws_iam_role_policy.eks_node_additional -target=aws_iam_role_policy_attachment.eks_ssm_policy -target=aws_iam_role_policy_attachment.eks_container_registry -target=aws_iam_role_policy_attachment.eks_cni_policy -target=aws_iam_role_policy_attachment.eks_node_group_policy -target=aws_iam_role_policy_attachment.eks_cluster_policy -target=aws_iam_role.eks_node_group -target=aws_iam_role.eks_cluster -auto-approve" "Destroying IAM roles and policies"

# Step 12: Destroy networking components
run_terraform "destroy -target=aws_route_table_association.private -target=aws_route_table.private -target=aws_nat_gateway.main -target=aws_eip.nat -target=aws_route_table_association.public -target=aws_route_table.public -target=aws_internet_gateway.main -auto-approve" "Destroying network components"

# Step 13: Destroy VPC and subnets
run_terraform "destroy -target=aws_subnet.private -target=aws_subnet.public -target=aws_vpc.main -auto-approve" "Destroying VPC and subnets"

# Step 14: Destroy any remaining resources
run_terraform "destroy -auto-approve" "Destroying remaining resources"

echo ""
echo "🎉 EKS infrastructure has been completely destroyed!"
echo "" 