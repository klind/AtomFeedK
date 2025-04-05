#!/bin/bash

# Script: menu.sh
# Purpose: Provides a terminal-based menu interface for all Terraform scripts

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;96m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(dirname "$SCRIPT_DIR")/terraform-eks-split"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$TF_DIR"

# Function to clear the screen and display the title
show_header() {
    clear
    echo -e "${YELLOW}=================================================${NC}"
    echo -e "${YELLOW}=    HCM Developer Util Management Interface    =${NC}"
    echo -e "${YELLOW}=================================================${NC}"
    echo ""
}

# Function to show the main menu
show_main_menu() {
    show_header
    echo -e "${CYAN}Choose an option:${NC}"
    echo ""
    echo -e "${GREEN}TERRAFORM OPERATIONS:${NC}"
    echo -e "  ${BLUE}1)${NC}  Validate Current Deployment"
    echo -e "  ${BLUE}2)${NC}  Apply Specific Deployment Step"
    echo -e "  ${BLUE}3)${NC}  Deploy EKS Cluster - Local Mode"
    echo -e "  ${BLUE}4)${NC}  Deploy EKS Cluster - Remote Mode"
    echo -e "  ${BLUE}5)${NC}  Destroy EKS Cluster - Local Mode"
    echo -e "  ${BLUE}6)${NC}  Destroy EKS Cluster - Remote Mode"
    echo ""
    echo -e "${GREEN}DOCKER OPERATIONS:${NC}"
    echo -e "  ${BLUE}7)${NC}  Run Docker Compose (local development)"
    echo -e "  ${BLUE}8)${NC}  Stop Docker Containers"
    echo -e "  ${BLUE}9)${NC}  Build and Push All Images to ECR"
    echo -e "  ${BLUE}10)${NC} Build and Push Frontend Image to ECR"
    echo -e "  ${BLUE}11)${NC} Build and Push Backend Image to ECR"
    echo ""
    echo -e "${GREEN}KUBERNETES OPERATIONS:${NC}"
    echo -e "  ${BLUE}12)${NC} View Kubernetes Deployment Status"
    echo ""
    echo -e "${GREEN}OTHER OPERATIONS:${NC}"
    echo -e "  ${BLUE}13)${NC} View Documentation (README)"
    echo -e "  ${BLUE}14)${NC} Check AWS Session Status"
    echo -e "  ${BLUE}0)${NC}  Exit"
    echo ""
    echo -e "${CYAN}Enter your choice [0-14]: ${NC}"
}

# Function to prompt user to continue
press_enter() {
    echo ""
    read -p "Press Enter to continue..."
}

# Function to apply a specific step
apply_specific_step() {
    show_header
    echo -e "${CYAN}Apply a Specific Deployment Step${NC}"
    echo ""
    echo -e "${GREEN}Available Steps:${NC}"
    echo -e "  ${BLUE}1)${NC}  Initialize Terraform"
    echo -e "  ${BLUE}2)${NC}  Create VPC and subnets"
    echo -e "  ${BLUE}3)${NC}  Create networking components (IGW, NAT, route tables)"
    echo -e "  ${BLUE}4)${NC}  Create IAM roles and policies"
    echo -e "  ${BLUE}5)${NC}  Create security groups and KMS key"
    echo -e "  ${BLUE}6)${NC}  Create EKS cluster"
    echo -e "  ${BLUE}7)${NC}  Create OIDC provider and cluster autoscaler role"
    echo -e "  ${BLUE}8)${NC}  Create auth config map"
    echo -e "  ${BLUE}9)${NC}  Create VPC CNI addon"
    echo -e "  ${BLUE}10)${NC} Create node group"
    echo -e "  ${BLUE}11)${NC} Create CoreDNS and kube-proxy addons"
    echo -e "  ${BLUE}12)${NC} Create repositories"
    echo -e "  ${BLUE}13)${NC} Create service accounts and trust policies"
    echo -e "  ${BLUE}14)${NC} Install AWS Load Balancer Controller"
    echo -e "  ${BLUE}15)${NC} Apply remaining resources and outputs"
    echo -e "  ${BLUE}0)${NC}  Return to main menu"
    echo ""
    
    read -p "Enter the step number (1-15, or 0 to return): " STEP
    
    if [ "$STEP" == "0" ]; then
        return
    fi
    
    if ! [[ "$STEP" =~ ^[0-9]+$ ]] || [ "$STEP" -lt 1 ] || [ "$STEP" -gt 15 ]; then
        echo -e "${RED}Invalid option. Please select a number between 1 and 15.${NC}"
        press_enter
        apply_specific_step
        return
    fi
    
    read -p "Choose execution mode (local or remote): " MODE
    
    if [ "$MODE" != "local" ] && [ "$MODE" != "remote" ]; then
        echo -e "${RED}Invalid execution mode. Use 'local' or 'remote'.${NC}"
        press_enter
        apply_specific_step
        return
    fi
    
    echo -e "${YELLOW}Executing step $STEP using $MODE mode...${NC}"
    ./apply-step.sh $STEP $MODE
    press_enter
}

