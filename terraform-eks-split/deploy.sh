#!/bin/bash

# Master deploy script that can choose between local and remote execution
# Usage: ./deploy.sh [local|remote]

# Exit on error
set -e

# Default to local execution if not specified
EXECUTION_MODE="local"

# Check if execution mode is provided
if [ $# -gt 0 ]; then
    if [ "$1" = "local" ] || [ "$1" = "remote" ]; then
        EXECUTION_MODE="$1"
    else
        echo "Invalid execution mode: $1"
        echo "Usage: $0 [local|remote]"
        exit 1
    fi
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