# Resource Group Outputs
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.dat_bolt.name
}

output "resource_group_location" {
  description = "Location of the resource group"
  value       = azurerm_resource_group.dat_bolt.location
}

# Function App Outputs (Primary - V2)
output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.dat_bolt_v2.name
}

output "function_app_url" {
  description = "URL of the Function App"
  value       = "https://${azurerm_linux_function_app.dat_bolt_v2.default_hostname}"
}

output "function_app_identity_principal_id" {
  description = "Principal ID of the Function App managed identity"
  value       = azurerm_linux_function_app.dat_bolt_v2.identity[0].principal_id
}



# PostgreSQL Outputs
output "postgresql_server_name" {
  description = "Name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.dat_bolt.name
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.dat_bolt.fqdn
}

output "postgresql_database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.dat_bolt.name
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string (sensitive)"
  value       = azurerm_key_vault_secret.postgresql_connection_string.value
  sensitive   = true
}

# Key Vault Outputs
output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.dat_bolt.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.dat_bolt.vault_uri
}

# Storage Account Outputs
output "function_storage_account_name" {
  description = "Name of the Function App storage account"
  value       = azurerm_storage_account.functions.name
}

output "static_web_storage_account_name" {
  description = "Name of the static web storage account"
  value       = azurerm_storage_account.static_web.name
}

output "static_web_url" {
  description = "URL of the static website"
  value       = azurerm_storage_account.static_web.primary_web_endpoint
}

# Virtual Network Outputs
output "virtual_network_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.dat_bolt.name
}

output "virtual_network_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.dat_bolt.id
}

# Application Insights Outputs
output "application_insights_name" {
  description = "Name of Application Insights"
  value       = azurerm_application_insights.dat_bolt.name
}

output "application_insights_instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.dat_bolt.instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string"
  value       = azurerm_application_insights.dat_bolt.connection_string
  sensitive   = true
}

# Log Analytics Outputs
output "log_analytics_workspace_name" {
  description = "Name of Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.dat_bolt.name
}

output "log_analytics_workspace_id" {
  description = "ID of Log Analytics workspace"
  value       = azurerm_log_analytics_workspace.dat_bolt.workspace_id
}

# Environment-specific outputs
output "environment" {
  description = "Environment name"
  value       = var.environment
}

# Deployment information
output "deployment_timestamp" {
  description = "Timestamp of the deployment"
  value       = timestamp()
}

# Resource naming convention outputs
output "resource_prefix" {
  description = "Resource naming prefix used"
  value       = "dat-bolt-${var.environment}"
}

# Security outputs
output "managed_identity_enabled" {
  description = "Whether managed identity is enabled for Function App"
  value       = length(azurerm_linux_function_app.dat_bolt_v2.identity) > 0
}

# Cost optimization outputs
output "postgresql_sku" {
  description = "PostgreSQL server SKU"
  value       = var.postgresql_sku_name
}

output "function_app_plan_sku" {
  description = "Function App service plan SKU"
  value       = azurerm_service_plan.functions_v2.sku_name
}