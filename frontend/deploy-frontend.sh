#!/bin/bash

# Exit on error
set -e

# Configuration
S3_BUCKET="hcm-event-developer-util-frontend"
REGION="eu-north-1"
CONFIG_FOLDER="config"
CLOUDFRONT_INFO_FILE="cloudfront-info.txt"

# Print banner
echo "========================================="
echo "🚀 Deploying Frontend to S3 with CloudFront"
echo "========================================="

# Check for required tools
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq first."
    echo "On macOS: brew install jq"
    echo "On Ubuntu/Debian: sudo apt-get install jq"
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is required but not installed. Please install AWS CLI first."
    echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if S3 bucket exists
echo "Checking if S3 bucket exists..."
if ! aws s3api head-bucket --bucket $S3_BUCKET --region $REGION 2>/dev/null; then
    echo "Error: S3 bucket '$S3_BUCKET' does not exist. Please create it first with:"
    echo "aws s3api create-bucket --bucket $S3_BUCKET --region $REGION --create-bucket-configuration LocationConstraint=$REGION"
    exit 1
fi

# Check if CloudFront info file exists
if [ ! -f "$CLOUDFRONT_INFO_FILE" ]; then
    echo "Warning: CloudFront info file '$CLOUDFRONT_INFO_FILE' not found."
    echo "Please run setup-cloudfront.sh first or provide the CloudFront distribution ID manually."
    read -p "Enter CloudFront distribution ID (leave empty to skip CloudFront operations): " CLOUDFRONT_DISTRIBUTION_ID
    if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
        echo "CLOUDFRONT_DISTRIBUTION_ID=$CLOUDFRONT_DISTRIBUTION_ID" > $CLOUDFRONT_INFO_FILE
        echo "CloudFront distribution ID saved to $CLOUDFRONT_INFO_FILE"
    fi
else
    # Extract CloudFront distribution ID from info file
    CLOUDFRONT_DISTRIBUTION_ID=$(grep CLOUDFRONT_DISTRIBUTION_ID $CLOUDFRONT_INFO_FILE | cut -d= -f2)
    CLOUDFRONT_DOMAIN=$(grep CLOUDFRONT_DOMAIN $CLOUDFRONT_INFO_FILE | cut -d= -f2)
    echo "Found CloudFront distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
    echo "CloudFront domain: $CLOUDFRONT_DOMAIN"
fi

# Build the React app
echo "Building React app..."
npm install
npm run build:dev

# Deploy to S3 (excluding config folder)
echo "Deploying to S3..."
aws s3 cp build/ s3://$S3_BUCKET/ --recursive --exclude "$CONFIG_FOLDER/*" --region $REGION

# Check if config folder exists, create if it doesn't
echo "Checking config folder..."
if ! aws s3 ls s3://$S3_BUCKET/$CONFIG_FOLDER/ --region $REGION &>/dev/null; then
    echo "Creating config folder in S3..."
    aws s3api put-object --bucket $S3_BUCKET --key "$CONFIG_FOLDER/" --region $REGION
    
    echo "Config folder created."
    echo "Remember to upload your config.json file to the config folder:"
    echo "aws s3 cp config.json s3://$S3_BUCKET/$CONFIG_FOLDER/config.json --region $REGION"
else
    echo "Config folder already exists."
fi

# Invalidate CloudFront cache if distribution ID is available
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "Invalidating CloudFront cache..."
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --region $REGION \
        --query 'Invalidation.Id' \
        --output text)
    
    echo "Invalidation created with ID: $INVALIDATION_ID"
    echo "Waiting for invalidation to complete (this may take a few minutes)..."
    
    # Check invalidation status
    aws cloudfront wait invalidation-completed \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --id $INVALIDATION_ID \
        --region $REGION
    
    echo "CloudFront invalidation completed!"
else
    echo "Skipping CloudFront invalidation (no distribution ID provided)."
fi

# Check CloudFront distribution status if ID is available
if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "Checking CloudFront distribution status..."
    DIST_STATUS=$(aws cloudfront get-distribution \
        --id $CLOUDFRONT_DISTRIBUTION_ID \
        --region $REGION \
        --query 'Distribution.Status' \
        --output text)
    
    echo "CloudFront distribution status: $DIST_STATUS"
    
    if [ "$DIST_STATUS" != "Deployed" ]; then
        echo "Note: Your distribution is not fully deployed yet. This is normal for recent changes."
        echo "It may take up to 15 minutes for the distribution to be fully deployed."
    fi
fi

echo "========================================="
echo "✅ Frontend deployment completed!"
echo "========================================="

if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo "Your application is available at: https://$CLOUDFRONT_DOMAIN"
    echo "Note: It may take a few minutes for changes to propagate through CloudFront."
fi

echo "Config folder is in S3 but not accessible through CloudFront."
echo "=========================================" 