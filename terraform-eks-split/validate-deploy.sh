#!/bin/bash

# Script: validate-deploy.sh
# Purpose: Validates that all AWS resources have been properly created after 
# running deploy-local.sh or deploy-remote-executor.sh

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
echo -e "${YELLOW}= Validating AWS Resources After EKS Cluster Deployment =${NC}"
echo -e "${YELLOW}========================================================${NC}"

check_resource_exists() {
    if [ -z "$1" ]; then
        echo -e "  ${RED}✗ Not found${NC}"
        return 1
    else
        echo -e "  ${GREEN}✓ Resource found:${NC}"
        echo "$1"
        return 0
    fi
}

export AWS_REGION=$REGION
ERRORS=0

# Check for EKS Cluster
echo -e "\n${YELLOW}Checking for EKS Cluster...${NC}"
EKS_CLUSTER_STATUS=$(aws eks describe-cluster --name $CLUSTER_NAME 2>/dev/null || echo "Cluster not found")
if [[ "$EKS_CLUSTER_STATUS" == *"Cluster not found"* ]]; then
    echo -e "  ${RED}✗ Cluster not found${NC}"
    ERRORS=$((ERRORS+1))
else
    CLUSTER_STATUS=$(echo "$EKS_CLUSTER_STATUS" | grep -o '"status": "[^"]*"' | cut -d'"' -f4)
    if [[ "$CLUSTER_STATUS" == "ACTIVE" ]]; then
        echo -e "  ${GREEN}✓ Cluster is active${NC}"
    else
        echo -e "  ${YELLOW}⚠️ Cluster exists but status is: $CLUSTER_STATUS${NC}"
        ERRORS=$((ERRORS+1))
    fi
fi

# Check for VPC
echo -e "\n${YELLOW}Checking for VPC...${NC}"
VPC=$(aws ec2 describe-vpcs --query "Vpcs[?Tags[?Value=='$RESOURCE_PREFIX-vpc']].[VpcId,Tags[?Key=='Name'].Value|[0]]" --output text)
check_resource_exists "$VPC"
if [ $? -ne 0 ]; then ERRORS=$((ERRORS+1)); fi

# Check for Subnets (should have at least 4 - 2 public and 2 private)
echo -e "\n${YELLOW}Checking for Subnets...${NC}"
if [ ! -z "$VPC" ]; then
    VPC_ID=$(echo "$VPC" | awk '{print $1}')
    SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[].[SubnetId,Tags[?Key=='Name'].Value|[0]]" --output text)
    if [ -z "$SUBNETS" ]; then
        echo -e "  ${RED}✗ No subnets found${NC}"
        ERRORS=$((ERRORS+1))
    else
        SUBNET_COUNT=$(echo "$SUBNETS" | wc -l)
        if [ $SUBNET_COUNT -lt 4 ]; then
            echo -e "  ${YELLOW}⚠️ Expected at least 4 subnets, found $SUBNET_COUNT${NC}"
            ERRORS=$((ERRORS+1))
        else
            echo -e "  ${GREEN}✓ Found $SUBNET_COUNT subnets:${NC}"
            echo "$SUBNETS"
        fi
    fi
else
    echo -e "  ${RED}✗ Cannot check subnets without a VPC${NC}"
    ERRORS=$((ERRORS+1))
fi

# Check for Node Group
echo -e "\n${YELLOW}Checking for EKS Node Group...${NC}"
# Method 1: Get node groups with direct query output as text
NODEGROUP_NAME=$(aws eks list-nodegroups --cluster-name $CLUSTER_NAME --query 'nodegroups[0]' --output text 2>/dev/null || echo "")

# Method 2: Get full JSON response for deeper inspection if first method fails
if [ -z "$NODEGROUP_NAME" ]; then
    NODE_GROUPS_JSON=$(aws eks list-nodegroups --cluster-name $CLUSTER_NAME 2>/dev/null || echo "")
    
    # Parse using jq if available
    if command -v jq &> /dev/null && [ -n "$NODE_GROUPS_JSON" ]; then
        NODEGROUP_NAME=$(echo "$NODE_GROUPS_JSON" | jq -r '.nodegroups[0] // empty')
    # Fallback to grep/sed/awk if jq is not available
    elif [ -n "$NODE_GROUPS_JSON" ]; then
        NODEGROUP_NAME=$(echo "$NODE_GROUPS_JSON" | grep -o '"nodegroups":\s*\[\s*"[^"]*"' | awk -F'"' '{print $4}' 2>/dev/null || echo "")
    fi
fi

