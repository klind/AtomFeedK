#!/bin/bash

# Master destroy script that can choose between local and remote execution
# Usage: ./destroy.sh <local|remote>

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

# Detect if script is being run from the menu
if [ -n "$MENU_INITIATED" ]; then
    # Pass this knowledge to the destroy scripts
    export RUNNING_FROM_MENU=true
fi

# Run the appropriate script
if [ "$EXECUTION_MODE" = "remote" ]; then
    echo "⚠️ Starting EKS infrastructure destruction using REMOTE execution..."
    "$SCRIPT_DIR/destroy-remote-executor.sh"
else
    echo "⚠️ Starting EKS infrastructure destruction using LOCAL execution..."
    "$SCRIPT_DIR/destroy-local.sh"
fi 