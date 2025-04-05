#!/bin/bash

# Script to destroy the EKS infrastructure in the proper order
# This script runs Terraform commands directly on your local machine

# Exit on error
set -e

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if script is being run from the menu 
# The menu will set an environment variable to indicate this
if [ -z "$RUNNING_FROM_MENU" ]; then
  # Display a confirmation prompt if not running from menu
  echo "⚠️ WARNING: This script will destroy all EKS infrastructure resources."
  echo "This action is IRREVERSIBLE and will delete all data in the EKS cluster."
  echo ""
  read -p "Are you sure you want to proceed? (y/n): " -n 1 -r
  echo ""

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Operation cancelled."
      exit 0
  fi
  
  # Set this to skip additional prompts throughout the script
  SKIP_PROMPTS=true
else
  # Running from menu, the menu already asked for confirmation
  echo "🔄 Running destroy operation initiated from menu..."
  SKIP_PROMPTS=true
fi

echo "🔄 Starting destruction process..."

# First check if Terraform state files exist before doing anything
echo ""
echo "🔄 Checking for Terraform state file"

# Check specifically for the S3 state file from the backend configuration
S3_STATE_EXIST=$(aws s3 ls s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/terraform.tfstate 2>/dev/null || echo "")

if [ -n "$S3_STATE_EXIST" ]; then
    echo "✅ Found state file in S3: s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/terraform.tfstate"
else
    echo "ℹ️ No Terraform state file found in S3."
    echo "This means the infrastructure was already destroyed or never created."
    echo "✅ No resources to destroy. Exiting successfully."
    exit 0
fi

echo "✅ Proceeding with destruction process."

# Function to run terraform commands and check for errors
run_terraform() {
    local command=$1
    local description=$2
    
    echo ""
    echo "🔄 $description"
    
    # Add -input=false to suppress warnings about target usage
    if [[ $command == *"-target="* && $command != *"-input=false"* ]]; then
        command="$command -input=false"
    fi
    
    eval "terraform $command"
    
    if [ $? -ne 0 ]; then
        echo "❌ Error: $description failed"
        exit 1
    fi
    
    echo "✅ $description completed successfully"
}

