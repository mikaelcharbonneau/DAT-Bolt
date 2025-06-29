# Staging Environment Configuration
environment = "staging"
location    = "East US"

# PostgreSQL Configuration - Medium instance for staging
postgresql_admin_username = "datboltadmin"
postgresql_sku_name       = "GP_Standard_D2s_v3"  # 2 vCores, 8GB RAM

# Common Tags
common_tags = {
  Environment = "staging"
  Project     = "DAT-Bolt"
  Owner       = "HPE"
  ManagedBy   = "Terraform"
  CostCenter  = "IT-Staging"
}

# Monitoring Configuration
enable_monitoring = true
log_retention_days = 30

# Security Configuration - Production-like
enable_private_endpoints = true
function_app_cors_origins = [
  "https://staging-auditportal.hpecloud.com",
  "https://localhost:3000"  # For local development
]

# Cost Optimization - Balanced for staging
auto_scale_enabled = true
dev_mode = false
backup_retention_days = 7

# Application Gateway - Medium for staging
app_gateway_sku = {
  name     = "Standard_v2"
  tier     = "Standard_v2"
  capacity = 2
}

# Custom Domain - Staging subdomain
custom_domain = "staging-auditportal.hpecloud.com"

# Azure AD B2C - Production configuration
azure_ad_b2c_tenant_name = "hpeauditportal.onmicrosoft.com"
# Note: Secrets should be set via environment variables or Azure DevOps
azure_ad_b2c_client_id = ""
azure_ad_b2c_client_secret = ""