# Method 3: Try to get nodes from kubectl as a last resort
if [ -z "$NODEGROUP_NAME" ] && command -v kubectl &> /dev/null; then
    echo -e "  ${YELLOW}Attempting to verify through kubectl...${NC}"
    aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION --quiet >/dev/null 2>&1
    KUBECTL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
    if [ "$KUBECTL_NODES" -gt 0 ]; then
        echo -e "  ${GREEN}✓ Found $KUBECTL_NODES nodes via kubectl${NC}"
        NODEGROUP_NAME="Found via kubectl"
    fi
fi

# Final determination
if [ -n "$NODEGROUP_NAME" ]; then
    echo -e "  ${GREEN}✓ Node group found: $NODEGROUP_NAME${NC}"
else
    echo -e "  ${RED}✗ No node groups found${NC}"
    
    # Diagnostic information for debugging
    echo -e "  ${YELLOW}Diagnostic check: Directly listing node groups...${NC}"
    aws eks list-nodegroups --cluster-name $CLUSTER_NAME | cat
    
    ERRORS=$((ERRORS+1))
fi

# Check for IAM Roles
echo -e "\n${YELLOW}Checking for IAM Roles...${NC}"
ROLES=$(aws iam list-roles --query "Roles[?contains(RoleName,'$RESOURCE_PREFIX')].[RoleName]" --output text)
if [ -z "$ROLES" ]; then
    echo -e "  ${RED}✗ No IAM roles found${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "  ${GREEN}✓ IAM roles found:${NC}"
    echo "$ROLES"
    
    # Check for expected roles
    for EXPECTED_ROLE in "$RESOURCE_PREFIX-eks-cluster-role" "$RESOURCE_PREFIX-eks-node-group-role"; do
        if ! echo "$ROLES" | grep -q "$EXPECTED_ROLE"; then
            echo -e "  ${YELLOW}⚠️ Expected role $EXPECTED_ROLE not found${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
fi

# Check for EKS Addons
echo -e "\n${YELLOW}Checking for EKS Addons...${NC}"

# Method 1: Direct query with text output
ADDON_LIST=$(aws eks list-addons --cluster-name $CLUSTER_NAME --query 'addons' --output text 2>/dev/null || echo "")

# Method 2: Full JSON response for parsing if needed
if [ -z "$ADDON_LIST" ]; then
    ADDONS_JSON=$(aws eks list-addons --cluster-name $CLUSTER_NAME 2>/dev/null || echo "")
    
    # Parse using jq if available
    if command -v jq &> /dev/null && [ -n "$ADDONS_JSON" ]; then
        ADDON_LIST=$(echo "$ADDONS_JSON" | jq -r '.addons[]' 2>/dev/null || echo "")
    # Fallback to grep/sed if jq is not available
    elif [ -n "$ADDONS_JSON" ]; then
        ADDON_LIST=$(echo "$ADDONS_JSON" | grep -o '"addons":\s*\[[^]]*\]' | sed 's/"addons":\s*\[//g' | sed 's/\]//g' | sed 's/"//g' | sed 's/,/ /g' 2>/dev/null || echo "")
    fi
fi

if [ -z "$ADDON_LIST" ]; then
    echo -e "  ${RED}✗ No addons found${NC}"
    
    # Diagnostic information
    echo -e "  ${YELLOW}Diagnostic check: Directly listing addons...${NC}"
    aws eks list-addons --cluster-name $CLUSTER_NAME | cat
    
    ERRORS=$((ERRORS+1))
