#!/bin/bash

#########################################################################
# Backend Docker Image Build and Push Script
#
# Purpose:
#   Automates the process of building the backend Docker image and pushing
#   it to Amazon ECR (Elastic Container Registry).
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Docker installed and running
#   - Proper AWS permissions to push to ECR
#   - Backend Dockerfile exists
#
# Environment:
#   - AWS Region: eu-north-1
#   - ECR Repository: hcm-developer-util-backend
#   - AWS Account: 084828595145
#
# What this script does:
#   1. Logs into ECR
#   2. Builds the backend Docker image
#   3. Tags the image for ECR
#   4. Pushes the image to ECR
#########################################################################

# Exit on any error
set -e

# Configuration
AWS_REGION="eu-north-1"
AWS_ACCOUNT="084828595145"
ECR_REPO="hcm-developer-util-backend"
IMAGE_TAG="latest"
FULL_ECR_PATH="${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "🚀 Starting backend image build and push process..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Login to ECR
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Enable Docker BuildKit for better multi-platform support
export DOCKER_BUILDKIT=1

# Build the image with platform flag
echo "🏗️  Building Docker image for linux/amd64 platform..."
docker build --platform=linux/amd64 -t ${ECR_REPO}:${IMAGE_TAG} .

# Tag the image for ECR
echo "🏷️  Tagging image for ECR..."
docker tag ${ECR_REPO}:${IMAGE_TAG} ${FULL_ECR_PATH}:${IMAGE_TAG}

# Push to ECR
echo "⬆️  Pushing image to ECR..."
docker push ${FULL_ECR_PATH}:${IMAGE_TAG}

echo "✅ Successfully built and pushed backend image to ECR!"
echo "Repository: ${FULL_ECR_PATH}"
echo "Tag: ${IMAGE_TAG}"
echo "Architecture: linux/amd64" 