# Function to show README
show_readme() {
    show_header
    echo -e "${CYAN}Documentation (README)${NC}"
    echo ""
    # Always use cat to avoid requiring 'q' to exit
    cat README.md
    press_enter
}

# Function to check AWS session status
check_aws_status() {
    show_header
    echo -e "${CYAN}Checking AWS Session Status${NC}"
    echo ""
    echo -e "${YELLOW}AWS Identity:${NC}"
    aws sts get-caller-identity | cat
    
    echo ""
    echo -e "${YELLOW}Current AWS Region:${NC}"
    aws configure get region | cat
    
    echo ""
    echo -e "${YELLOW}S3 Terraform State Bucket Status:${NC}"
    aws s3 ls s3://tv2-terraform-state/tf-hcm-developer-util-eks-state/ | cat || echo -e "${RED}Error accessing S3 bucket - check permissions${NC}"
    
    echo ""
    echo -e "${YELLOW}EC2 Terraform Runner Status:${NC}"
    aws ec2 describe-instances --instance-ids i-0b9b4ceb79a265a52 --query "Reservations[].Instances[].State.Name" --output text 2>/dev/null | cat || echo -e "${RED}Error checking instance status - instance may not exist${NC}"
    
    press_enter
}

# Function to confirm an action with y/n prompt
confirm_action() {
    local message=$1
    echo -e "${YELLOW}$message${NC}"
    echo -e "${YELLOW}Are you sure you want to proceed? (y/n):${NC}"
    
    while true; do
        read -r -n 1 confirm
        echo    # Add a newline after the character input
        
        case $confirm in
            [Yy])
                return 0
                ;;
            [Nn])
                echo -e "${RED}Operation cancelled.${NC}"
                return 1
                ;;
            *)
                echo -e "${RED}Invalid input. Please enter 'y' or 'n':${NC}"
                ;;
        esac
    done
}

# Function to destroy a specific step
destroy_specific_step() {
    show_header
    echo -e "${CYAN}Destroy a Specific Deployment Step${NC}"
    echo ""
    echo -e "${RED}Available Steps to Destroy (in reverse order):${NC}"
    echo -e "  ${BLUE}1)${NC}  Destroy remaining resources"
    echo -e "  ${BLUE}2)${NC}  Destroy AWS Load Balancer Controller"
    echo -e "  ${BLUE}3)${NC}  Destroy service accounts and trust policies"
    echo -e "  ${BLUE}4)${NC}  Destroy repositories"
    echo -e "  ${BLUE}5)${NC}  Destroy CoreDNS and kube-proxy addons"
    echo -e "  ${BLUE}6)${NC}  Destroy node group"
    echo -e "  ${BLUE}7)${NC}  Destroy VPC CNI addon"
    echo -e "  ${BLUE}8)${NC}  Destroy auth config map"
    echo -e "  ${BLUE}9)${NC}  Destroy OIDC provider and cluster autoscaler role"
    echo -e "  ${BLUE}10)${NC} Destroy EKS cluster"
    echo -e "  ${BLUE}11)${NC} Destroy security groups and KMS key"
    echo -e "  ${BLUE}12)${NC} Destroy IAM roles and policies"
    echo -e "  ${BLUE}13)${NC} Destroy networking components"
    echo -e "  ${BLUE}14)${NC} Destroy VPC and subnets"
    echo -e "  ${BLUE}15)${NC} Destroy Terraform state"
    echo -e "  ${BLUE}0)${NC}  Return to main menu"
    echo ""
    
    read -p "Enter the step number (1-15, or 0 to return): " STEP
    
    if [ "$STEP" == "0" ]; then
        return
    fi
    
    if ! [[ "$STEP" =~ ^[0-9]+$ ]] || [ "$STEP" -lt 1 ] || [ "$STEP" -gt 15 ]; then
        echo -e "${RED}Invalid option. Please select a number between 1 and 15.${NC}"
        press_enter
        destroy_specific_step
        return
    fi
    
    read -p "Choose execution mode (local or remote): " MODE
    
    if [ "$MODE" != "local" ] && [ "$MODE" != "remote" ]; then
        echo -e "${RED}Invalid execution mode. Use 'local' or 'remote'.${NC}"
        press_enter
        destroy_specific_step
        return
    fi
    
    echo -e "${YELLOW}Executing step $STEP using $MODE mode...${NC}"
    ./destroy-step.sh $STEP $MODE
    press_enter
}

