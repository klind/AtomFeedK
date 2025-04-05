# Backend Service

This is the backend service for the Atomfeed application, deployed on AWS Elastic Beanstalk.

## Setup

1. Install dependencies:
```bash
npm ci
```

2. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Required environment variables can be found in the example `.env` file

## Development

To run the application locally:
```bash
npm start
```

## Deployment

### Manual Deployment
The backend can be deployed using the AWS Elastic Beanstalk CLI:

1. Make sure you have AWS CLI and EB CLI installed:
```bash
pip install awsebcli
```

2. Configure your AWS credentials

3. Deploy using EB CLI:
```bash
eb deploy
```

### Automated Deployment
The backend is automatically deployed to Elastic Beanstalk through GitHub Actions when:
- Changes are pushed to the `dev` branch
- The changes include files in the `backend/` directory

The deployment workflow:
1. Sets up Node.js environment
2. Installs dependencies
3. Configures AWS credentials
4. Deploys to Elastic Beanstalk

## Configuration

### AWS Configuration
- Region: eu-north-1 (Stockholm)
- Platform: Node.js 22 running on 64bit Amazon Linux 2023
- Environment: HCMEventDeveloperUtil

### Elastic Beanstalk
The application uses Elastic Beanstalk for deployment with the following configuration:
- Application Name: AtomfeedBackend
- Default EC2 Key: aws-eb

## Docker
The application includes a Dockerfile for containerization. The container:
- Uses Node.js base image
- Installs production dependencies only
- Runs in production mode

## Directory Structure
```
backend/
├── src/           # Source code
├── logs/          # Application logs
├── .elasticbeanstalk/ # EB configuration
├── .ebextensions/     # EB extension configuration
├── Dockerfile        # Docker configuration
├── package.json     # Dependencies and scripts
└── .env            # Environment variables (not in version control)
``` 