# EKS Terraform Configuration

This directory contains Terraform configuration files for deploying an Amazon EKS cluster along with all required infrastructure components.

## Directory Structure

The configuration is split into multiple files for better organization:

- `00_backend.tf` - S3 backend configuration for Terraform state
- `01_provider.tf` - AWS, Kubernetes, and TLS provider configurations
- `02_variables.tf` - Input variables for the configuration
- `03_vpc.tf` - VPC and subnet configurations
- `04_networking.tf` - Network components (IGW, NAT Gateway, route tables)
- `05_security.tf` - Security groups and KMS key
- `06_iam_roles.tf` - IAM roles for EKS components
- `07_iam_policies.tf` - IAM policy attachments
- `08_eks_cluster.tf` - EKS cluster configuration
- `09_eks_vpc_cni.tf` - VPC CNI addon
- `10_eks_nodes.tf` - EKS node group configuration
- `11_eks_addons.tf` - CoreDNS and kube-proxy addons
- `12_repositories.tf` - ECR repositories and ECS cluster
- `13_service_accounts.tf` - Kubernetes service account and IAM role association
- `14_outputs.tf` - Output values

## Deployment Sequence

Resources are deployed in a specific order to respect dependencies:

1. Initialize Terraform
2. Create VPC and subnets
3. Create networking components (IGW, NAT, route tables)
4. Create IAM roles and policies
5. Create security groups and KMS key
6. Create EKS cluster
7. Create OIDC provider and cluster autoscaler role
8. Create auth config map
9. Create VPC CNI addon
10. Create node group
11. Create CoreDNS and kube-proxy addons
12. Create repositories
13. Create service accounts and trust policies
14. Apply remaining resources

This order ensures that resources with dependencies are created in the proper sequence, particularly:
- VPC CNI is deployed before the node group
- Node group is deployed before CoreDNS and kube-proxy addons
- Service accounts are created after all required infrastructure is in place

## Deployment Scripts

Several scripts are provided to simplify deployment and cleanup:

### Master Scripts (Recommended)

These are wrapper scripts that allow you to choose between local and remote execution:

#### `deploy.sh`

Master deployment script that requires an explicit execution mode:

```bash
# You must specify an execution mode:
./deploy.sh local    # Use local execution
./deploy.sh remote   # Use remote execution
```

#### `destroy.sh`

Master cleanup script that requires an explicit execution mode:

```bash
# You must specify an execution mode:
./destroy.sh local    # Use local execution
./destroy.sh remote   # Use remote execution
```

### Remote Execution Scripts

These scripts use the included `terraform-remote-executor.sh` to run commands on a remote EC2 instance:

#### `terraform-remote-executor.sh`

Core script for executing Terraform commands on a remote EC2 instance. This script:
- Packages the Terraform files
- Uploads them to S3
- Executes commands via AWS Systems Manager
- Streams the output back to your terminal

```bash
# Direct usage
./terraform-remote-executor.sh . "command"

# Example: Run plan
./terraform-remote-executor.sh . "plan"
```

#### `deploy-remote-executor.sh`

Deploys the entire EKS infrastructure using remote execution.

```bash
# Usually called through deploy.sh
./deploy-remote-executor.sh
```

#### `destroy-remote-executor.sh`

Destroys the entire EKS infrastructure using remote execution and validates that all resources have been properly removed.

```bash
# Usually called through destroy.sh
./destroy-remote-executor.sh
```

### Local Execution Scripts

These scripts run Terraform commands directly on your local machine:

#### `deploy-local.sh`

Deploys the entire EKS infrastructure locally.

```bash
# Usually called through deploy.sh
./deploy-local.sh
```

#### `destroy-local.sh`

Destroys the entire EKS infrastructure locally.

```bash
# Usually called through destroy.sh
./destroy-local.sh
```

#### `apply-step.sh`

Allows you to apply a specific step of the deployment process. Useful for resuming a failed deployment or for testing specific components.

```bash
./apply-step.sh <step_number> [remote]
```

Where `<step_number>` is the step to apply (1-13) and the optional `remote` argument makes it use the remote executor instead of running locally.

