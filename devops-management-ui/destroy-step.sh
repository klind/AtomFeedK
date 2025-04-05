#!/bin/bash

# Script: destroy-step.sh
# Purpose: Destroy a specific step from the Terraform deployment process

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

# Function to destroy a step using local mode
destroy_step_local() {
    local step_num=$1
    local step_name
    
    case $step_num in
        1) step_name="Destroy remaining resources" ;;
        2) step_name="Destroy AWS Load Balancer Controller" ;;
        3) step_name="Destroy service accounts and trust policies" ;;
        4) step_name="Destroy repositories" ;;
        5) step_name="Destroy CoreDNS and kube-proxy addons" ;;
        6) step_name="Destroy node group" ;;
        7) step_name="Destroy VPC CNI addon" ;;
        8) step_name="Destroy auth config map" ;;
        9) step_name="Destroy OIDC provider and cluster autoscaler role" ;;
        10) step_name="Destroy EKS cluster" ;;
        11) step_name="Destroy security groups and KMS key" ;;
        12) step_name="Destroy IAM roles and policies" ;;
        13) step_name="Destroy networking components" ;;
        14) step_name="Destroy VPC and subnets" ;;
        15) step_name="Destroy Terraform state" ;;
    esac
    
    echo -e "${YELLOW}Destroying Step $step_num: $step_name (Local Mode)${NC}"
    
    case $step_num in
        1)
            terraform destroy -auto-approve
            ;;
        2)
            terraform destroy -auto-approve -target=helm_release.lb_controller \
                -target=kubernetes_service_account.lb_controller \
                -target=aws_iam_role_policy_attachment.lb_controller_attachment \
                -target=aws_iam_role.lb_controller_role \
                -target=aws_iam_policy.lb_controller
            ;;
        3)
            terraform destroy -auto-approve -target=module.eks.kubernetes_service_account.backend_service_account \
                -target=module.eks.aws_iam_role_policy_attachment.dynamodb_access \
                -target=module.eks.aws_iam_role.backend_service_role
            ;;
        4)
            terraform destroy -auto-approve -target=module.ecr
            ;;
        5)
            terraform destroy -auto-approve -target=module.eks.aws_eks_addon.coredns \
                -target=module.eks.aws_eks_addon.kube_proxy
            ;;
        6)
            terraform destroy -auto-approve -target=module.eks.aws_eks_node_group.managed_ng
            ;;
        7)
            terraform destroy -auto-approve -target=module.eks.aws_eks_addon.vpc_cni
            ;;
        8)
            terraform destroy -auto-approve -target=module.eks.kubernetes_config_map.aws_auth
            ;;
        9)
            terraform destroy -auto-approve -target=module.eks.aws_iam_role.cluster_autoscaler \
                -target=module.eks.aws_iam_openid_connect_provider.oidc_provider
            ;;
        10)
            terraform destroy -auto-approve -target=module.eks.aws_eks_cluster.this
            ;;
        11)
            terraform destroy -auto-approve -target=module.eks.aws_kms_key.eks \
                -target=module.eks.aws_security_group_rule.cluster \
                -target=module.eks.aws_security_group.cluster
            ;;
        12)
            terraform destroy -auto-approve -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy \
                -target=module.eks.aws_iam_role.cluster
            ;;
        13)
            terraform destroy -auto-approve -target=module.vpc.aws_nat_gateway.this* \
                -target=module.vpc.aws_route.public_internet_gateway* \
                -target=module.vpc.aws_route.private_nat_gateway* \
                -target=module.vpc.aws_route_table.public* \
                -target=module.vpc.aws_route_table.private* \
                -target=module.vpc.aws_internet_gateway.this[0]
            ;;
        14)
            terraform destroy -auto-approve -target=module.vpc
            ;;
        15)
            terraform destroy -auto-approve
            rm -rf .terraform terraform.tfstate terraform.tfstate.backup
            ;;
    esac
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Step $step_num destruction completed successfully.${NC}"
    else
        echo -e "${RED}Step $step_num destruction failed with exit code $status.${NC}"
    fi
    return $status
}