# Function to clean up Kubernetes resources before Terraform destroy
cleanup_kubernetes_resources() {
    echo ""
    echo "🔄 Checking for Kubernetes LoadBalancer services to clean up..."
    
    # Try to get VPC ID from Terraform output
    local VPC_ID
    VPC_ID=$(terraform output vpc_id 2>/dev/null || echo "")
    
    # If VPC ID couldn't be determined from Terraform, try looking it up by name
    if [ -z "$VPC_ID" ]; then
        echo "🔍 Trying to find VPC by name (hcm-developer-util-vpc)..."
        VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=hcm-developer-util-vpc" --query "Vpcs[0].VpcId" --output text 2>/dev/null || echo "")
        
        if [ -n "$VPC_ID" ] && [ "$VPC_ID" != "None" ]; then
            echo "✅ Found VPC ID by name: $VPC_ID"
        else
            VPC_ID=""
        fi
    fi
    
    # If VPC ID couldn't be determined, ask the user
    if [ -z "$VPC_ID" ]; then
        echo "⚠️ Could not automatically determine the VPC ID from Terraform state or by name."
        echo "This can happen if the Terraform state is not accessible or if the VPC was already destroyed."
        read -p "Would you like to manually provide the VPC ID? (y/n): " -n 1 -r PROVIDE_VPC
        echo
        
        if [[ $PROVIDE_VPC =~ ^[Yy]$ ]]; then
            read -p "Please enter the VPC ID (e.g., vpc-0a8282817e061110e): " VPC_ID
            echo "Using manually provided VPC ID: $VPC_ID"
        else
            echo "⚠️ No VPC ID provided. Load balancer cleanup will be skipped."
            VPC_ID=""
        fi
    else
        echo "✅ Using VPC ID: $VPC_ID"
    fi
    
    # Check if kubectl is configured and can access the cluster
    if ! kubectl get nodes &>/dev/null; then
        echo "⚠️ Cannot access Kubernetes cluster. Skipping Kubernetes resource cleanup."
    else
        # Get all LoadBalancer services
        local LOADBALANCER_SERVICES
        LOADBALANCER_SERVICES=$(kubectl get svc --all-namespaces -o json | jq -r '.items[] | select(.spec.type == "LoadBalancer") | .metadata.namespace + "/" + .metadata.name' 2>/dev/null || echo "")
        
        if [ -n "$LOADBALANCER_SERVICES" ]; then
            echo "🔍 Found LoadBalancer services to delete:"
            echo "$LOADBALANCER_SERVICES"
            
            # Delete each LoadBalancer service
            echo "$LOADBALANCER_SERVICES" | while read -r service; do
                if [ -n "$service" ]; then
                    echo "🗑️ Deleting service: $service"
                    kubectl delete svc -n "${service%/*}" "${service#*/}" || echo "⚠️ Failed to delete service $service, continuing..."
                fi
            done
            
            # Wait for load balancers to be fully deleted
            echo "⏳ Waiting 60 seconds for AWS to delete load balancers..."
            sleep 60
        else
            echo "✅ No LoadBalancer services found."
        fi
        
        # Optional: Delete other potential blocking resources
        echo "🔄 Deleting other potential blocking resources..."
        kubectl delete ingress --all --all-namespaces 2>/dev/null || true
    fi
    
    # Actively delete any remaining load balancers associated with our VPC
    echo "🔄 Checking for remaining AWS load balancers..."
    
    # Get AWS region
    AWS_REGION=$(aws configure get region || echo "eu-north-1")
    echo "🔍 Using AWS region: $AWS_REGION"
    
    # For classic ELBs
    if [ -n "$VPC_ID" ]; then
        echo "🔍 Searching for Classic ELBs in VPC: $VPC_ID"
        ELB_NAMES=$(aws elb describe-load-balancers --region $AWS_REGION --query "LoadBalancerDescriptions[?VPCId=='$VPC_ID'].LoadBalancerName" --output text 2>/dev/null || echo "")
        
        if [ -n "$ELB_NAMES" ] && [ "$ELB_NAMES" != "None" ]; then
            echo "🔍 Found Classic ELBs to delete:"
            echo "$ELB_NAMES"
            
            # Delete each classic ELB
            for elb in $ELB_NAMES; do
                echo "🗑️ Deleting Classic ELB: $elb"
                aws elb delete-load-balancer --load-balancer-name "$elb" --region $AWS_REGION
                
                # Verify the load balancer is deleted
                MAX_RETRIES=5
                for ((i=1; i<=MAX_RETRIES; i++)); do
                    if aws elb describe-load-balancers --load-balancer-names "$elb" --region $AWS_REGION 2>&1 | grep -q "LoadBalancerNotFound"; then
                        echo "✅ Classic ELB $elb deleted successfully"
                        break
                    fi
                    if [ $i -eq $MAX_RETRIES ]; then
                        echo "⚠️ Warning: Classic ELB $elb may not have been deleted properly. Consider checking the AWS console."
                    else
                        echo "⏳ Waiting for Classic ELB $elb to be deleted... (attempt $i/$MAX_RETRIES)"
                        sleep 10
                    fi
                done
            done
        else
            echo "✅ No Classic ELBs found in VPC $VPC_ID"
        fi
    else
        echo "⚠️ No VPC ID found, skipping Classic ELB deletion for safety"
    fi
    
    # For ALBs and NLBs
    if [ -n "$VPC_ID" ]; then
        echo "🔍 Searching for ALBs/NLBs in VPC: $VPC_ID"
        
        # Strip any quotes from the VPC ID
        VPC_ID_CLEAN=$(echo $VPC_ID | tr -d '"')
        echo "🔍 Using cleaned VPC ID for search: $VPC_ID_CLEAN"
        
        # Get load balancers directly by VPC ID
        echo "🔍 Getting load balancers for VPC: $VPC_ID_CLEAN"
        LB_ARNS=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query "LoadBalancers[?VpcId=='$VPC_ID_CLEAN'].LoadBalancerArn" --output text 2>/dev/null || echo "")
        
        if [ -n "$LB_ARNS" ] && [ "$LB_ARNS" != "None" ]; then
            echo "🔍 Found ALBs/NLBs to delete:"
            echo "$LB_ARNS"
            
            # Delete each ALB/NLB
            for lb_arn in $LB_ARNS; do
                # Get LB details
                LB_DETAILS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$lb_arn" --region $AWS_REGION 2>/dev/null || echo "")
                if [ -z "$LB_DETAILS" ]; then
                    echo "⚠️ Could not get details for load balancer $lb_arn, skipping"
                    continue
                fi
                
                LB_NAME=$(echo "$LB_DETAILS" | jq -r '.LoadBalancers[0].LoadBalancerName')
                echo "🗑️ Deleting ALB/NLB: $LB_NAME (ARN: $lb_arn)"
                
                # Delete listeners first to break dependencies
                LISTENER_ARNS=$(aws elbv2 describe-listeners --load-balancer-arn "$lb_arn" --region $AWS_REGION --query "Listeners[].ListenerArn" --output text 2>/dev/null || echo "")
                if [ -n "$LISTENER_ARNS" ] && [ "$LISTENER_ARNS" != "None" ]; then
                    for listener_arn in $LISTENER_ARNS; do
                        echo "🗑️ Deleting Listener: $listener_arn"
                        aws elbv2 delete-listener --listener-arn "$listener_arn" --region $AWS_REGION || echo "⚠️ Failed to delete listener, continuing..."
                    done
                fi
                
                # Delete the load balancer
                echo "🔄 Deleting load balancer: $lb_arn"
                aws elbv2 delete-load-balancer --load-balancer-arn "$lb_arn" --region $AWS_REGION
                
                # Check if deletion was successful
                if ! aws elbv2 describe-load-balancers --load-balancer-arns "$lb_arn" --region $AWS_REGION 2>&1 | grep -q "LoadBalancerArn"; then
                    echo "✅ ALB/NLB $LB_NAME deleted successfully"
                else
                    echo "⚠️ Failed to delete load balancer, retrying with force flag..."
                    aws elbv2 delete-load-balancer --load-balancer-arn "$lb_arn" --region $AWS_REGION --force 2>/dev/null
                fi
                
                # Find and delete target groups associated with this load balancer
                TG_ARNS=$(aws elbv2 describe-target-groups --region $AWS_REGION --query "TargetGroups[?LoadBalancerArns[0]=='$lb_arn'].TargetGroupArn" --output text 2>/dev/null || echo "")
                if [ -n "$TG_ARNS" ] && [ "$TG_ARNS" != "None" ]; then
                    for tg_arn in $TG_ARNS; do
                        echo "🗑️ Deleting Target Group: $tg_arn"
                        aws elbv2 delete-target-group --target-group-arn "$tg_arn" --region $AWS_REGION || echo "⚠️ Failed to delete target group, continuing..."
                    done
                fi
            done
            
            # Wait for load balancers to be fully deleted only if we found and deleted some
            echo "⏳ Waiting 30 seconds for AWS to finish deleting load balancers..."
            sleep 30
        else
            echo "✅ No ALBs/NLBs found in VPC $VPC_ID_CLEAN, no need to wait"
        fi
    else
        echo "⚠️ No VPC ID found, skipping ALB/NLB deletion for safety"
    fi
    
    # Verify all load balancers are gone
    if [ -n "$VPC_ID_CLEAN" ]; then
        REMAINING_LBS=$(aws elbv2 describe-load-balancers --region $AWS_REGION --query "length(LoadBalancers[?VpcId=='$VPC_ID_CLEAN'])" --output text 2>/dev/null || echo "0")
        if [ "$REMAINING_LBS" != "0" ] && [ "$REMAINING_LBS" != "None" ]; then
            echo "⚠️ Warning: There are still $REMAINING_LBS load balancers in your VPC."
            echo "These might require manual deletion via the AWS console."
            aws elbv2 describe-load-balancers --region $AWS_REGION --query "LoadBalancers[?VpcId=='$VPC_ID_CLEAN'].[LoadBalancerName,LoadBalancerArn]" --output text
            
            if [ "$SKIP_PROMPTS" = true ]; then
                echo "⚠️ Continuing despite remaining load balancers (prompts skipped)..."
            else
                read -p "Continue with destruction process? (y/n) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        else
            echo "✅ No AWS load balancers found for your VPC."
        fi
    fi
    
    echo "✅ AWS resource cleanup completed."
}

