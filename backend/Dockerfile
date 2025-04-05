# Build stage
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies with specific optimizations
RUN npm ci --only=production --no-audit --no-fund --prefer-offline

# Copy source code
COPY . .

# Remove development-related files to reduce size
RUN rm -rf .git .github .vscode tests *.md \
    && rm -rf npm-debug.log* \
    && find . -name "*.log" -type f -delete

# Production stage using Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy node_modules and app source from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/index.html ./index.html

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R node:node /app

# Server configuration
ENV PORT=5000 \
    NODE_ENV=local \
    NODE_OPTIONS="--max-old-space-size=256" \
    # DynamoDB configuration
    TABLE_NAME=hcm_atom_feed_employee_local \
    AWS_REGION=eu-north-1 \
    # Authentication configuration
    COGNITO_USER_POOL_ID=eu-north-1_vyUcMe53b \
    COGNITO_APP_CLIENT_ID=43mpnnsk8cb79gs4gjkgii52j9 \
    # Logging
    LOG_LEVEL=info

# Clean up npm cache and other unnecessary files
RUN npm cache clean --force \
    && rm -rf /tmp/* \
    && find /usr/local/lib/node_modules -type f -not -path "*/node_modules/*" -name "*.md" -delete \
    && find /usr/local/lib/node_modules -type f -not -path "*/node_modules/*" -name "*.ts" -delete \
    && find /usr/local/lib/node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/lib/node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/lib/node_modules -type d -name ".git" -exec rm -rf {} + 2>/dev/null || true \
    && find /usr/local/lib/node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true

# Run as non-root user for better security
USER node

# Expose port
EXPOSE 5000

# Start command
CMD ["node", "src/index.js"]

