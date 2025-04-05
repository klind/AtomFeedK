#!/bin/bash

# Script: apply-step.sh
# Purpose: Applies a specific step from the Terraform deployment process

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if both step number and execution mode are provided
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments.${NC}"
    echo "Usage: $0 <step_number> <mode>"
    echo "  step_number: 1-15"
    echo "  mode: local or remote"
    exit 1
fi

STEP=$1
MODE=$2
TERRAFORM_DIR="$(dirname "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)")/terraform-eks-split"
cd "$TERRAFORM_DIR"

# Validate step number
if ! [[ "$STEP" =~ ^[0-9]+$ ]] || [ "$STEP" -lt 1 ] || [ "$STEP" -gt 15 ]; then
    echo -e "${RED}Error: Invalid step number. Must be between 1 and 15.${NC}"
    exit 1
fi

# Validate execution mode
if [ "$MODE" != "local" ] && [ "$MODE" != "remote" ]; then
    echo -e "${RED}Error: Invalid execution mode. Use 'local' or 'remote'.${NC}"
    exit 1
fi

# Function to apply a step using local mode
apply_step_local() {
    local step_num=$1
    local step_name
    
    case $step_num in
        1) step_name="Initialize Terraform" ;;
        2) step_name="Create VPC and subnets" ;;
        3) step_name="Create networking components" ;;
        4) step_name="Create IAM roles and policies" ;;
        5) step_name="Create security groups and KMS key" ;;
        6) step_name="Create EKS cluster" ;;
        7) step_name="Create OIDC provider and cluster autoscaler role" ;;
        8) step_name="Create auth config map" ;;
        9) step_name="Create VPC CNI addon" ;;
        10) step_name="Create node group" ;;
        11) step_name="Create CoreDNS and kube-proxy addons" ;;
        12) step_name="Create repositories" ;;
        13) step_name="Create service accounts and trust policies" ;;
        14) step_name="Install AWS Load Balancer Controller" ;;
        15) step_name="Apply remaining resources and outputs" ;;
    esac
    
    echo -e "${YELLOW}Applying Step $step_num: $step_name (Local Mode)${NC}"
    
    case $step_num in
        1)
            terraform init -backend-config=backend.conf
            ;;
        2)
            terraform apply -auto-approve -target=module.vpc
            ;;
        3)
            terraform apply -auto-approve -target=module.vpc.aws_internet_gateway.this[0] \
                -target=module.vpc.aws_route_table.private* \
                -target=module.vpc.aws_route_table.public* \
                -target=module.vpc.aws_route.private_nat_gateway* \
                -target=module.vpc.aws_route.public_internet_gateway* \
                -target=module.vpc.aws_nat_gateway.this*
            ;;
        4)
            terraform apply -auto-approve -target=module.eks.aws_iam_role.cluster \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController
            ;;
        5)
            terraform apply -auto-approve -target=module.eks.aws_security_group.cluster \
                -target=module.eks.aws_security_group_rule.cluster \
                -target=module.eks.aws_kms_key.eks
            ;;
        6)
            terraform apply -auto-approve -target=module.eks.aws_eks_cluster.this
            ;;
        7)
            terraform apply -auto-approve -target=module.eks.aws_iam_openid_connect_provider.oidc_provider \
                -target=module.eks.aws_iam_role.cluster_autoscaler
            ;;
        8)
            terraform apply -auto-approve -target=module.eks.kubernetes_config_map.aws_auth
            ;;
        9)
            terraform apply -auto-approve -target=module.eks.aws_eks_addon.vpc_cni
            ;;
        10)
            terraform apply -auto-approve -target=module.eks.aws_eks_node_group.managed_ng
            ;;
        11)
            terraform apply -auto-approve -target=module.eks.aws_eks_addon.coredns \
                -target=module.eks.aws_eks_addon.kube_proxy
            ;;
        12)
            terraform apply -auto-approve -target=module.ecr
            ;;
        13)
            terraform apply -auto-approve -target=module.eks.aws_iam_role.backend_service_role \
                -target=module.eks.aws_iam_role_policy_attachment.dynamodb_access \
                -target=module.eks.kubernetes_service_account.backend_service_account
            ;;
        14)
            terraform apply -auto-approve -target=aws_iam_policy.lb_controller \
                -target=aws_iam_role.lb_controller_role \
                -target=aws_iam_role_policy_attachment.lb_controller_attachment \
                -target=kubernetes_service_account.lb_controller \
                -target=helm_release.lb_controller
            ;;
        15)
            terraform apply -auto-approve
            ;;
    esac
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Step $step_num completed successfully.${NC}"
    else
        echo -e "${RED}Step $step_num failed with exit code $status.${NC}"
    fi
    return $status
}

