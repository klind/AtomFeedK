#!/bin/bash

# Script to deploy the backend to Elastic Beanstalk with proper environment settings

# Ensure we're in the backend directory
cd "$(dirname "$0")"


# Display deployment information
echo "Deploying to Elastic Beanstalk environment: HCMEventDeveloperUtil"
echo "API URL will be set to: http://hcmeventdeveloperutil.eba-rwxupczj.eu-north-1.elasticbeanstalk.com"

# Deploy to Elastic Beanstalk
echo "Running eb deploy..."
eb deploy

# Deployment complete
echo "Deployment complete!"
echo "Swagger UI should now be available at: http://hcmeventdeveloperutil.eba-rwxupczj.eu-north-1.elasticbeanstalk.com/api-docs" 