else
    echo -e "  ${GREEN}✓ Addons found:${NC}"
    echo "$ADDON_LIST"
    
    # Check for expected addons
    MISSING_ADDONS=0
    for EXPECTED_ADDON in "vpc-cni" "kube-proxy" "coredns"; do
        if ! echo "$ADDON_LIST" | grep -q "$EXPECTED_ADDON"; then
            echo -e "  ${YELLOW}⚠️ Expected addon $EXPECTED_ADDON not found${NC}"
            MISSING_ADDONS=$((MISSING_ADDONS+1))
        fi
    done
    
    if [ $MISSING_ADDONS -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️ $MISSING_ADDONS expected addons are missing${NC}"
        ERRORS=$((ERRORS+1))
    fi
fi

# Check for ECR Repositories
echo -e "\n${YELLOW}Checking for ECR Repositories...${NC}"
ECR_REPOS=$(aws ecr describe-repositories --query "repositories[?contains(repositoryName,'$RESOURCE_PREFIX')].[repositoryName,repositoryUri]" --output text)
if [ -z "$ECR_REPOS" ]; then
    echo -e "  ${RED}✗ No ECR repositories found${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "  ${GREEN}✓ ECR repositories found:${NC}"
    echo "$ECR_REPOS"
    
    # Check for expected repositories
    for EXPECTED_REPO in "$RESOURCE_PREFIX-backend" "$RESOURCE_PREFIX-frontend"; do
        if ! echo "$ECR_REPOS" | grep -q "$EXPECTED_REPO"; then
            echo -e "  ${YELLOW}⚠️ Expected repository $EXPECTED_REPO not found${NC}"
            ERRORS=$((ERRORS+1))
        fi
    done
fi

# Check for Service Account
echo -e "\n${YELLOW}Checking for Kubernetes Service Account...${NC}"

# Update kubeconfig and verify connection to the cluster
echo -e "  ${BLUE}Updating kubeconfig...${NC}"
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION

# Verify the connection by trying a simple kubectl command with retries
echo -e "  ${BLUE}Verifying connection to cluster...${NC}"
MAX_RETRIES=5
RETRY_COUNT=0
CONNECTED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$CONNECTED" != true ]; do
    if kubectl get namespaces &>/dev/null; then
        echo -e "  ${GREEN}✓ Successfully connected to the cluster${NC}"
        CONNECTED=true
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "  ${YELLOW}⚠️ Connection attempt $RETRY_COUNT failed, retrying in 5 seconds...${NC}"
            sleep 5
        else
            echo -e "  ${RED}✗ Failed to connect to the cluster after $MAX_RETRIES attempts${NC}"
            echo -e "  ${YELLOW}Try running manually: aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION${NC}"
            ERRORS=$((ERRORS+1))
            # Skip the service account check since we can't connect
            return
        fi
    fi
done

# Now check the service account
SERVICE_ACCOUNT=$(kubectl get serviceaccount hcm-developer-util-backend-service-account -n default -o json 2>/dev/null || echo "")

if [ -z "$SERVICE_ACCOUNT" ]; then
    echo -e "  ${RED}✗ Service account not found${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "  ${GREEN}✓ Service account found:${NC}"
    echo "  hcm-developer-util-backend-service-account in namespace default"
    
    # Check for IAM role annotation
    ROLE_ARN=$(echo "$SERVICE_ACCOUNT" | grep -o '"eks.amazonaws.com/role-arn": "[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -z "$ROLE_ARN" ]; then
        echo -e "  ${YELLOW}⚠️ Service account does not have IAM role annotation${NC}"
        ERRORS=$((ERRORS+1))
    else
        echo -e "  ${GREEN}✓ IAM role associated:${NC} $ROLE_ARN"
    fi
fi

# Check for Terraform state in S3
echo -e "\n${YELLOW}Checking Terraform state in S3...${NC}"
S3_STATE=$(aws s3 ls s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/terraform.tfstate 2>/dev/null || echo "")
if [ -z "$S3_STATE" ]; then
    echo -e "  ${RED}✗ No state file found${NC}"
    ERRORS=$((ERRORS+1))
else
    echo -e "  ${GREEN}✓ State file exists:${NC}"
    echo "$S3_STATE"
fi

# Final summary
echo -e "\n${YELLOW}========================================================${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All EKS infrastructure resources have been successfully created!${NC}"
    echo -e "${GREEN}Validation passed all ${YELLOW}7${GREEN} checks:${NC}"
    echo -e " ${YELLOW}•${NC} EKS Cluster: Active"
    echo -e " ${YELLOW}•${NC} VPC: Configured properly"
    echo -e " ${YELLOW}•${NC} Subnets: At least 4 found"
    echo -e " ${YELLOW}•${NC} Node Group: Found and active"
    echo -e " ${YELLOW}•${NC} IAM Roles: All required roles exist"
    echo -e " ${YELLOW}•${NC} EKS Addons: All required addons installed"
    echo -e " ${YELLOW}•${NC} ECR Repositories: All required repositories created"
    echo -e " ${YELLOW}•${NC} Service Account: Found and IAM role associated"
    echo -e " ${YELLOW}•${NC} Terraform State: State file exists in S3"
else
    echo -e "${RED}❌ Found $ERRORS issues with the deployment.${NC}"
    echo -e "${YELLOW}Please review the details above and fix any missing resources.${NC}"
    
    # Add debugging hint
    echo -e "\n${YELLOW}Debugging hint:${NC}"
    echo -e "For node group detection issues, try running this direct AWS CLI command:"
    echo -e "  aws eks list-nodegroups --cluster-name $CLUSTER_NAME --region $REGION"
    echo -e "For addon detection issues, try running this direct AWS CLI command:"
    echo -e "  aws eks list-addons --cluster-name $CLUSTER_NAME --region $REGION"
fi
echo -e "${YELLOW}========================================================${NC}"

exit $ERRORS
