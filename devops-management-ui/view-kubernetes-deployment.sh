#!/bin/bash

# Script: view-kubernetes-deployment.sh
# Purpose: View EKS cluster information using AWS CLI only

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;96m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Define cluster parameters
CLUSTER_NAME="hcm-developer-util-cluster"
REGION="eu-north-1"

echo -e "${CYAN}EKS Cluster Information Summary${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
echo -e "${YELLOW}Checking AWS credentials...${NC}"
if ! AWS_IDENTITY=$(aws sts get-caller-identity 2>/dev/null); then
    echo -e "${RED}Error: Failed to get AWS identity. Check your AWS credentials.${NC}"
    echo -e "${YELLOW}Make sure you have configured AWS CLI with 'aws configure'${NC}"
    exit 1
fi
USER_ARN=$(echo "$AWS_IDENTITY" | grep "Arn" | sed 's/.*: "\(.*\)".*/\1/')
echo -e "${GREEN}✓ Using AWS identity: $USER_ARN${NC}"

# Direct attempt to access the specific cluster
echo -e "${YELLOW}Accessing cluster: $CLUSTER_NAME...${NC}"
CLUSTER_INFO=$(aws eks describe-cluster --name $CLUSTER_NAME --region $REGION 2>/dev/null)
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Cannot access cluster '$CLUSTER_NAME' in region '$REGION'.${NC}"
    echo -e "${YELLOW}This could be due to:${NC}"
    echo -e "  - The cluster does not exist with this exact name"
    echo -e "  - You don't have permission to access this cluster"
    echo -e "  - AWS connectivity issues"
    exit 1
fi
echo -e "${GREEN}✓ Successfully accessed cluster: $CLUSTER_NAME${NC}"

# Extract and display cluster information
CLUSTER_STATUS=$(echo "$CLUSTER_INFO" | grep -o '"status": "[^"]*' | cut -d'"' -f4)
CLUSTER_VERSION=$(echo "$CLUSTER_INFO" | grep -o '"version": "[^"]*' | cut -d'"' -f4)
CLUSTER_ENDPOINT=$(echo "$CLUSTER_INFO" | grep -o '"endpoint": "[^"]*' | cut -d'"' -f4)
CLUSTER_ARN=$(echo "$CLUSTER_INFO" | grep -o '"arn": "[^"]*' | cut -d'"' -f4)
CLUSTER_CREATED=$(echo "$CLUSTER_INFO" | grep -o '"createdAt": "[^"]*' | cut -d'"' -f4)

echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                     CLUSTER DETAILS                       │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo -e "${BLUE}Name:     ${NC}$CLUSTER_NAME"
echo -e "${BLUE}Status:   ${NC}$CLUSTER_STATUS"
echo -e "${BLUE}Version:  ${NC}$CLUSTER_VERSION"
echo -e "${BLUE}Endpoint: ${NC}$CLUSTER_ENDPOINT"
echo -e "${BLUE}ARN:      ${NC}$CLUSTER_ARN"
echo -e "${BLUE}Created:  ${NC}$CLUSTER_CREATED"

# Get VPC and subnet information
VPC_ID=$(echo "$CLUSTER_INFO" | grep -o '"vpcId": "[^"]*' | cut -d'"' -f4)
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                 NETWORKING INFORMATION                    │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
echo -e "${BLUE}VPC ID:   ${NC}$VPC_ID"

