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
- `13_outputs.tf` - Output values

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
13. Apply remaining resources

This order ensures that resources with dependencies are created in the proper sequence, particularly:
- VPC CNI is deployed before the node group
- Node group is deployed before CoreDNS and kube-proxy addons

## Deployment Scripts

Several scripts are provided to simplify deployment and cleanup:

### Master Scripts (Recommended)

These are wrapper scripts that allow you to choose between local and remote execution:

#### `deploy.sh`

Master deployment script that defaults to local execution but can be configured to use remote execution:

```bash
# Default: Local execution
./deploy.sh 

# Specify execution mode
./deploy.sh local    # Use local execution
./deploy.sh remote   # Use remote execution
```

#### `destroy.sh`

Master cleanup script that defaults to local execution but can be configured to use remote execution:

```bash
# Default: Local execution
./destroy.sh 

# Specify execution mode
./destroy.sh local    # Use local execution
./destroy.sh remote   # Use remote execution
```

### Remote Execution Scripts

These scripts use the `terraform-remote-executor.sh` from the parent directory to run commands on a remote EC2 instance:

#### `deploy-remote-executor.sh`

Deploys the entire EKS infrastructure using remote execution.

```bash
./deploy-remote-executor.sh
```

#### `destroy-remote-executor.sh`

Destroys the entire EKS infrastructure using remote execution.

```bash
./destroy-remote-executor.sh
```

### Local Execution Scripts

These scripts run Terraform commands directly on your local machine:

#### `deploy-local.sh`

Deploys the entire EKS infrastructure locally.

```bash
./deploy-local.sh
```

#### `destroy-local.sh`

Destroys the entire EKS infrastructure locally.

```bash
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
13. Apply remaining resources

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

## Customization

You can customize the deployment by modifying the variables in `02_variables.tf` or by passing variable overrides to the deployment scripts. 