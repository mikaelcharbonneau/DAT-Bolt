# Environment Configuration
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Resource Location
variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "East US"
}

# Common Tags
variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default = {
    Environment = "dev"
    Project     = "DAT-Bolt"
    Owner       = "HPE"
    ManagedBy   = "Terraform"
  }
}

# PostgreSQL Configuration
variable "postgresql_admin_username" {
  description = "Administrator username for PostgreSQL server"
  type        = string
  default     = "datboltadmin"
  sensitive   = true
}

variable "postgresql_admin_password" {
  description = "Administrator password for PostgreSQL server"
  type        = string
  sensitive   = true
}

variable "postgresql_sku_name" {
  description = "SKU name for PostgreSQL server"
  type        = string
  default     = "B_Standard_B1ms"  # Burstable, 1 vCore, 2GB RAM
}

# Log Analytics
variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Function App Configuration
variable "function_app_cors_origins" {
  description = "Allowed CORS origins for Function App"
  type        = list(string)
  default     = ["*"]  # Will be restricted in production
}

# Static Web App Configuration
variable "static_web_app_location" {
  description = "Location for Static Web App"
  type        = string
  default     = "East US 2"
}

# Azure AD B2C Configuration (if needed)
variable "azure_ad_b2c_tenant_name" {
  description = "Azure AD B2C tenant name"
  type        = string
  default     = ""
}

variable "azure_ad_b2c_client_id" {
  description = "Azure AD B2C application client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "azure_ad_b2c_client_secret" {
  description = "Azure AD B2C application client secret"
  type        = string
  default     = ""
  sensitive   = true
}

# Application Gateway Configuration
variable "app_gateway_sku" {
  description = "SKU for Application Gateway"
  type        = object({
    name     = string
    tier     = string
    capacity = number
  })
  default = {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }
}

# Custom Domain Configuration
variable "custom_domain" {
  description = "Custom domain for the application"
  type        = string
  default     = ""
}

variable "ssl_certificate_path" {
  description = "Path to SSL certificate file"
  type        = string
  default     = ""
}

variable "ssl_certificate_password" {
  description = "Password for SSL certificate"
  type        = string
  default     = ""
  sensitive   = true
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable monitoring and alerting"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = ""
}

# Backup Configuration
variable "backup_retention_days" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 7
}

# Security Configuration
variable "allowed_client_ips" {
  description = "List of allowed client IP addresses"
  type        = list(string)
  default     = []
}

variable "enable_private_endpoints" {
  description = "Enable private endpoints for enhanced security"
  type        = bool
  default     = true
}

# Cost Optimization
variable "auto_scale_enabled" {
  description = "Enable auto-scaling for cost optimization"
  type        = bool
  default     = true
}

variable "dev_mode" {
  description = "Enable development mode with reduced costs"
  type        = bool
  default     = false
}