# Main function to handle menu selections
main() {
    # Set PAGER to cat to prevent interactive pagers
    export PAGER="cat"
    
    while true; do
        show_main_menu
        read -r choice
        
        case $choice in
            1) # Validate Current Deployment
                show_header
                echo -e "${CYAN}Validating Current Deployment${NC}"
                echo ""
                ./validate-deploy.sh
                press_enter
                ;;
            2) # Apply Specific Step
                apply_specific_step
                ;;
            3) # Deploy - Local Mode
                show_header
                echo -e "${CYAN}Deploying EKS Cluster (Local Mode)${NC}"
                echo ""
                if confirm_action "This will deploy a new EKS cluster using local Terraform execution."; then
                    ./deploy.sh local
                fi
                press_enter
                ;;
            4) # Deploy - Remote Mode
                show_header
                echo -e "${CYAN}Deploying EKS Cluster (Remote Mode)${NC}"
                echo ""
                if confirm_action "This will deploy a new EKS cluster using remote EC2 Terraform execution."; then
                    ./deploy.sh remote
                fi
                press_enter
                ;;
            5) # Destroy - Local Mode
                show_header
                echo -e "${CYAN}Destroying EKS Cluster (Local Mode)${NC}"
                echo ""
                if confirm_action "WARNING: This will DESTROY the EKS cluster using local Terraform execution."; then
                    MENU_INITIATED=true "$TF_DIR/destroy.sh" local
                fi
                press_enter
                ;;
            6) # Destroy - Remote Mode
                show_header
                echo -e "${CYAN}Destroying EKS Cluster (Remote Mode)${NC}"
                echo ""
                if confirm_action "WARNING: This will DESTROY the EKS cluster using remote EC2 Terraform execution."; then
                    MENU_INITIATED=true "$TF_DIR/destroy.sh" remote
                fi
                press_enter
                ;;
            7) # Run Docker Compose (local development)
                show_header
                echo -e "${CYAN}Running Docker Compose (local development)${NC}"
                echo ""
                "$SCRIPT_DIR/run-docker-compose.sh"
                press_enter
                ;;
            8) # Stop Docker Containers
                show_header
                echo -e "${CYAN}Stopping Docker Containers${NC}"
                echo ""
                "$SCRIPT_DIR/stop-docker-containers.sh"
                press_enter
                ;;
            9) # Build and Push All Images to ECR
                show_header
                echo -e "${CYAN}Building and Pushing All Images to ECR${NC}"
                echo ""
                "$SCRIPT_DIR/build-push-images.sh" all
                press_enter
                ;;
            10) # Build and Push Frontend Image to ECR
                show_header
                echo -e "${CYAN}Building and Pushing Frontend Image to ECR${NC}"
                echo ""
                "$SCRIPT_DIR/build-push-images.sh" frontend
                press_enter
                ;;
            11) # Build and Push Backend Image to ECR
                show_header
                echo -e "${CYAN}Building and Pushing Backend Image to ECR${NC}"
                echo ""
                "$SCRIPT_DIR/build-push-images.sh" backend
                press_enter
                ;;
            12) # View Kubernetes Deployment Status
                show_header
                echo -e "${CYAN}Viewing Kubernetes Deployment Status${NC}"
                echo ""
                "$SCRIPT_DIR/view-kubernetes-deployment.sh"
                press_enter
                ;;
            13) # View Documentation (README)
                show_readme
                ;;
            14) # Check AWS Status
                check_aws_status
                ;;
            0) # Exit
                show_header
                echo -e "${GREEN}Exiting. Goodbye!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option. Please select a number between 0 and 14.${NC}"
                press_enter
                ;;
        esac
    done
}

# Run the main function
main
