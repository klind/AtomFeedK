#!/bin/bash

# Script: validate-destroy.sh
# Purpose: Validates that all AWS resources have been properly destroyed after 
# running destroy-remote-executor.sh

# Set up colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Cluster name and region from variables
CLUSTER_NAME="hcm-developer-util-cluster"
REGION="eu-north-1"
RESOURCE_PREFIX="hcm-developer-util"

echo -e "${YELLOW}========================================================${NC}"
echo -e "${YELLOW}= Validating AWS Resources After EKS Cluster Destroy =${NC}"
echo -e "${YELLOW}========================================================${NC}"

check_result() {
    if [ -z "$1" ]; then
        echo -e "  ${GREEN}✓ None found${NC}"
        return 0
    else
        echo -e "  ${RED}✗ Resources found:${NC}"
        echo "$1"
        return 1
    fi
}

export AWS_REGION=$REGION
ERRORS=0

# Check for EKS Clusters
echo -e "\n${YELLOW}Checking for EKS Clusters...${NC}"
EKS_CLUSTERS=$(aws eks list-clusters --query "clusters[?contains(@,'$RESOURCE_PREFIX')]" --output text)
check_result "$EKS_CLUSTERS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for EKS Cluster directly
echo -e "\n${YELLOW}Checking for specific EKS Cluster...${NC}"
EKS_CLUSTER_STATUS=$(aws eks describe-cluster --name $CLUSTER_NAME 2>/dev/null || echo "Cluster not found")
if [[ "$EKS_CLUSTER_STATUS" == *"Cluster not found"* ]]; then
    echo -e "  ${GREEN}✓ Cluster not found${NC}"
else
    echo -e "  ${RED}✗ Cluster still exists${NC}"
    ERRORS=$((ERRORS+1))
fi

# Check for VPCs with the name tag
echo -e "\n${YELLOW}Checking for VPCs...${NC}"
VPCS=$(aws ec2 describe-vpcs --query "Vpcs[?Tags[?Value=='$RESOURCE_PREFIX-vpc']].[VpcId,Tags[?Key=='Name'].Value|[0]]" --output text)
check_result "$VPCS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Security Groups
echo -e "\n${YELLOW}Checking for Security Groups...${NC}"
SGS=$(aws ec2 describe-security-groups --query "SecurityGroups[?contains(GroupName,'$RESOURCE_PREFIX') || contains(Description,'$RESOURCE_PREFIX')].[GroupId,GroupName]" --output text)
check_result "$SGS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for IAM Roles
echo -e "\n${YELLOW}Checking for IAM Roles...${NC}"
ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName,'$RESOURCE_PREFIX')].[RoleName]" --output text)
check_result "$ROLES"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Load Balancers
echo -e "\n${YELLOW}Checking for ELB Load Balancers...${NC}"
ELBS=$(aws elb describe-load-balancers --query "LoadBalancerDescriptions[?contains(LoadBalancerName,'$RESOURCE_PREFIX')].[LoadBalancerName]" --output text)
check_result "$ELBS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for ALBs and NLBs
echo -e "\n${YELLOW}Checking for ALB/NLB Load Balancers...${NC}"
ELBSV2=$(aws elbv2 describe-load-balancers --query "LoadBalancers[?contains(LoadBalancerName,'$RESOURCE_PREFIX')].[LoadBalancerName,LoadBalancerArn]" --output text)
check_result "$ELBSV2"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for NAT Gateways
echo -e "\n${YELLOW}Checking for NAT Gateways...${NC}"
NAT_GATEWAYS=$(aws ec2 describe-nat-gateways --query "NatGateways[?State!='deleted'].[NatGatewayId,State]" --output text)
check_result "$NAT_GATEWAYS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for EC2 Instances
echo -e "\n${YELLOW}Checking for EC2 Instances...${NC}"
INSTANCES=$(aws ec2 describe-instances --filters "Name=tag:kubernetes.io/cluster/$CLUSTER_NAME,Values=owned" --query "Reservations[].Instances[?State.Name!='terminated'].[InstanceId,State.Name]" --output text)
check_result "$INSTANCES"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for CloudWatch Log Groups
echo -e "\n${YELLOW}Checking for CloudWatch Log Groups...${NC}"
LOG_GROUPS=$(aws logs describe-log-groups --query "logGroups[?contains(logGroupName,'/aws/eks/$CLUSTER_NAME')].[logGroupName]" --output text)
check_result "$LOG_GROUPS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for ECR Repositories
echo -e "\n${YELLOW}Checking for ECR Repositories...${NC}"
ECR_REPOS=$(aws ecr describe-repositories --query "repositories[?contains(repositoryName,'$RESOURCE_PREFIX')].[repositoryName,repositoryUri]" --output text)
check_result "$ECR_REPOS"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Kubernetes Service Account
echo -e "\n${YELLOW}Checking for Kubernetes Service Account...${NC}"
# First ensure kubeconfig is updated - ignore errors
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION --quiet >/dev/null 2>&1 || true
SERVICE_ACCOUNT=$(kubectl get serviceaccount hcm-developer-util-backend-service-account -n default 2>/dev/null || echo "")
check_result "$SERVICE_ACCOUNT"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Route53 records (if applicable)
echo -e "\n${YELLOW}Checking for Route53 Hosted Zones...${NC}"
HOSTED_ZONES=$(aws route53 list-hosted-zones --query "HostedZones[?contains(Name,'$RESOURCE_PREFIX')].[Id,Name]" --output text)
check_result "$HOSTED_ZONES"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Terraform state in S3
echo -e "\n${YELLOW}Checking Terraform state in S3...${NC}"
S3_STATE=$(aws s3 ls s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/terraform.tfstate 2>/dev/null || echo "")
if [ -z "$S3_STATE" ]; then
    echo -e "  ${GREEN}✓ No state file found or no access to S3 bucket${NC}"
else
    echo -e "  ${YELLOW}⚠️ State file exists (will be removed after successful validation):${NC}"
    echo "$S3_STATE"
fi

# Final summary
echo -e "\n${YELLOW}========================================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All resources have been successfully destroyed!${NC}"
else
    echo -e "${RED}❌ Found $ERRORS resource types that may not have been destroyed.${NC}"
    echo -e "${YELLOW}Please review the details above and destroy remaining resources manually if needed.${NC}"
fi
echo -e "${YELLOW}========================================================${NC}"

exit $ERRORS