# Get VPC details
VPC_DETAILS=$(aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $REGION 2>/dev/null)
VPC_CIDR=$(echo "$VPC_DETAILS" | grep -o '"CidrBlock": "[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${BLUE}VPC CIDR:  ${NC}$VPC_CIDR"

# Get subnets
echo -e "${BLUE}Subnets:  ${NC}"
SUBNETS=$(echo "$CLUSTER_INFO" | grep -o '"subnetIds": \[[^]]*\]' | sed 's/"subnetIds": \[\(.*\)\]/\1/' | sed 's/"//g' | sed 's/,/ /g')
for subnet in $SUBNETS; do
    SUBNET_INFO=$(aws ec2 describe-subnets --subnet-ids $subnet --region $REGION 2>/dev/null)
    SUBNET_CIDR=$(echo "$SUBNET_INFO" | grep -o '"CidrBlock": "[^"]*' | head -1 | cut -d'"' -f4)
    SUBNET_AZ=$(echo "$SUBNET_INFO" | grep -o '"AvailabilityZone": "[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "  - ${BLUE}ID:${NC} $subnet ${BLUE}CIDR:${NC} $SUBNET_CIDR ${BLUE}AZ:${NC} $SUBNET_AZ"
done

# Get security groups
echo -e "\n${BLUE}Security Groups:${NC}"
# Get the cluster security group
CLUSTER_SG=$(echo "$CLUSTER_INFO" | grep -o '"securityGroupIds": \[[^]]*\]' | grep -o '"[^"]*"' | sed 's/"//g')
for sg in $CLUSTER_SG; do
    SG_INFO=$(aws ec2 describe-security-groups --group-ids $sg --region $REGION 2>/dev/null)
    SG_NAME=$(echo "$SG_INFO" | grep -o '"GroupName": "[^"]*' | head -1 | cut -d'"' -f4)
    echo -e "  - ${BLUE}ID:${NC} $sg ${BLUE}Name:${NC} $SG_NAME"
done

# Get node groups information
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                     NODE GROUPS                           │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
NODE_GROUPS=$(aws eks list-nodegroups --cluster-name $CLUSTER_NAME --region $REGION 2>/dev/null)
# Use jq for better parsing of JSON
NG_COUNT=$(echo "$NODE_GROUPS" | jq -r '.nodegroups | length' 2>/dev/null || echo "0")

if [ "$NG_COUNT" -eq 0 ] || [ -z "$NG_COUNT" ]; then
    echo -e "${YELLOW}No node groups found for cluster $CLUSTER_NAME${NC}"
    echo -e "${BLUE}This may be a Fargate-only cluster${NC}"
    
    # Check for Fargate profiles
    FARGATE_PROFILES=$(aws eks list-fargate-profiles --cluster-name $CLUSTER_NAME --region $REGION 2>/dev/null)
    # Use jq for better parsing
    FP_COUNT=$(echo "$FARGATE_PROFILES" | jq -r '.fargateProfileNames | length' 2>/dev/null || echo "0")
    
    if [ "$FP_COUNT" -gt 0 ]; then
        echo -e "\n${BLUE}Fargate Profiles:${NC}"
        echo "$FARGATE_PROFILES" | jq -r '.fargateProfileNames[]' 2>/dev/null | while read -r FP; do
            echo -e "  ${BLUE}Profile: ${NC}$FP"
            FP_INFO=$(aws eks describe-fargate-profile --cluster-name $CLUSTER_NAME --fargate-profile-name $FP --region $REGION 2>/dev/null)
            FP_STATUS=$(echo "$FP_INFO" | jq -r '.fargateProfile.status // "Unknown"')
            
            echo -e "    ${BLUE}Status:  ${NC}$FP_STATUS"
            echo -e "    ${BLUE}Selectors:${NC}"
            
            # Extract and display selectors
            SELECTORS=$(echo "$FP_INFO" | jq -r '.fargateProfile.selectors[] | "      - Namespace: \(.namespace)"' 2>/dev/null)
            if [ -n "$SELECTORS" ]; then
                echo "$SELECTORS"
            else
                echo -e "      ${YELLOW}No selectors found${NC}"
            fi
        done
    else
        echo -e "${YELLOW}No Fargate profiles found for this cluster${NC}"
        echo -e "${GREEN}This cluster likely uses regular EC2 node groups, but they may not be visible to your current AWS credentials${NC}"
        
        # Try to get information about the nodes using kubectl
        echo -e "\n${BLUE}Attempting to get node information using kubectl...${NC}"
        if command -v kubectl &> /dev/null; then
            # Update kubeconfig for this cluster
            aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION --quiet >/dev/null 2>&1
            
            # Get nodes
            NODES=$(kubectl get nodes -o json 2>/dev/null || echo "{}")
            NODE_COUNT=$(echo "$NODES" | jq -r '.items | length')
            
            if [ "$NODE_COUNT" -gt 0 ]; then
                echo -e "${GREEN}Found $NODE_COUNT nodes:${NC}"
                echo "$NODES" | jq -r '.items[] | "  - \(.metadata.name) (\(.status.nodeInfo.osImage), \(.status.nodeInfo.kubeletVersion))"'
            else
                echo -e "${YELLOW}No nodes found using kubectl${NC}"
            fi
        else
            echo -e "${YELLOW}kubectl not available, cannot check nodes directly${NC}"
        fi
    fi
else
    # Use jq to parse nodegroups
    echo "$NODE_GROUPS" | jq -r '.nodegroups[]' 2>/dev/null | while read -r NG; do
        echo -e "${BLUE}Node Group: ${NC}$NG"
        NG_INFO=$(aws eks describe-nodegroup --cluster-name $CLUSTER_NAME --nodegroup-name "$NG" --region $REGION 2>/dev/null)
        NG_STATUS=$(echo "$NG_INFO" | jq -r '.nodegroup.status')
        INSTANCE_TYPES=$(echo "$NG_INFO" | jq -r '.nodegroup.instanceTypes | join(", ")')
        DESIRED_SIZE=$(echo "$NG_INFO" | jq -r '.nodegroup.scalingConfig.desiredSize')
        MIN_SIZE=$(echo "$NG_INFO" | jq -r '.nodegroup.scalingConfig.minSize')
        MAX_SIZE=$(echo "$NG_INFO" | jq -r '.nodegroup.scalingConfig.maxSize')
        
        echo -e "  ${BLUE}Status:        ${NC}$NG_STATUS"
        echo -e "  ${BLUE}Instance Types:${NC}$INSTANCE_TYPES"
        echo -e "  ${BLUE}Size:          ${NC}Current: $DESIRED_SIZE, Min: $MIN_SIZE, Max: $MAX_SIZE"
        
        # Get the autoscaling group name
        ASG_NAME=$(echo "$NG_INFO" | jq -r '.nodegroup.resources.autoScalingGroups[0].name // ""')
        if [ -n "$ASG_NAME" ]; then
            echo -e "  ${BLUE}ASG Name:      ${NC}$ASG_NAME"
            
            # Get instances in the autoscaling group
            ASG_INSTANCES=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG_NAME" --region $REGION 2>/dev/null)
            INSTANCE_COUNT=$(echo "$ASG_INSTANCES" | jq -r '.AutoScalingGroups[0].Instances | length // 0')
            
            echo -e "  ${BLUE}Instances:     ${NC}$INSTANCE_COUNT running instances"
            
            # List EC2 instance IDs and health status
            if [ $INSTANCE_COUNT -gt 0 ]; then
                echo -e "  ${BLUE}Instance IDs:  ${NC}"
                echo "$ASG_INSTANCES" | jq -r '.AutoScalingGroups[0].Instances[].InstanceId' | while read -r INSTANCE_ID; do
                    INSTANCE_INFO=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --region $REGION 2>/dev/null)
                    INSTANCE_STATE=$(echo "$INSTANCE_INFO" | jq -r '.Reservations[0].Instances[0].State.Name // "unknown"')
                    INSTANCE_TYPE=$(echo "$INSTANCE_INFO" | jq -r '.Reservations[0].Instances[0].InstanceType // "unknown"')
                    echo -e "    - ${BLUE}ID:${NC} $INSTANCE_ID ${BLUE}State:${NC} $INSTANCE_STATE ${BLUE}Type:${NC} $INSTANCE_TYPE"
                done
            fi
        fi
    done
fi

# After the node groups section, add a new section for Kubernetes services
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                   KUBERNETES SERVICES                     │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"

# Get kubectl context for this cluster
echo -e "${YELLOW}Updating kubectl config for cluster $CLUSTER_NAME...${NC}"
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION >/dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to update kubectl config. Skipping Kubernetes service information.${NC}"
else
    echo -e "${GREEN}✓ Successfully updated kubectl config${NC}"
    
    # Get all services
    echo -e "${YELLOW}Getting Kubernetes services...${NC}"
    SERVICES=$(kubectl get services -A -o json 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to get Kubernetes services.${NC}"
    else
        # Process and display services
        echo -e "${GREEN}Found Kubernetes services:${NC}"
        
        # Parse the JSON and list services
        for namespace in $(echo "$SERVICES" | jq -r '.items[].metadata.namespace' | sort | uniq); do
            echo -e "\n${BLUE}Namespace: ${NC}$namespace"
            
            namespace_services=$(echo "$SERVICES" | jq -r ".items[] | select(.metadata.namespace == \"$namespace\")")
            
            for service_name in $(echo "$namespace_services" | jq -r '.metadata.name' | sort); do
                service_info=$(echo "$namespace_services" | jq -r "select(.metadata.name == \"$service_name\")")
                service_type=$(echo "$service_info" | jq -r '.spec.type')
                
                # Check if this is a LoadBalancer service
                if [[ "$service_type" == "LoadBalancer" ]]; then
                    lb_ingress=$(echo "$service_info" | jq -r '.status.loadBalancer.ingress[0].hostname // "Pending"')
                    
                    # Check if internal or external
                    is_internal=$(echo "$service_info" | jq -r '.metadata.annotations."service.beta.kubernetes.io/aws-load-balancer-internal" // "false"')
                    if [[ "$is_internal" == "true" ]]; then
                        lb_type="Internal LoadBalancer"
                    else
                        lb_type="External LoadBalancer"
                    fi
                    
                    echo -e "  ${BLUE}Service:${NC} $service_name"
                    echo -e "    ${BLUE}Type:${NC} $lb_type"
                    echo -e "    ${BLUE}Endpoint:${NC} $lb_ingress"
                    
                    # Show selector
                    selector=$(echo "$service_info" | jq -r '.spec.selector | to_entries | map("\(.key)=\(.value)") | join(", ")')
                    echo -e "    ${BLUE}Selector:${NC} $selector"
                    
                    # Show ports
                    echo -e "    ${BLUE}Ports:${NC}"
                    ports=$(echo "$service_info" | jq -r '.spec.ports[] | "\(.port):\(.targetPort)"')
                    echo "$ports" | while read -r port_mapping; do
                        echo -e "      - $port_mapping"
                    done
                else
                    echo -e "  ${BLUE}Service:${NC} $service_name (Type: $service_type)"
                fi
            done
        done
    fi
    
    # Get information about pods matching the frontend and backend services
    echo -e "\n${YELLOW}Getting pod status for frontend and backend...${NC}"
    for app in "hcm-developer-util-frontend" "hcm-developer-util-backend"; do
        echo -e "\n${BLUE}Application: ${NC}$app"
        pods=$(kubectl get pods -l app=$app -o json 2>/dev/null)
        
        if [ $? -ne 0 ]; then
            echo -e "  ${RED}No pods found${NC}"
        else
            pod_count=$(echo "$pods" | jq '.items | length')
            if [ "$pod_count" -eq 0 ]; then
                echo -e "  ${YELLOW}No pods found${NC}"
            else
                for pod_name in $(echo "$pods" | jq -r '.items[].metadata.name'); do
                    pod_status=$(echo "$pods" | jq -r ".items[] | select(.metadata.name == \"$pod_name\") | .status.phase")
                    echo -e "  ${BLUE}Pod:${NC} $pod_name (Status: $pod_status)"
                done
            fi
        fi
    done
fi

# After the Kubernetes services section, add a new section for AWS Load Balancer Controller
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                AWS LOAD BALANCER CONTROLLER               │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"

# Check if AWS Load Balancer Controller is installed
LB_CONTROLLER_PODS=$(kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller -o json 2>/dev/null)
LB_CONTROLLER_COUNT=$(echo "$LB_CONTROLLER_PODS" | jq -r '.items | length')

if [ "$LB_CONTROLLER_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ AWS Load Balancer Controller is installed${NC}"
    
    # Show controller pods
    echo -e "${BLUE}Controller Pods:${NC}"
    echo "$LB_CONTROLLER_PODS" | jq -r '.items[] | .metadata.name + " (Status: " + .status.phase + ")"' | while read -r pod_info; do
        echo -e "  - $pod_info"
    done
    
    # Check for recent errors in the logs
    echo -e "\n${BLUE}Checking for errors in controller logs:${NC}"
    CONTROLLER_POD=$(echo "$LB_CONTROLLER_PODS" | jq -r '.items[0].metadata.name')
    if [ -n "$CONTROLLER_POD" ]; then
        RECENT_ERRORS=$(kubectl logs -n kube-system "$CONTROLLER_POD" --tail=50 2>/dev/null | grep -i "error\|fail\|warn" | tail -5)
        if [ -n "$RECENT_ERRORS" ]; then
            echo -e "${YELLOW}Recent warnings/errors from controller logs:${NC}"
            echo "$RECENT_ERRORS" | sed 's/^/  /'
        else
            echo -e "${GREEN}No recent errors found in controller logs${NC}"
        fi
    fi
else
    echo -e "${RED}✗ AWS Load Balancer Controller is not installed${NC}"
    echo -e "${YELLOW}This is required for LoadBalancer services to work properly${NC}"
    echo -e "${YELLOW}Consider installing the controller with:${NC}"
    echo -e "  helm repo add eks https://aws.github.io/eks-charts"
    echo -e "  helm install aws-load-balancer-controller eks/aws-load-balancer-controller \\"
    echo -e "    --set clusterName=$CLUSTER_NAME \\"
    echo -e "    --set serviceAccount.create=false \\"
    echo -e "    --set serviceAccount.name=aws-load-balancer-controller \\"
    echo -e "    -n kube-system"
fi

# Get addons information
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                    CLUSTER ADDONS                         │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"

# Get all addons directly using AWS CLI query
ADDONS=$(aws eks list-addons --cluster-name $CLUSTER_NAME --region $REGION --output json 2>/dev/null)
ADDON_LIST=$(echo "$ADDONS" | jq -r '.addons[]' 2>/dev/null)

if [ -z "$ADDON_LIST" ]; then
    echo -e "${YELLOW}No addons found for cluster $CLUSTER_NAME${NC}"
    echo -e "${YELLOW}This might be a permission issue or the cluster doesn't have addons installed${NC}"
else
    echo -e "${GREEN}Found $(echo "$ADDON_LIST" | wc -l) addons:${NC}"
    
    # Process each addon
    echo "$ADDON_LIST" | while read -r ADDON; do
        echo -e "${BLUE}Addon: ${NC}$ADDON"
        ADDON_INFO=$(aws eks describe-addon --cluster-name $CLUSTER_NAME --addon-name "$ADDON" --region $REGION --output json 2>/dev/null)
        
        ADDON_VERSION=$(echo "$ADDON_INFO" | jq -r '.addon.addonVersion // "Unknown"')
        ADDON_STATUS=$(echo "$ADDON_INFO" | jq -r '.addon.status // "Unknown"')
        CREATION_TIME=$(echo "$ADDON_INFO" | jq -r '.addon.createdAt // "Unknown"' | sed 's/T/ /g' | sed 's/\.[0-9]*Z//g')
        
        echo -e "  ${BLUE}Version: ${NC}$ADDON_VERSION"
        echo -e "  ${BLUE}Status:  ${NC}$ADDON_STATUS"
        echo -e "  ${BLUE}Created: ${NC}$CREATION_TIME"
        
        # Get service account if exists
        SERVICE_ACCOUNT=$(echo "$ADDON_INFO" | jq -r '.addon.serviceAccountRoleArn // "None"')
        if [ "$SERVICE_ACCOUNT" != "None" ] && [ "$SERVICE_ACCOUNT" != "null" ]; then
            echo -e "  ${BLUE}Service Account from Addon: ${NC}$SERVICE_ACCOUNT"
        fi
        
        echo ""
    done
fi

# Get IAM roles information
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                      IAM ROLES                            │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
ROLE_ARN=$(echo "$CLUSTER_INFO" | grep -o '"roleArn": "[^"]*' | head -1 | cut -d'"' -f4)
ROLE_NAME=$(echo "$ROLE_ARN" | sed 's/.*role\///')
echo -e "${BLUE}Cluster Role: ${NC}$ROLE_NAME"
echo -e "${BLUE}Role ARN:     ${NC}$ROLE_ARN"

# Get OIDC provider information
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                    OIDC PROVIDER                          │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"

# Get the OIDC issuer URL directly from the EKS cluster
OIDC_ISSUER=$(aws eks describe-cluster --name $CLUSTER_NAME --region $REGION --query "cluster.identity.oidc.issuer" --output text 2>/dev/null)

if [ -n "$OIDC_ISSUER" ] && [ "$OIDC_ISSUER" != "null" ]; then
    echo -e "${BLUE}Issuer: ${NC}$OIDC_ISSUER"
    
    # Get the OIDC ID from the URL
    OIDC_ID=$(echo "$OIDC_ISSUER" | grep -o '[^/]*$')
    
    # Check if the OIDC provider is registered with IAM
    OIDC_PROVIDER_ARN=$(aws iam list-open-id-connect-providers --region $REGION --query "OpenIDConnectProviderList[?contains(Arn, '$OIDC_ID')].Arn" --output text 2>/dev/null)
    
    if [ -n "$OIDC_PROVIDER_ARN" ] && [ "$OIDC_PROVIDER_ARN" != "None" ]; then
        echo -e "${GREEN}✓ OIDC provider is registered with IAM${NC}"
        echo -e "${BLUE}ARN: ${NC}$OIDC_PROVIDER_ARN"
        
        # Get additional details about the OIDC provider
        echo -e "${BLUE}Client IDs: ${NC}"
        CLIENT_IDS=$(aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_PROVIDER_ARN" --query "ClientIDList" --output text 2>/dev/null || echo "Unable to retrieve")
        echo -e "  $CLIENT_IDS"
    else
        echo -e "${YELLOW}! OIDC provider is configured but not found in IAM providers${NC}"
        echo -e "${YELLOW}This might be a permission issue or the OIDC provider was deleted manually${NC}"
    fi
else
    echo -e "${RED}No OIDC provider configured for this cluster${NC}"
fi

# After the OIDC provider section, add a dedicated section for service accounts
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│          IAM ROLES FOR SERVICE ACCOUNTS (IRSA)            │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"

echo -e "${BLUE}Checking for Kubernetes Service Accounts with IAM Roles...${NC}"
if command -v kubectl &> /dev/null; then
    # Update kubeconfig for this cluster
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION" --quiet >/dev/null 2>&1
    # Get the service accounts with IAM role annotations
    SA_LIST=$(kubectl get serviceaccount -A -o json | jq -r '.items[] | select(.metadata.annotations."eks.amazonaws.com/role-arn" != null) | "\(.metadata.namespace)/\(.metadata.name): \(.metadata.annotations."eks.amazonaws.com/role-arn")"' 2>/dev/null || echo "")
    if [ -n "$SA_LIST" ]; then
        echo -e "${GREEN}Found service accounts with IAM roles:${NC}"
        echo "$SA_LIST" | while read -r line; do
            echo -e "  ${CYAN}$line${NC}"
        done
    else
        echo -e "${YELLOW}No service accounts with IAM role annotations found${NC}"
    fi
else
    echo -e "${YELLOW}kubectl not available, skipping service account check${NC}"
fi

# Get ECR repositories
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                   ECR REPOSITORIES                        │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
ECR_REPOS=$(aws ecr describe-repositories --region $REGION 2>/dev/null | grep -o '"repositoryName": "[^"]*' | cut -d'"' -f4 | grep -i "$CLUSTER_NAME\|hcm-developer-util")

if [ -z "$ECR_REPOS" ]; then
    echo -e "${YELLOW}No ECR repositories found matching the cluster name pattern${NC}"
    
    # List all repositories instead
    echo -e "${BLUE}Showing all available ECR repositories:${NC}"
    ALL_REPOS=$(aws ecr describe-repositories --region $REGION 2>/dev/null | grep -o '"repositoryName": "[^"]*' | cut -d'"' -f4)
    if [ -z "$ALL_REPOS" ]; then
        echo -e "${RED}No ECR repositories found in region $REGION${NC}"
    else
        echo "$ALL_REPOS" | head -10 | sed 's/^/  - /'
        TOTAL_REPOS=$(echo "$ALL_REPOS" | wc -l)
        if [ $TOTAL_REPOS -gt 10 ]; then
            echo -e "  ${YELLOW}...and $(($TOTAL_REPOS - 10)) more${NC}"
        fi
    fi
else
    for REPO in $ECR_REPOS; do
        echo -e "${BLUE}Repository: ${NC}$REPO"
        # Get the latest image
        LATEST_IMAGE=$(aws ecr describe-images --repository-name $REPO --region $REGION --query 'imageDetails[*].{Tag:imageTags[0],PushedAt:imagePushedAt}' --output text | sort -k2 -r | head -1)
        if [ -n "$LATEST_IMAGE" ]; then
            TAG=$(echo "$LATEST_IMAGE" | awk '{print $1}')
            DATE=$(echo "$LATEST_IMAGE" | awk '{print $2}')
            echo -e "  ${BLUE}Latest Tag:  ${NC}$TAG"
            echo -e "  ${BLUE}Pushed At:   ${NC}$DATE"
        else
            echo -e "  ${RED}No images found in this repository${NC}"
        fi
    done
fi

# Check for CloudFormation stacks related to the cluster
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                 CLOUDFORMATION STACKS                     │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
STACKS=$(aws cloudformation describe-stacks --region $REGION 2>/dev/null | grep -o '"StackName": "[^"]*' | cut -d'"' -f4 | grep -i "$CLUSTER_NAME\|hcm-developer-util\|eks")

if [ -z "$STACKS" ]; then
    echo -e "${YELLOW}No CloudFormation stacks found related to this cluster${NC}"
else
    for STACK in $STACKS; do
        STACK_INFO=$(aws cloudformation describe-stacks --stack-name $STACK --region $REGION 2>/dev/null)
        STACK_STATUS=$(echo "$STACK_INFO" | grep -o '"StackStatus": "[^"]*' | cut -d'"' -f4)
        CREATION_TIME=$(echo "$STACK_INFO" | grep -o '"CreationTime": "[^"]*' | cut -d'"' -f4)
        
        echo -e "${BLUE}Stack: ${NC}$STACK"
        echo -e "  ${BLUE}Status:  ${NC}$STACK_STATUS"
        echo -e "  ${BLUE}Created: ${NC}$CREATION_TIME"
    done
fi

# Check for Terraform state files in S3
echo -e "\n${CYAN}┌───────────────────────────────────────────────────────────┐${NC}"
echo -e "${CYAN}│                    TERRAFORM STATE                        │${NC}"
echo -e "${CYAN}└───────────────────────────────────────────────────────────┘${NC}"
# Look for S3 buckets with "terraform" in the name
TF_BUCKETS=$(aws s3api list-buckets --query "Buckets[?contains(Name, 'terraform')].Name" --output text 2>/dev/null)

if [ -z "$TF_BUCKETS" ]; then
    echo -e "${YELLOW}No S3 buckets found with 'terraform' in the name${NC}"
else
    for BUCKET in $TF_BUCKETS; do
        echo -e "${BLUE}Bucket: ${NC}$BUCKET"
        # Look for state files related to the cluster
        STATE_FILES=$(aws s3 ls s3://$BUCKET/ --recursive | grep -i "$CLUSTER_NAME\|hcm-developer-util\|eks" | grep ".tfstate" || echo "")
        
        if [ -n "$STATE_FILES" ]; then
            echo -e "  ${BLUE}State files:${NC}"
            echo "$STATE_FILES" | head -5 | sed 's/^/    /'
            STATE_COUNT=$(echo "$STATE_FILES" | wc -l)
            if [ $STATE_COUNT -gt 5 ]; then
                echo -e "    ${YELLOW}...and $(($STATE_COUNT - 5)) more${NC}"
            fi
        else
            echo -e "  ${YELLOW}No relevant state files found${NC}"
        fi
    done
fi

echo -e "\n${GREEN}AWS EKS Cluster information retrieval completed!${NC}"
echo -e "${YELLOW}Note: This script only shows information using AWS CLI and does not require kubectl access.${NC}" 