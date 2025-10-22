#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 EARTHWORM DEPLOYMENT SCRIPT${NC}"
echo "=================================="
echo ""

# Docker Hub credentials (use environment variables in production)
DOCKER_USERNAME="${DOCKER_USERNAME:-your_docker_username}"
DOCKER_TOKEN="${DOCKER_TOKEN:-your_docker_token}"
AWS_IP="${AWS_IP:-16.170.247.201}"
KEY_PAIR_PATH="$HOME/Downloads/english-aidol-key.pem"

echo -e "${GREEN}✓ Configuration:${NC}"
echo "  Docker Hub: $DOCKER_USERNAME"
echo "  AWS EC2 IP: $AWS_IP"
echo "  Key Pair: $KEY_PAIR_PATH"
echo ""

# Step 1: Login to Docker
echo -e "${BLUE}Step 1: Logging into Docker Hub...${NC}"
echo "$DOCKER_TOKEN" | docker login -u "$DOCKER_USERNAME" --password-stdin

# Step 2: Build images
echo ""
echo -e "${BLUE}Step 2: Building Docker images...${NC}"
docker build -f Dockerfile.prod -t "$DOCKER_USERNAME/english-aidol:main.v1.0.0" .
docker build -f Dockerfile.earthworm -t "$DOCKER_USERNAME/english-aidol:earthworm.v1.0.0" .

# Step 3: Push to Docker Hub
echo ""
echo -e "${BLUE}Step 3: Pushing to Docker Hub...${NC}"
docker push "$DOCKER_USERNAME/english-aidol:main.v1.0.0"
docker push "$DOCKER_USERNAME/english-aidol:earthworm.v1.0.0"
docker push "$DOCKER_USERNAME/english-aidol:main.latest" 2>/dev/null || true
docker push "$DOCKER_USERNAME/english-aidol:earthworm.latest" 2>/dev/null || true

echo ""
echo -e "${GREEN}✓ Docker images pushed successfully!${NC}"
echo ""

# Step 4: Deploy to AWS
echo -e "${BLUE}Step 4: Deploying to AWS EC2...${NC}"
echo "Run this command on your Mac:"
echo ""
echo "ssh -i $KEY_PAIR_PATH ubuntu@$AWS_IP 'bash -s' << 'DEPLOY'"
echo "cd /home/ubuntu"
echo "# Install Docker"
echo "curl -fsSL https://get.docker.com -o get-docker.sh"
echo "sudo sh get-docker.sh"
echo "sudo usermod -aG docker ubuntu"
echo ""
echo "# Create docker-compose.prod.yml"
echo "cat > docker-compose.prod.yml << 'COMPOSE'"
cat docker-compose.prod.yml
echo "COMPOSE"
echo ""
echo "# Start services"
echo "docker compose -f docker-compose.prod.yml up -d"
echo "DEPLOY"
echo ""

echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "🌐 Your app will be live at: http://$AWS_IP"
