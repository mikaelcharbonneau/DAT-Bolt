#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Environment not specified. Usage: ./deploy-frontend.sh <environment>"
    print_error "Available environments: dev, staging, prod"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Available environments: dev, staging, prod"
    exit 1
fi

print_status "Starting frontend deployment for $ENVIRONMENT environment..."

# Step 1: Deploy/Update Terraform infrastructure
print_status "Deploying Terraform infrastructure..."
cd terraform

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_status "Initializing Terraform..."
    terraform init
fi

# Plan the deployment
print_status "Creating Terraform plan..."
terraform plan -var-file="environments/${ENVIRONMENT}.tfvars" -out="${ENVIRONMENT}.tfplan"

# Apply the changes
print_status "Applying Terraform changes..."
terraform apply "${ENVIRONMENT}.tfplan"

# Get outputs
print_status "Retrieving deployment outputs..."
FUNCTION_APP_URL=$(terraform output -raw function_app_url)
STATIC_WEB_APP_URL=$(terraform output -raw static_web_app_url)
STATIC_WEB_APP_TOKEN=$(terraform output -raw static_web_app_deployment_token)
STATIC_WEB_APP_NAME=$(terraform output -raw static_web_app_name)

print_success "Infrastructure deployed successfully!"
print_status "Function App URL: $FUNCTION_APP_URL"
print_status "Static Web App URL: $STATIC_WEB_APP_URL"

# Step 2: Configure GitHub repository secrets
print_warning "Please configure the following GitHub repository secrets:"
echo "AZURE_STATIC_WEB_APPS_API_TOKEN=$STATIC_WEB_APP_TOKEN"
echo "VITE_AZURE_FUNCTIONS_URL=$FUNCTION_APP_URL"

# Step 3: Update environment file
print_status "Creating environment configuration file..."
cd ../

# Create .env file for local development
cat > .env.${ENVIRONMENT} << EOF
VITE_AZURE_FUNCTIONS_URL=$FUNCTION_APP_URL
VITE_STATIC_WEB_APP_URL=$STATIC_WEB_APP_URL
EOF

print_success "Environment file created: .env.${ENVIRONMENT}"

# Step 4: Build and test the application locally
print_status "Building the application..."
if [ -f "package.json" ]; then
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        npm install
    fi
    
    # Build the application
    print_status "Building React application..."
    VITE_AZURE_FUNCTIONS_URL=$FUNCTION_APP_URL npm run build
    
    print_success "Application built successfully!"
else
    print_warning "package.json not found. Skipping build step."
fi

# Step 5: Provide deployment instructions
print_status "Deployment Instructions:"
echo "1. Add the following secrets to your GitHub repository:"
echo "   - AZURE_STATIC_WEB_APPS_API_TOKEN (from output above)"
echo "   - VITE_AZURE_FUNCTIONS_URL (from output above)"
echo ""
echo "2. Push your code to the main branch to trigger automatic deployment"
echo ""
echo "3. Monitor the deployment at: https://github.com/<your-repo>/actions"
echo ""
echo "4. Once deployed, your application will be available at:"
echo "   $STATIC_WEB_APP_URL"

# Step 6: Test connectivity to Azure Functions
print_status "Testing connectivity to Azure Functions..."
if command -v curl &> /dev/null; then
    echo "Testing $FUNCTION_APP_URL/api/TestConnection..."
    if curl -s -f "$FUNCTION_APP_URL/api/TestConnection" > /dev/null; then
        print_success "Azure Functions are responding!"
    else
        print_warning "Azure Functions test failed. Please check the function app deployment."
    fi
else
    print_warning "curl not found. Skipping connectivity test."
fi

print_success "Frontend deployment preparation completed!"
print_status "Next steps:"
echo "1. Configure GitHub secrets as shown above"
echo "2. Push code to trigger deployment"
echo "3. Monitor deployment and test the application"
echo "4. Update DNS records if using custom domains"

# Cleanup
rm -f terraform/${ENVIRONMENT}.tfplan