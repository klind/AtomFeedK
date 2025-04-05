#!/bin/bash

# Script: stop-docker-containers.sh
# Purpose: Stop Docker containers that were started with Docker compose

# Set up colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${CYAN}Stopping Docker Containers${NC}"
echo ""

# Check if docker-compose.yml exists in the project root
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
if [ -f "$DOCKER_COMPOSE_FILE" ]; then
    echo -e "${YELLOW}Found docker-compose.yml, stopping containers...${NC}"
    
    # Change to the project root directory
    cd "$PROJECT_ROOT"
    
    # Stop containers with docker-compose
    if docker-compose down; then
        echo -e "${GREEN}✓ Docker containers stopped successfully with docker-compose down${NC}"
    else
        echo -e "${RED}Error stopping containers with docker-compose${NC}"
    fi
else
    echo -e "${YELLOW}No docker-compose.yml found in project root${NC}"
    echo -e "${YELLOW}Looking for running containers related to the project...${NC}"
    
    # Look for containers with names matching the project pattern
    CONTAINERS=$(docker ps --filter "name=hcm-developer" --format "{{.Names}}")
    
    if [ -n "$CONTAINERS" ]; then
        echo -e "${GREEN}Found running containers:${NC}"
        echo "$CONTAINERS"
        echo ""
        echo -e "${YELLOW}Stopping containers...${NC}"
        
        # Stop each container
        for container in $CONTAINERS; do
            echo -e "Stopping $container..."
            if docker stop "$container"; then
                echo -e "${GREEN}✓ Container $container stopped${NC}"
            else
                echo -e "${RED}Error stopping container $container${NC}"
            fi
        done
        
        echo -e "${GREEN}✓ All identified containers stopped${NC}"
    else
        echo -e "${RED}No running containers found matching 'hcm-developer'${NC}"
        
        # Show all running containers
        echo -e "${YELLOW}All running containers:${NC}"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
        
        echo ""
        echo -e "${YELLOW}To stop a specific container, use:${NC}"
        echo -e "  docker stop CONTAINER_NAME"
    fi
fi

echo ""
echo -e "${CYAN}Done!${NC}" 