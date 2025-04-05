# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Set build-time environment variables with default values
ARG REACT_APP_API_URL=http://localhost:5000
ARG REACT_APP_COGNITO_REGION=eu-north-1
ARG REACT_APP_COGNITO_USER_POOL_ID=eu-north-1_vyUcMe53b
ARG REACT_APP_COGNITO_APP_CLIENT_ID=43mpnnsk8cb79gs4gjkgii52j9
ARG REACT_APP_ENVIRONMENT=local

# Set environment variables
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_COGNITO_REGION=$REACT_APP_COGNITO_REGION
ENV REACT_APP_COGNITO_USER_POOL_ID=$REACT_APP_COGNITO_USER_POOL_ID
ENV REACT_APP_COGNITO_APP_CLIENT_ID=$REACT_APP_COGNITO_APP_CLIENT_ID
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT

# Build the application
RUN npm run build

# Production stage - using smaller nginx image
FROM nginx:alpine-slim

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Add nginx configuration for React router
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Remove default nginx config and unnecessary files to reduce size
RUN rm -rf /etc/nginx/conf.d/default.conf.template \
    /etc/nginx/conf.d/ssl.conf.template \
    /usr/share/nginx/html/50x.html \
    /var/cache/apk/* \
    /var/tmp/* \
    /tmp/*

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 