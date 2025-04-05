#!/bin/bash

# Script: build-push-images.sh
# Purpose: Handles building and pushing Docker images to ECR

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check if a target is provided
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing target parameter.${NC}"
    echo "Usage: $0 <target>"
    echo "  target: all, frontend, or backend"
    exit 1
fi

TARGET=$1

# Function to build and push all images
build_push_all() {
    echo -e "${YELLOW}Building and pushing all images to ECR...${NC}"
    cd "$ROOT_DIR/k8s"
    
    if [ -f "build-and-push-all-to-ecr.sh" ]; then
        chmod +x build-and-push-all-to-ecr.sh
        ./build-and-push-all-to-ecr.sh
    else
        echo -e "${RED}Error: k8s/build-and-push-all-to-ecr.sh script not found!${NC}"
        exit 1
    fi
}

# Function to build and push frontend image
build_push_frontend() {
    echo -e "${YELLOW}Building and pushing frontend image to ECR...${NC}"
    cd "$ROOT_DIR/frontend"
    
    if [ -f "build-and-push-to-ecr.sh" ]; then
        chmod +x build-and-push-to-ecr.sh
        ./build-and-push-to-ecr.sh
    else
        echo -e "${RED}Error: frontend/build-and-push-to-ecr.sh script not found!${NC}"
        exit 1
    fi
}

# Function to build and push backend image
build_push_backend() {
    echo -e "${YELLOW}Building and pushing backend image to ECR...${NC}"
    cd "$ROOT_DIR/backend"
    
    if [ -f "build-and-push-to-ecr.sh" ]; then
        chmod +x build-and-push-to-ecr.sh
        ./build-and-push-to-ecr.sh
    else
        echo -e "${RED}Error: backend/build-and-push-to-ecr.sh script not found!${NC}"
        exit 1
    fi
}

# Execute based on target
case $TARGET in
    all)
        build_push_all
        ;;
    frontend)
        build_push_frontend
        ;;
    backend)
        build_push_backend
        ;;
    *)
        echo -e "${RED}Error: Invalid target. Use 'all', 'frontend', or 'backend'.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Operation completed successfully!${NC}"
exit 0 