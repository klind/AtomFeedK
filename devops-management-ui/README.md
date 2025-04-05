# DevOps Management UI

This directory contains user interface scripts for managing Terraform infrastructure, Docker containers, and Kubernetes deployments.

## Overview

The UI scripts provide a terminal-based menu system that makes it easier to interact with all aspects of the application deployment pipeline:

1. **Terraform Operations** - Deploy and manage the EKS cluster
2. **Docker Operations** - Run local development environment and build/push images to ECR
3. **Kubernetes Operations** - View information about Kubernetes deployments
4. **General Operations** - View documentation and check system status

## Scripts

### Main Menu

- **`menu.sh`** - The main menu interface that provides access to all functionality

### Terraform Scripts

- **`apply-step.sh`** - Helper script for applying specific steps of the Terraform deployment process

### Docker Scripts

- **`run-docker-compose.sh`** - Runs the application locally using docker-compose
- **`stop-docker-containers.sh`** - Stops running Docker containers
- **`build-push-images.sh`** - Builds and pushes Docker images to ECR

### Kubernetes Scripts

- **`view-kubernetes-deployment.sh`** - Views information about the EKS cluster using AWS CLI

## Getting Started

1. Ensure you have proper AWS credentials configured
2. Use the launcher script from the project root:
   ```bash
   ./devops-management-launcher.sh
   ```

Alternatively, you can:
1. Navigate to the `devops-management-ui` directory
2. Make the scripts executable:
   ```bash
   chmod +x *.sh
   ```
3. Launch the menu interface:
   ```bash
   ./menu.sh
   ```

## Usage

The menu interface will guide you through the available options:

1. Use number keys to select options
2. Follow on-screen prompts for additional inputs when required
3. Review output messages for operation status and next steps

## Architecture

### Load Balancers & Networking

The application uses Kubernetes Services of type LoadBalancer for both the frontend and backend:

- **Frontend LoadBalancer**: A public-facing AWS load balancer that provides external access to the UI
- **Backend LoadBalancer**: An internal AWS load balancer (only accessible within the VPC) that allows the frontend to communicate with the backend API

This approach allows the frontend to always connect to the backend using a consistent Kubernetes service DNS name (`http://hcm-developer-util-backend`), regardless of infrastructure changes.

## Features

### Terraform Operations

- Validate current deployment
- Apply specific deployment steps
- Deploy EKS cluster (local or remote mode)
- Destroy EKS cluster (local or remote mode)

### Docker Operations

- Run the application locally with docker-compose
- Stop Docker containers
- Build and push all Docker images to ECR
- Build and push individual Docker images (frontend or backend)

### Kubernetes Operations

- View information about EKS cluster and Kubernetes resources

### Other Operations

- View documentation
- Check AWS session status

## Benefits

- **Unified Interface** - Single entry point for all operations
- **Simplified Workflow** - Easy-to-use interface for complex operations
- **Reduced Errors** - Guided menu prevents command mistakes
- **Full Pipeline Coverage** - Handles infrastructure, containers, and deployments
- **Status Feedback** - Clear visual feedback on operation status

## Notes

- These UI scripts do not modify the underlying code or configuration
- All operations ultimately invoke the same scripts as would be used manually
- The scripts assume specific directory structures and naming conventions 