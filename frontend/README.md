# Frontend Service

This is the frontend service for the Atomfeed application, built with React and deployed to AWS S3 with CloudFront distribution.

## Tech Stack

- React 18
- TailwindCSS for styling
- AWS Amplify for authentication
- Headless UI and Heroicons for UI components

## Setup

1. Install dependencies:
```bash
npm ci
```

2. Set up environment variables:
   - Create a `.env` file in the frontend directory
   - Required environment variables can be found in the example `.env` file

## Development

To run the application locally:
```bash
npm start
```

This will start the development server on `http://localhost:3000`.

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run build:dev` - Builds the app for development environment

## Deployment

### Manual Deployment
The frontend can be deployed using the provided deployment script:

```bash
./deploy-frontend.sh
```

This script will:
1. Build the React application
2. Upload the build to S3
3. Create/update the config folder in S3
4. Invalidate the CloudFront cache

### Automated Deployment
The frontend is automatically deployed through GitHub Actions when:
- Changes are pushed to the `dev` branch
- The changes include files in the `frontend/` directory

The deployment workflow:
1. Sets up Node.js environment
2. Configures AWS credentials
3. Runs the deployment script

## AWS Infrastructure

### S3
- Bucket: hcm-event-developer-util-frontend
- Region: eu-north-1 (Stockholm)
- Configuration:
  - Static website hosting enabled
  - Config folder for environment-specific settings

### CloudFront
- Distribution configured for S3 bucket
- Cache invalidation on each deployment
- HTTPS enabled

## Directory Structure
```
frontend/
├── src/           # Source code
├── public/        # Static files
├── build/         # Production build output
├── node_modules/  # Dependencies
├── package.json   # Project configuration
├── tailwind.config.js # Tailwind configuration
├── postcss.config.js  # PostCSS configuration
└── .env          # Environment variables (not in version control)
```

## Styling
The application uses TailwindCSS for styling. The configuration can be found in:
- `tailwind.config.js`
- `postcss.config.js` 