#!/bin/bash

#########################################################################
# HCM Developer Util Kubernetes Deployment Script
# 
# Purpose:
#   This script automates the deployment of both frontend and backend
#   services of the HCM Developer Util application to a Kubernetes cluster.
#
# Prerequisites:
#   - kubectl installed and configured
#   - Access to Kubernetes cluster (EKS)
#   - Docker images pushed to ECR:
#     - hcm-developer-util-frontend:latest
#     - hcm-developer-util-backend:latest
#
# What this script does:
#   1. Verifies kubectl installation and cluster connectivity
#   2. Deploys backend service (API, running on port 5000)
#   3. Deploys frontend service (Web UI, running on port 80)
#   4. Waits for both deployments to be ready
#   5. Displays status of pods and services
#
# Usage:
#   ./deploy.sh
#
# Author: Development Team
# Last Updated: 2024-04-03
#########################################################################

# Exit on any error
set -e

echo "🚀 Deploying HCM Developer Util to Kubernetes..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if we can connect to the cluster
echo "🔍 Checking cluster connection..."
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Deploy backend
echo "📦 Deploying backend..."
kubectl apply -f backend-deployment.yaml
echo "✅ Backend deployment applied"

# Deploy frontend
echo "🌐 Deploying frontend..."
kubectl apply -f frontend-deployment.yaml
echo "✅ Frontend deployment applied"

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."

echo "Checking backend deployment..."
kubectl rollout status deployment/hcm-developer-util-backend

echo "Checking frontend deployment..."
kubectl rollout status deployment/hcm-developer-util-frontend

# Show deployment status
echo -e "\n📊 Deployment Status:"
echo "Backend Pods:"
kubectl get pods -l app=hcm-developer-util-backend
echo -e "\nFrontend Pods:"
kubectl get pods -l app=hcm-developer-util-frontend
echo -e "\nServices:"
kubectl get services | grep hcm-developer-util

echo -e "\n✨ Deployment complete!" 