# Function to apply a step using remote mode
apply_step_remote() {
    local step_num=$1
    local step_name
    
    case $step_num in
        1) step_name="Initialize Terraform" ;;
        2) step_name="Create VPC and subnets" ;;
        3) step_name="Create networking components" ;;
        4) step_name="Create IAM roles and policies" ;;
        5) step_name="Create security groups and KMS key" ;;
        6) step_name="Create EKS cluster" ;;
        7) step_name="Create OIDC provider and cluster autoscaler role" ;;
        8) step_name="Create auth config map" ;;
        9) step_name="Create VPC CNI addon" ;;
        10) step_name="Create node group" ;;
        11) step_name="Create CoreDNS and kube-proxy addons" ;;
        12) step_name="Create repositories" ;;
        13) step_name="Create service accounts and trust policies" ;;
        14) step_name="Install AWS Load Balancer Controller" ;;
        15) step_name="Apply remaining resources and outputs" ;;
    esac
    
    echo -e "${YELLOW}Applying Step $step_num: $step_name (Remote Mode)${NC}"
    
    # Commands to execute on the remote EC2 instance
    local TERRAFORM_CMD=""
    
    case $step_num in
        1)
            TERRAFORM_CMD="terraform init -backend-config=backend.conf"
            ;;
        2)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.vpc"
            ;;
        3)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.vpc.aws_internet_gateway.this[0] \
                -target=module.vpc.aws_route_table.private* \
                -target=module.vpc.aws_route_table.public* \
                -target=module.vpc.aws_route.private_nat_gateway* \
                -target=module.vpc.aws_route.public_internet_gateway* \
                -target=module.vpc.aws_nat_gateway.this*"
            ;;
        4)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_iam_role.cluster \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController"
            ;;
        5)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_security_group.cluster \
                -target=module.eks.aws_security_group_rule.cluster \
                -target=module.eks.aws_kms_key.eks"
            ;;
        6)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_eks_cluster.this"
            ;;
        7)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_iam_openid_connect_provider.oidc_provider \
                -target=module.eks.aws_iam_role.cluster_autoscaler"
            ;;
        8)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.kubernetes_config_map.aws_auth"
            ;;
        9)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_eks_addon.vpc_cni"
            ;;
        10)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_eks_node_group.managed_ng"
            ;;
        11)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_eks_addon.coredns \
                -target=module.eks.aws_eks_addon.kube_proxy"
            ;;
        12)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.ecr"
            ;;
        13)
            TERRAFORM_CMD="terraform apply -auto-approve -target=module.eks.aws_iam_role.backend_service_role \
                -target=module.eks.aws_iam_role_policy_attachment.dynamodb_access \
                -target=module.eks.kubernetes_service_account.backend_service_account"
            ;;
        14)
            TERRAFORM_CMD="terraform apply -auto-approve -target=aws_iam_policy.lb_controller \
                -target=aws_iam_role.lb_controller_role \
                -target=aws_iam_role_policy_attachment.lb_controller_attachment \
                -target=kubernetes_service_account.lb_controller \
                -target=helm_release.lb_controller"
            ;;
        15)
            TERRAFORM_CMD="terraform apply -auto-approve"
            ;;
    esac
    
    # Construct the remote command based on the terraform-remote-executor.sh script
    ./terraform-remote-executor.sh "$TERRAFORM_CMD"
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Step $step_num completed successfully.${NC}"
    else
        echo -e "${RED}Step $step_num failed with exit code $status.${NC}"
    fi
    return $status
}

# Apply the specified step using the appropriate mode
if [ "$MODE" == "local" ]; then
    # Set PAGER to cat to prevent interactive pagers
    export PAGER="cat"
    apply_step_local $STEP
else
    # Set PAGER to cat to prevent interactive pagers
    export PAGER="cat"
    apply_step_remote $STEP
fi

exit $? 