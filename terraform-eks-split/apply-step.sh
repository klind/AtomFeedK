#!/bin/bash

# Script to apply a specific step of the EKS infrastructure deployment
# This script runs Terraform commands directly on your local machine

# Exit on error
set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if step argument is provided
if [ $# -lt 1 ]; then
    echo "Usage: $0 <step_number> [remote]"
    echo ""
    echo "Steps available:"
    echo "1 - Initialize Terraform"
    echo "2 - Create VPC and subnets"
    echo "3 - Create networking components (IGW, NAT, route tables)"
    echo "4 - Create IAM roles and policies"
    echo "5 - Create security groups and KMS key"
    echo "6 - Create EKS cluster"
    echo "7 - Create OIDC provider and cluster autoscaler role"
    echo "8 - Create auth config map"
    echo "9 - Create VPC CNI addon"
    echo "10 - Create node group"
    echo "11 - Create CoreDNS and kube-proxy addons"
    echo "12 - Create repositories"
    echo "13 - Apply remaining resources"
    echo ""
    echo "Optional: Add 'remote' as second argument to run via terraform-remote-executor"
    exit 1
fi

STEP=$1
USE_REMOTE=false

# Check if remote flag is set
if [ "$2" = "remote" ]; then
    USE_REMOTE=true
    echo "Using remote execution mode"
fi

# Function to run terraform commands and check for errors
run_terraform() {
    local command=$1
    local description=$2
    
    echo ""
    echo "🔄 $description"
    
    if [ "$USE_REMOTE" = true ]; then
        PARENT_DIR="$(dirname "$SCRIPT_DIR")"
        "$PARENT_DIR/terraform-remote-executor.sh" terraform-eks-split "$command"
    else
        eval "terraform $command"
    fi
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: $description failed"
        exit 1
    fi
    
    echo "✅ $description completed successfully"
}

# Apply the specific step
case $STEP in
    1)
        run_terraform "init" "Initializing Terraform configuration"
        ;;
    2)
        run_terraform "apply -target=aws_vpc.main -target=aws_subnet.public -target=aws_subnet.private -auto-approve" "Creating VPC and subnets"
        ;;
    3)
        run_terraform "apply -target=aws_internet_gateway.main -target=aws_route_table.public -target=aws_route_table_association.public -target=aws_eip.nat -target=aws_nat_gateway.main -target=aws_route_table.private -target=aws_route_table_association.private -auto-approve" "Creating network components"
        ;;
    4)
        run_terraform "apply -target=aws_iam_role.eks_cluster -target=aws_iam_role.eks_node_group -target=aws_iam_role_policy_attachment.eks_cluster_policy -target=aws_iam_role_policy_attachment.eks_node_group_policy -target=aws_iam_role_policy_attachment.eks_cni_policy -target=aws_iam_role_policy_attachment.eks_container_registry -target=aws_iam_role_policy_attachment.eks_ssm_policy -auto-approve" "Creating IAM roles and policies"
        ;;
    5)
        run_terraform "apply -target=aws_security_group.eks_nodes -target=aws_kms_key.eks -auto-approve" "Creating security groups and KMS key"
        ;;
    6)
        run_terraform "apply -target=aws_eks_cluster.main -auto-approve" "Creating EKS cluster"
        ;;
    7)
        run_terraform "apply -target=data.tls_certificate.eks -target=aws_iam_openid_connect_provider.eks -target=aws_iam_role.cluster_autoscaler -target=aws_iam_role_policy.cluster_autoscaler -auto-approve" "Creating OIDC provider and cluster autoscaler role"
        ;;
    8)
        run_terraform "apply -target=kubernetes_config_map.aws_auth -auto-approve" "Creating auth config map"
        ;;
    9)
        run_terraform "apply -target=aws_eks_addon.vpc_cni -auto-approve" "Creating VPC CNI addon"
        ;;
    10)
        run_terraform "apply -target=aws_eks_node_group.simple -auto-approve" "Creating node group"
        ;;
    11)
        run_terraform "apply -target=aws_eks_addon.coredns -target=aws_eks_addon.kube_proxy -auto-approve" "Creating CoreDNS and kube-proxy addons"
        ;;
    12)
        run_terraform "apply -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend -auto-approve" "Creating repositories"
        ;;
    13)
        run_terraform "apply -auto-approve" "Applying remaining resources"
        ;;
    *)
        echo "Invalid step number: $STEP"
        echo "Please specify a step between 1 and 13"
        exit 1
        ;;
esac

echo ""
echo "✅ Step $STEP completed successfully" 