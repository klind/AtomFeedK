#!/bin/bash

# Launcher script for the DevOps Management UI
# Purpose: Provides a convenient way to launch the comprehensive management interface
#          for Terraform, Docker, and Kubernetes operations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR/devops-management-ui"

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}       Comprehensive DevOps Management Interface Launcher          ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""
echo -e "${YELLOW}This launcher provides access to:${NC}"
echo -e " • ${GREEN}Terraform operations${NC} - Deploy and manage EKS infrastructure"
echo -e " • ${GREEN}Docker operations${NC} - Run locally and build/push images to ECR"
echo -e " • ${GREEN}Kubernetes operations${NC} - Deploy and manage application on K8s"
echo ""

if [ ! -f "$UI_DIR/menu.sh" ]; then
    echo -e "${RED}Error: UI scripts not found in $UI_DIR${NC}"
    echo -e "Please ensure the devops-management-ui directory exists and contains the menu.sh script."
    exit 1
fi

if [ ! -x "$UI_DIR/menu.sh" ]; then
    echo -e "${YELLOW}Making UI scripts executable...${NC}"
    chmod +x "$UI_DIR/menu.sh" \
             "$UI_DIR/apply-step.sh" \
             "$UI_DIR/run-docker-compose.sh" \
             "$UI_DIR/build-push-images.sh" \
             "$UI_DIR/view-kubernetes-deployment.sh" \
             "$UI_DIR/stop-docker-containers.sh"
    echo -e "${GREEN}All scripts are now executable.${NC}"
fi

echo -e "${YELLOW}Launching management interface...${NC}"
echo ""
"$UI_DIR/menu.sh" 