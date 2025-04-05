#!/bin/bash

# Master deploy script that can choose between local and remote execution
# Usage: ./deploy.sh <local|remote>

# Exit on error
set -e

# Check if execution mode is provided
if [ $# -lt 1 ]; then
    echo "Error: Execution mode is required"
    echo "Usage: $0 <local|remote>"
    exit 1
fi

# Validate execution mode
EXECUTION_MODE="$1"
if [ "$EXECUTION_MODE" != "local" ] && [ "$EXECUTION_MODE" != "remote" ]; then
    echo "Error: Invalid execution mode: $EXECUTION_MODE"
    echo "Usage: $0 <local|remote>"
    exit 1
fi

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Run the appropriate script
if [ "$EXECUTION_MODE" = "remote" ]; then
    echo "🚀 Starting EKS infrastructure deployment using REMOTE execution..."
    "$SCRIPT_DIR/deploy-remote-executor.sh"
else
    echo "🚀 Starting EKS infrastructure deployment using LOCAL execution..."
    "$SCRIPT_DIR/deploy-local.sh"
fi 