# Step 1: Initialize Terraform (just in case)
run_terraform "init" "Initializing Terraform configuration"

# Step 2: Clean up Kubernetes resources
cleanup_kubernetes_resources

# Step 3: Remove kubernetes_config_map.aws_auth from state to avoid Unauthorized errors
echo ""
echo "🔄 Checking for aws_auth ConfigMap in Terraform state"
if terraform state list | grep -q "kubernetes_config_map.aws_auth"; then
    echo "🔄 Removing aws_auth ConfigMap from Terraform state"
    terraform state rm kubernetes_config_map.aws_auth
else
    echo "✅ ConfigMap not found in state, skipping removal"
fi

# Step 4: Destroy AWS Load Balancer Controller
run_terraform "destroy -target=helm_release.lb_controller -target=kubernetes_service_account.lb_controller -target=aws_iam_role_policy_attachment.lb_controller_attachment -target=aws_iam_role.lb_controller_role -target=aws_iam_policy.lb_controller -auto-approve" "Destroying AWS Load Balancer Controller"

# Step 5: Destroy service accounts and trust policies
run_terraform "destroy -target=kubernetes_service_account.backend_service_account -target=aws_iam_role_policy_attachment.dynamodb_access -target=aws_iam_role.backend_service_role -auto-approve" "Destroying service accounts and trust policies"

