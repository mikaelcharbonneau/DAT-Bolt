# Development Environment Configuration
environment = "dev"
location    = "East US"

# PostgreSQL Configuration - Small instance for dev
postgresql_admin_username = "datboltadmin"
postgresql_sku_name       = "B_Standard_B1ms"  # 1 vCore, 2GB RAM

# Common Tags
common_tags = {
  Environment = "dev"
  Project     = "DAT-Bolt"
  Owner       = "HPE"
  ManagedBy   = "Terraform"
  CostCenter  = "IT-Development"
}

# Monitoring Configuration
enable_monitoring = true
log_retention_days = 7  # Shorter retention for dev

# Security Configuration - More permissive for development
enable_private_endpoints = false  # Disabled for easier dev access
function_app_cors_origins = ["*"]

# Cost Optimization - Aggressive for dev
auto_scale_enabled = true
dev_mode = true
backup_retention_days = 3

# Application Gateway - Smaller for dev
app_gateway_sku = {
  name     = "Standard_v2"
  tier     = "Standard_v2"
  capacity = 1
}

# Custom Domain - None for dev
custom_domain = ""

# Azure AD B2C - Optional for dev
azure_ad_b2c_tenant_name = ""
azure_ad_b2c_client_id = ""
azure_ad_b2c_client_secret = ""