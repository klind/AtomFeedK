#!/bin/bash

# Script: run-docker-compose.sh
# Purpose: Run the application locally using docker-compose

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}Running Application with Docker Compose${NC}"
echo ""

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed. Please install docker-compose first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "$ROOT_DIR/docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found at $ROOT_DIR/docker-compose.yml${NC}"
    exit 1
fi

# Change to the project root directory
cd "$ROOT_DIR"

# Display docker-compose file information
echo -e "${YELLOW}Using docker-compose.yml at $ROOT_DIR/docker-compose.yml${NC}"
echo -e "${YELLOW}Services defined:${NC}"
docker-compose config --services | cat

# Ask for confirmation
read -p "Do you want to run docker-compose now? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

# Run docker-compose
echo -e "${YELLOW}Starting services with docker-compose...${NC}"
echo -e "${YELLOW}Note: Press Ctrl+C to stop the services when done.${NC}"
echo

# Run docker-compose with detached mode option
read -p "Run in detached mode (background)? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Starting services in detached mode...${NC}"
    docker-compose up -d
    
    # Show status
    echo -e "\n${GREEN}Services started in background.${NC}"
    echo -e "${YELLOW}Container status:${NC}"
    docker-compose ps
    
    echo -e "\n${YELLOW}To view logs, use: docker-compose logs -f${NC}"
    echo -e "${YELLOW}To stop services, use: docker-compose down${NC}"
else
    echo -e "${YELLOW}Starting services in interactive mode...${NC}"
    docker-compose up
    
    # This point is reached when the user presses Ctrl+C
    echo -e "\n${YELLOW}Stopping services...${NC}"
    docker-compose down
    echo -e "${GREEN}Services stopped.${NC}"
fi 