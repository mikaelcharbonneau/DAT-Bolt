#!/bin/bash

# Azure DAT-Bolt Infrastructure Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: dev, staging, prod
# Action: plan, apply, destroy

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENTS_DIR="$SCRIPT_DIR/environments"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments:"
    echo "  dev      - Development environment"
    echo "  staging  - Staging environment"
    echo "  prod     - Production environment"
    echo ""
    echo "Actions:"
    echo "  plan     - Show what changes will be made"
    echo "  apply    - Apply the changes"
    echo "  destroy  - Destroy the infrastructure (use with caution!)"
    echo ""
    echo "Examples:"
    echo "  $0 dev plan"
    echo "  $0 staging apply"
    echo "  $0 prod plan"
    echo ""
}

validate_environment() {
    local env=$1
    if [[ ! "$env" =~ ^(dev|staging|prod)$ ]]; then
        log_error "Invalid environment: $env"
        log_error "Valid environments: dev, staging, prod"
        exit 1
    fi
}

validate_action() {
    local action=$1
    if [[ ! "$action" =~ ^(plan|apply|destroy)$ ]]; then
        log_error "Invalid action: $action"
        log_error "Valid actions: plan, apply, destroy"
        exit 1
    fi
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install Terraform first."
        exit 1
    fi
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install Azure CLI first."
        exit 1
    fi
    
    # Check if logged into Azure
    if ! az account show &> /dev/null; then
        log_error "Not logged into Azure. Please run 'az login' first."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

setup_terraform_backend() {
    local env=$1
    log_info "Setting up Terraform backend for $env environment..."
    
    # Initialize Terraform if not already done
    if [ ! -d ".terraform" ]; then
        log_info "Initializing Terraform..."
        terraform init
    fi
    
    # Create workspace if it doesn't exist
    if ! terraform workspace list | grep -q "$env"; then
        log_info "Creating Terraform workspace: $env"
        terraform workspace new "$env"
    else
        log_info "Selecting Terraform workspace: $env"
        terraform workspace select "$env"
    fi
}

generate_terraform_vars() {
    local env=$1
    local vars_file="$ENVIRONMENTS_DIR/$env.tfvars"
    
    if [ ! -f "$vars_file" ]; then
        log_error "Environment variables file not found: $vars_file"
        exit 1
    fi
    
    # Check if postgresql_admin_password is set
    if ! grep -q "postgresql_admin_password.*=" "$vars_file" || grep -q "postgresql_admin_password.*=\"\"" "$vars_file"; then
        log_warning "PostgreSQL admin password not set in $vars_file"
        read -s -p "Enter PostgreSQL admin password: " postgres_password
        echo ""
        
        # Create a temporary vars file with the password
        cp "$vars_file" "${vars_file}.tmp"
        echo "postgresql_admin_password = \"$postgres_password\"" >> "${vars_file}.tmp"
        VARS_FILE="${vars_file}.tmp"
    else
        VARS_FILE="$vars_file"
    fi
}

run_terraform() {
    local env=$1
    local action=$2
    local vars_file=$3
    
    log_info "Running Terraform $action for $env environment..."
    
    case $action in
        plan)
            terraform plan -var-file="$vars_file" -out="tfplan-$env"
            ;;
        apply)
            if [ -f "tfplan-$env" ]; then
                terraform apply "tfplan-$env"
            else
                terraform apply -var-file="$vars_file" -auto-approve
            fi
            ;;
        destroy)
            log_warning "You are about to DESTROY the $env environment!"
            read -p "Are you sure? Type 'yes' to confirm: " confirm
            if [ "$confirm" = "yes" ]; then
                terraform destroy -var-file="$vars_file" -auto-approve
            else
                log_info "Destroy cancelled."
                exit 0
            fi
            ;;
    esac
}

cleanup() {
    # Clean up temporary files
    if [ -f "${VARS_FILE}" ] && [[ "${VARS_FILE}" == *.tmp ]]; then
        rm -f "${VARS_FILE}"
    fi
}

# Main script
main() {
    local environment=${1:-}
    local action=${2:-}
    
    # Show usage if no arguments provided
    if [ -z "$environment" ] || [ -z "$action" ]; then
        show_usage
        exit 1
    fi
    
    # Validate inputs
    validate_environment "$environment"
    validate_action "$action"
    
    # Check prerequisites
    check_prerequisites
    
    # Change to Terraform directory
    cd "$SCRIPT_DIR"
    
    # Setup
    setup_terraform_backend "$environment"
    generate_terraform_vars "$environment"
    
    # Run Terraform
    run_terraform "$environment" "$action" "$VARS_FILE"
    
    # Cleanup
    cleanup
    
    log_success "Terraform $action completed successfully for $environment environment"
}

# Trap to ensure cleanup runs on exit
trap cleanup EXIT

# Run main function
main "$@"