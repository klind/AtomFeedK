#!/bin/bash

# Script to deploy the EKS infrastructure in the proper order
# This script runs Terraform commands directly on your local machine

# Exit on error
set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting EKS infrastructure deployment locally..."

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

# Step 1: Initialize Terraform
run_terraform "init" "Initializing Terraform configuration"

# Step 2: Create VPC and network infrastructure
run_terraform "apply -target=aws_vpc.main -target=aws_subnet.public -target=aws_subnet.private -auto-approve" "Creating VPC and subnets"

# Step 3: Set up networking components (IGW, NAT, route tables)
run_terraform "apply -target=aws_internet_gateway.main -target=aws_route_table.public -target=aws_route_table_association.public -target=aws_eip.nat -target=aws_nat_gateway.main -target=aws_route_table.private -target=aws_route_table_association.private -auto-approve" "Creating network components"

# Step 4: Create IAM roles and policies
run_terraform "apply -target=aws_iam_role.eks_cluster -target=aws_iam_role.eks_node_group -target=aws_iam_role_policy_attachment.eks_cluster_policy -target=aws_iam_role_policy_attachment.eks_node_group_policy -target=aws_iam_role_policy_attachment.eks_cni_policy -target=aws_iam_role_policy_attachment.eks_container_registry -target=aws_iam_role_policy_attachment.eks_ssm_policy -auto-approve" "Creating IAM roles and policies"

# Step 5: Create security groups and KMS key
run_terraform "apply -target=aws_security_group.eks_nodes -target=aws_kms_key.eks -auto-approve" "Creating security groups and KMS key"

# Step 6: Create the EKS cluster
run_terraform "apply -target=aws_eks_cluster.main -auto-approve" "Creating EKS cluster"

# Step 7: Create OIDC provider and cluster autoscaler IAM role
run_terraform "apply -target=data.tls_certificate.eks -target=aws_iam_openid_connect_provider.eks -target=aws_iam_role.cluster_autoscaler -target=aws_iam_role_policy.cluster_autoscaler -auto-approve" "Creating OIDC provider and cluster autoscaler role"

# Step 8: Create auth config map
run_terraform "apply -target=kubernetes_config_map.aws_auth -auto-approve" "Creating auth config map"

# Step 9: Create VPC CNI addon
run_terraform "apply -target=aws_eks_addon.vpc_cni -auto-approve" "Creating VPC CNI addon"

# Step 10: Create node group
run_terraform "apply -target=aws_eks_node_group.simple -auto-approve" "Creating node group"

# Step 11: Create CoreDNS and kube-proxy addons
run_terraform "apply -target=aws_eks_addon.coredns -target=aws_eks_addon.kube_proxy -auto-approve" "Creating CoreDNS and kube-proxy addons"

# Step 12: Create repositories
run_terraform "apply -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend -auto-approve" "Creating repositories"

# Step 13: Create service accounts and trust policies
run_terraform "apply -target=aws_iam_role.backend_service_role -target=aws_iam_role_policy_attachment.dynamodb_access -target=kubernetes_service_account.backend_service_account -auto-approve" "Creating service accounts and trust policies"

# Step 14: Install AWS Load Balancer Controller
run_terraform "apply -target=aws_iam_policy.lb_controller -target=aws_iam_role.lb_controller_role -target=aws_iam_role_policy_attachment.lb_controller_attachment -target=kubernetes_service_account.lb_controller -target=helm_release.lb_controller -auto-approve" "Installing AWS Load Balancer Controller"

# Step 15: Apply any remaining resources
run_terraform "apply -auto-approve" "Applying remaining resources"

echo ""
echo "🎉 EKS infrastructure deployment completed successfully!"
echo "You can access your cluster using:"
echo "aws eks update-kubeconfig --name hcm-developer-util-cluster --region eu-north-1"
echo ""

# Wait for a bit to allow all resources to fully initialize
echo "Waiting 60 seconds for AWS resources to fully initialize before validation..."
sleep 60

# Run the validation script
echo ""
echo "🔍 Validating that all resources have been properly created..."
./validate-deploy.sh

# Capture the validation exit code
VALIDATE_EXIT_CODE=$?

# Final status message based on validation results
if [ $VALIDATE_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Deployment validated: All resources have been successfully created and are ready to use!"
else
    echo ""
    echo "⚠️ Some resources might not be fully deployed or configured. Please review the validation output above."
fi

exit $VALIDATE_EXIT_CODE 