#!/bin/bash

#########################################################################
# HCM Developer Util - Build and Push All Images to ECR
#
# Purpose:
#   Master script to build and push both frontend and backend Docker images
#   to Amazon ECR (Elastic Container Registry).
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Docker installed and running
#   - Proper AWS permissions to push to ECR
#   - Frontend and Backend Dockerfiles exist
#   - Node.js installed
#
# Environment:
#   - AWS Region: eu-north-1
#   - ECR Repositories:
#     - hcm-developer-util-frontend
#     - hcm-developer-util-backend
#   - AWS Account: 084828595145
#
# What this script does:
#   1. Builds and pushes backend image
#   2. Builds and pushes frontend image
#   3. Shows final status of both pushes
#########################################################################

# Exit on any error
set -e

echo "🚀 Starting build and push process for all images..."

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ Error: $1 is not installed. Please install it first."
        exit 1
    fi
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
check_command docker
check_command aws
check_command node

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Enable Docker BuildKit for better multi-platform support
echo "🔧 Enabling Docker BuildKit for multi-architecture support..."
export DOCKER_BUILDKIT=1

# Build and push backend
echo -e "\n📦 Building and pushing backend image..."
cd backend
if [ -f "build-and-push-to-ecr.sh" ]; then
    ./build-and-push-to-ecr.sh
else
    echo "❌ Error: backend/build-and-push-to-ecr.sh not found!"
    exit 1
fi

# Build and push frontend
echo -e "\n🌐 Building and pushing frontend image..."
cd ../frontend
if [ -f "build-and-push-to-ecr.sh" ]; then
    ./build-and-push-to-ecr.sh
else
    echo "❌ Error: frontend/build-and-push-to-ecr.sh not found!"
    exit 1
fi

# Return to root directory
cd ..

# Show ECR repository status
echo -e "\n📊 ECR Repository Status:"
echo "Checking repositories in eu-north-1..."

AWS_ACCOUNT="084828595145"
AWS_REGION="eu-north-1"

echo -e "\nBackend Repository:"
aws ecr describe-images \
    --repository-name hcm-developer-util-backend \
    --query 'imageDetails[*].[imageTags[0],imagePushedAt,imageManifestMediaType]' \
    --output table | cat

echo -e "\nFrontend Repository:"
aws ecr describe-images \
    --repository-name hcm-developer-util-frontend \
    --query 'imageDetails[*].[imageTags[0],imagePushedAt,imageManifestMediaType]' \
    --output table | cat

echo -e "\n✅ All images have been built and pushed successfully!"
echo "Frontend: ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/hcm-developer-util-frontend:latest"
echo "Backend: ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/hcm-developer-util-backend:latest"
echo "Platform: linux/amd64 (compatible with EKS)" 