#!/bin/bash

# Script: terraform-remote-executor.sh
# Purpose: Executes Terraform commands on a remote EC2 instance via AWS Systems Manager (SSM)
# The script packages local Terraform files, uploads them to S3, and executes them on the EC2 instance
#
# Usage Examples:
# -----------------------------
# 1. Apply Terraform changes with auto-approve:
#    ./terraform-remote-executor.sh terraform-eks-split 'apply -auto-approve'
#
# 2. Plan Terraform changes:
#    ./terraform-remote-executor.sh terraform-eks-split 'plan'
#
# 3. Destroy infrastructure:
#    ./terraform-remote-executor.sh terraform-eks-split 'destroy -auto-approve'
#
# 4. Initialize with backend reconfiguration:
#    ./terraform-remote-executor.sh terraform-eks-split 'init -reconfigure'
#
# 5. Apply with variables:
#    ./terraform-remote-executor.sh terraform-eks-split 'apply -var="environment=prod" -auto-approve'
#
# Note: Always ensure the terraform-runner EC2 instance is running before executing commands
# -----------------------------

# Validate command-line arguments
# Requires two arguments: the Terraform directory and the command to execute
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <terraform-directory> <terraform-command>"
    echo "Example: $0 terraform-eks-split 'apply -auto-approve'"
    exit 1
fi

# Store command line arguments in variables
# TF_DIR: The directory containing Terraform configuration files
# TF_CMD: The Terraform command to execute (e.g., 'plan', 'apply', 'destroy')
TF_DIR=$1
TF_CMD=$2

# Navigate to terraform-runner directory to get EC2 instance ID
# Uses terraform output command to fetch the ID from Terraform state
# The cd - > /dev/null suppresses the directory change message
# Get EC2 instance ID from terraform output
# Note: The instance ID is created when running terraform-runner.tf
# This only needs to be done once to set up the infrastructure

# Hardcode the instance ID since we're no longer navigating to terraform-runner
INSTANCE_ID=i-0b9b4ceb79a265a52

# Define S3 bucket for file transfer
# This bucket is used as an intermediate storage for Terraform files
S3_BUCKET="terraform-runner-files"

# Display execution information to user
echo "🚀 Executing Terraform command remotely..."
echo "Directory: $TF_DIR"
echo "Command: terraform $TF_CMD"

# Package Terraform configuration files
# Creates a zip archive of all files in the specified Terraform directory
echo "📦 Packaging Terraform files..."

# Check if we're using the current directory or a specified one
if [ "$TF_DIR" = "." ]; then
    # We're already in the right directory
    zip -r ../terraform-files.zip *
    cd ..
else
    # Navigate to the specified directory
    CURRENT_DIR=$(pwd)
    cd "$TF_DIR" && zip -r "$CURRENT_DIR/terraform-files.zip" * && cd "$CURRENT_DIR"
fi

# Upload the zip file to S3 bucket
# This makes the Terraform files accessible to the EC2 instance
echo "⬆️ Uploading to S3..."
aws s3 cp terraform-files.zip "s3://${S3_BUCKET}/terraform-files.zip"
rm terraform-files.zip

# Remote Command Execution Details:
# -----------------------------
# The following commands will be executed on the EC2 instance in sequence:
#
# 1. sudo mkdir -p /var/log/terraform
#    Creates a persistent logging directory for Terraform operations
#
# 2. sudo touch /var/log/terraform/terraform.log
#    Creates an empty log file for storing Terraform output
#
# 3. sudo chown -R ec2-user:ec2-user /var/log/terraform
#    Changes ownership of the log directory to ec2-user for write access
#
# 4. sudo chmod -R 755 /var/log/terraform
#    Sets permissions to allow reading and execution for all users, 
#    but writing only for the owner
#
# 5. cd /home/ec2-user
#    Changes to the EC2 user's home directory for operations
#
# 6. aws s3 cp s3://${S3_BUCKET}/terraform-files.zip .
#    Downloads the Terraform configuration files from S3
#
# 7. unzip -o terraform-files.zip
#    Extracts the Terraform files, overwriting existing files if present
#
# 8. cd /home/ec2-user && terraform init
#    Initializes Terraform in the working directory, installing required providers
#    and modules. Output is captured in the log file
#
# 9. cd /home/ec2-user && terraform ${TF_CMD}
#    Executes the specified Terraform command (plan, apply, destroy, etc.)
#    Output is appended to the log file
#
# Note: To monitor execution in real-time, you can SSH into the EC2:
#    aws ssm start-session --target $INSTANCE_ID
#    Inside the EC2 instance, run the following command to view the log file:
#    sudo su - ec2-user
#    tail -f /var/log/terraform/terraform.log
#
# Note: All command output is captured using 'tee' to both display in real-time
# and save to the log file for future reference
# -----------------------------

# Execute Terraform commands on the EC2 instance via AWS Systems Manager
echo "🔄 Running Terraform commands on EC2..."
COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "{
        \"commands\": [
            \"sudo mkdir -p /var/log/terraform\",
            \"sudo touch /var/log/terraform/terraform.log\",
            \"sudo chown -R ec2-user:ec2-user /var/log/terraform\",
            \"sudo chmod -R 755 /var/log/terraform\",
            \"cd /home/ec2-user\",
            \"aws s3 cp s3://${S3_BUCKET}/terraform-files.zip .\",
            \"unzip -o terraform-files.zip\",
            \"cd /home/ec2-user && terraform init 2>&1 | tee /var/log/terraform/terraform.log\",
            \"cd /home/ec2-user && terraform ${TF_CMD} 2>&1 | tee -a /var/log/terraform/terraform.log\"
        ]
    }" \
    --output text \
    --query "Command.CommandId")

# Confirm command submission and prepare for output streaming
echo "✅ Command sent successfully! Command ID: $COMMAND_ID"
echo ""
echo "Streaming command output..."
echo "-------------------------"

# Monitor command execution status and stream output
# Continuously polls SSM for command status and output until completion
while true; do
    # Get the current status of the command execution
    STATUS=$(aws ssm get-command-invocation \
        --instance-id "$INSTANCE_ID" \
        --command-id "$COMMAND_ID" \
        --query "Status" \
        --output text)
    
    # Display current status to user
    echo "Command status: $STATUS"
    
    # Handle failure states
    # Exit with error if command fails or is cancelled
    if [[ "$STATUS" == "Failed" || "$STATUS" == "Cancelled" ]]; then
        echo "❌ Command failed with status: $STATUS"
        exit 1
    fi

    # Display command output
    # Fetches and shows both standard output and error streams
    aws ssm get-command-invocation \
        --instance-id "$INSTANCE_ID" \
        --command-id "$COMMAND_ID" \
        --output text \
        --query "StandardOutputContent || StandardErrorContent" \
        --no-cli-pager

    # Break the monitoring loop if command completes successfully
    if [[ "$STATUS" == "Success" ]]; then
        break
    fi
    
    # Wait 5 seconds before next status check
    sleep 5
done

# Clean up temporary files
# Remove the zip file from S3 after successful execution
echo "🧹 Cleaning up..."
aws s3 rm "s3://${S3_BUCKET}/terraform-files.zip"

# Final success message
echo "✅ Command completed successfully!" 