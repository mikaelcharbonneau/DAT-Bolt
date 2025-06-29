# Production Environment Configuration
environment = "prod"
location    = "East US"

# PostgreSQL Configuration - High-performance instance for production
postgresql_admin_username = "datboltadmin"
postgresql_sku_name       = "GP_Standard_D4s_v3"  # 4 vCores, 16GB RAM

# Common Tags
common_tags = {
  Environment = "prod"
  Project     = "DAT-Bolt"
  Owner       = "HPE"
  ManagedBy   = "Terraform"
  CostCenter  = "IT-Production"
  Criticality = "High"
}

# Monitoring Configuration - Full monitoring for production
enable_monitoring = true
log_retention_days = 90  # Longer retention for compliance

# Security Configuration - Maximum security for production
enable_private_endpoints = true
function_app_cors_origins = [
  "https://auditportal.hpecloud.com"
]

# Cost Optimization - Performance over cost for production
auto_scale_enabled = true
dev_mode = false
backup_retention_days = 30  # Extended backup retention

# Application Gateway - High availability for production
app_gateway_sku = {
  name     = "Standard_v2"
  tier     = "Standard_v2"
  capacity = 3
}

# Custom Domain - Production domain
custom_domain = "auditportal.hpecloud.com"

# Azure AD B2C - Production configuration
azure_ad_b2c_tenant_name = "hpeauditportal.onmicrosoft.com"
# Note: Secrets should be set via environment variables or Azure DevOps
azure_ad_b2c_client_id = ""
azure_ad_b2c_client_secret = ""

# Production-specific security
allowed_client_ips = [
  # Add your corporate IP ranges here
  # "203.0.113.0/24",  # Example corporate IP range
]