**Available Steps:**
1. Initialize Terraform
2. Create VPC and subnets
3. Create networking components (IGW, NAT, route tables)
4. Create IAM roles and policies
5. Create security groups and KMS key
6. Create EKS cluster
7. Create OIDC provider and cluster autoscaler role
8. Create auth config map
9. Create VPC CNI addon
10. Create node group
11. Create CoreDNS and kube-proxy addons
12. Create repositories
13. Create service accounts and trust policies
14. Apply remaining resources

For example, to create the VPC and subnets locally:
```bash
./apply-step.sh 2
```

To create the EKS cluster using the remote executor:
```bash
./apply-step.sh 6 remote
```

## Remote vs. Local Execution

- **Remote Execution**: Uses the `terraform-remote-executor.sh` script to run commands on a remote EC2 instance. This ensures consistent environment and permissions.
- **Local Execution**: Runs commands directly on your local machine. Requires Terraform installed locally and proper AWS credentials.

## Prerequisites

- AWS CLI configured with appropriate permissions
- For remote execution: The remote executor EC2 instance must be running
- For local execution: Terraform CLI installed on your machine
- The S3 bucket specified in the backend configuration must exist

## Accessing the Cluster

After deployment, you can access the cluster using:

```bash
aws eks update-kubeconfig --name hcm-developer-util-cluster --region eu-north-1
```

## Accessing Deployed Applications

### Load Balancer Architecture

This project uses Kubernetes Services of type LoadBalancer to expose both frontend and backend applications:

1. **Frontend LoadBalancer**:
   - Public-facing AWS load balancer
   - Created automatically by Kubernetes when applying `k8s/frontend-deployment.yaml`
   - Provides external access to the application UI

2. **Backend LoadBalancer**:
   - Internal AWS load balancer (only accessible within the VPC)
   - Created automatically by Kubernetes when applying `k8s/backend-service.yaml`
   - Provides a stable endpoint for the frontend to communicate with the backend
   - Uses Kubernetes service DNS to provide a consistent URL (`http://hcm-developer-util-backend`)

This approach offers several advantages:
- **Consistent management**: Both load balancers are managed by Kubernetes
- **Stable backend URL**: The frontend always connects to the same URL, regardless of infrastructure changes
- **Security**: Backend is only accessible within the cluster, not exposed publicly
- **Simplified configuration**: No need to update URLs when recreating resources

### Deploying the Applications

To deploy the complete application stack:

```bash
# Apply the backend deployment (which includes the service)
kubectl apply -f k8s/backend-deployment.yaml

# Apply the frontend deployment
kubectl apply -f k8s/frontend-deployment.yaml
```

### Accessing the Application

After deployment, the frontend application will be accessible via the external load balancer:

```bash
# Get the frontend LoadBalancer address
kubectl get svc hcm-developer-util-frontend
```

The EXTERNAL-IP column will show the public endpoint for accessing the application.

## Customization

You can customize the deployment by modifying the variables in `02_variables.tf` or by passing variable overrides to the deployment scripts.

## Validation Scripts

The following scripts help validate infrastructure deployment and cleanup:

#### `validate-deploy.sh`

Validates that all AWS resources related to the EKS cluster have been properly created after deployment. This script:
- Checks for an active EKS cluster
- Verifies VPC and subnet configuration
- Confirms node groups are running
- Validates IAM roles exist
- Ensures EKS addons (vpc-cni, kube-proxy, coredns) are installed
- Confirms ECR repositories are created
- Verifies Terraform state exists in S3

```bash
# Run directly after manual deployment
./validate-deploy.sh
```

The validation script is automatically executed at the end of both deploy-remote-executor.sh and deploy-local.sh scripts.

#### `validate-destroy.sh`

Validates that all AWS resources related to the EKS cluster have been properly destroyed. This script:
- Checks for EKS clusters
- Checks for EC2 resources (instances, security groups)
- Checks for VPC resources
- Checks for IAM roles and policies
- Checks for load balancers
- Checks for CloudWatch logs
- Checks for ECR repositories

```bash
# Run directly after manual destruction
./validate-destroy.sh
```

The validation script is automatically executed at the end of both destroy-remote-executor.sh and destroy-local.sh scripts. 

If the validation is successful (all resources have been properly removed), the Terraform state file in S3 will also be automatically deleted. This ensures a complete cleanup process and allows for fresh deployments in the future without state conflicts. 