# Function to destroy a step using remote mode
destroy_step_remote() {
    local step_num=$1
    local step_name
    
    case $step_num in
        1) step_name="Destroy remaining resources" ;;
        2) step_name="Destroy AWS Load Balancer Controller" ;;
        3) step_name="Destroy service accounts and trust policies" ;;
        4) step_name="Destroy repositories" ;;
        5) step_name="Destroy CoreDNS and kube-proxy addons" ;;
        6) step_name="Destroy node group" ;;
        7) step_name="Destroy VPC CNI addon" ;;
        8) step_name="Destroy auth config map" ;;
        9) step_name="Destroy OIDC provider and cluster autoscaler role" ;;
        10) step_name="Destroy EKS cluster" ;;
        11) step_name="Destroy security groups and KMS key" ;;
        12) step_name="Destroy IAM roles and policies" ;;
        13) step_name="Destroy networking components" ;;
        14) step_name="Destroy VPC and subnets" ;;
        15) step_name="Destroy Terraform state" ;;
    esac
    
    echo -e "${YELLOW}Destroying Step $step_num: $step_name (Remote Mode)${NC}"
    
    # Commands to execute on the remote EC2 instance
    local TERRAFORM_CMD=""
    
    case $step_num in
        1)
            TERRAFORM_CMD="terraform destroy -auto-approve"
            ;;
        2)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=helm_release.lb_controller \
                -target=kubernetes_service_account.lb_controller \
                -target=aws_iam_role_policy_attachment.lb_controller_attachment \
                -target=aws_iam_role.lb_controller_role \
                -target=aws_iam_policy.lb_controller"
            ;;
        3)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.kubernetes_service_account.backend_service_account \
                -target=module.eks.aws_iam_role_policy_attachment.dynamodb_access \
                -target=module.eks.aws_iam_role.backend_service_role"
            ;;
        4)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.ecr"
            ;;
        5)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_eks_addon.coredns \
                -target=module.eks.aws_eks_addon.kube_proxy"
            ;;
        6)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_eks_node_group.managed_ng"
            ;;
        7)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_eks_addon.vpc_cni"
            ;;
        8)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.kubernetes_config_map.aws_auth"
            ;;
        9)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_iam_role.cluster_autoscaler \
                -target=module.eks.aws_iam_openid_connect_provider.oidc_provider"
            ;;
        10)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_eks_cluster.this"
            ;;
        11)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_kms_key.eks \
                -target=module.eks.aws_security_group_rule.cluster \
                -target=module.eks.aws_security_group.cluster"
            ;;
        12)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController \
                -target=module.eks.aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy \
                -target=module.eks.aws_iam_role.cluster"
            ;;
        13)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.vpc.aws_nat_gateway.this* \
                -target=module.vpc.aws_route.public_internet_gateway* \
                -target=module.vpc.aws_route.private_nat_gateway* \
                -target=module.vpc.aws_route_table.public* \
                -target=module.vpc.aws_route_table.private* \
                -target=module.vpc.aws_internet_gateway.this[0]"
            ;;
        14)
            TERRAFORM_CMD="terraform destroy -auto-approve -target=module.vpc"
            ;;
        15)
            TERRAFORM_CMD="terraform destroy -auto-approve"
            ;;
    esac
    
    # Construct the remote command based on the terraform-remote-executor.sh script
    ./terraform-remote-executor.sh "$TERRAFORM_CMD"
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Step $step_num destruction completed successfully.${NC}"
    else
        echo -e "${RED}Step $step_num destruction failed with exit code $status.${NC}"
    fi
    return $status
}

# Execute the appropriate function based on the mode
if [ "$MODE" == "local" ]; then
    # Set PAGER to cat to prevent interactive pagers
    export PAGER="cat"
    destroy_step_local $STEP
else
    # Set PAGER to cat to prevent interactive pagers
    export PAGER="cat"
    destroy_step_remote $STEP
fi

exit $? 