# Step 6: Destroy repositories
run_terraform "destroy -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend -auto-approve" "Destroying repositories"

# Step 7: Destroy CoreDNS and kube-proxy addons
run_terraform "destroy -target=aws_eks_addon.kube_proxy -target=aws_eks_addon.coredns -auto-approve" "Destroying CoreDNS and kube-proxy addons"

# Step 8: Destroy node group
run_terraform "destroy -target=aws_eks_node_group.simple -auto-approve" "Destroying node group"

# Step 9: Destroy VPC CNI addon
run_terraform "destroy -target=aws_eks_addon.vpc_cni -auto-approve" "Destroying VPC CNI addon"

# Step 10: Destroy cluster autoscaler role
run_terraform "destroy -target=aws_iam_role_policy.cluster_autoscaler -target=aws_iam_role.cluster_autoscaler -auto-approve" "Destroying cluster autoscaler role"

# Step 11: Destroy OIDC provider
run_terraform "destroy -target=aws_iam_openid_connect_provider.eks -auto-approve" "Destroying OIDC provider"

# Step 12: Destroy EKS cluster
run_terraform "destroy -target=aws_eks_cluster.main -auto-approve" "Destroying EKS cluster"

# Step 13: Destroy security groups and KMS key
run_terraform "destroy -target=aws_security_group.eks_nodes -target=aws_kms_key.eks -auto-approve" "Destroying security groups and KMS key"

# Step 14: Destroy IAM roles and policies
run_terraform "destroy -target=aws_iam_role_policy.eks_node_additional -target=aws_iam_role_policy_attachment.eks_ssm_policy -target=aws_iam_role_policy_attachment.eks_container_registry -target=aws_iam_role_policy_attachment.eks_cni_policy -target=aws_iam_role_policy_attachment.eks_node_group_policy -target=aws_iam_role_policy_attachment.eks_cluster_policy -target=aws_iam_role.eks_node_group -target=aws_iam_role.eks_cluster -auto-approve" "Destroying IAM roles and policies"

# Step 15: Destroy networking components
run_terraform "destroy -target=aws_route_table_association.private -target=aws_route_table.private -target=aws_nat_gateway.main -target=aws_eip.nat -target=aws_route_table_association.public -target=aws_route_table.public -target=aws_internet_gateway.main -auto-approve" "Destroying network components"

# Step 16: Destroy VPC and subnets
run_terraform "destroy -target=aws_subnet.private -target=aws_subnet.public -target=aws_vpc.main -auto-approve" "Destroying VPC and subnets"

# Step 17: Destroy any remaining resources
run_terraform "destroy -auto-approve" "Destroying remaining resources"

echo ""
echo "🎉 EKS infrastructure has been completely destroyed!"
echo "" 

# Wait a bit for AWS to fully process all the deletions
echo "Waiting 30 seconds for AWS resources to update before validation..."
sleep 30

# Run the validation script
echo ""
echo "🔍 Validating that all resources have been properly destroyed..."
./validate-destroy.sh

# Capture the validation exit code
VALIDATE_EXIT_CODE=$?

# Final status message based on validation results
if [ $VALIDATE_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Destruction validated: All resources have been successfully removed!"
    
    # Delete state file without confirmation
    echo "Deleting Terraform state file from S3..."
    aws s3 rm s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/terraform.tfstate
    echo "S3 state file deleted successfully!"
else
    echo ""
    echo "⚠️ Some resources may still exist. Please review the validation output above."
fi

exit $VALIDATE_EXIT_CODE 