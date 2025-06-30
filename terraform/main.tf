# Configure the Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~>2.0"
    }
  }
  required_version = ">= 1.0"
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

# Get current client configuration
data "azurerm_client_config" "current" {}

# Create Resource Group
resource "azurerm_resource_group" "dat_bolt" {
  name     = "rg-dat-bolt-${var.environment}"
  location = var.location
  
  tags = var.common_tags
}

# Create Virtual Network
resource "azurerm_virtual_network" "dat_bolt" {
  name                = "vnet-dat-bolt-${var.environment}"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.dat_bolt.location
  resource_group_name = azurerm_resource_group.dat_bolt.name
  
  tags = var.common_tags
}

# Create subnet for Application Gateway
resource "azurerm_subnet" "app_gateway" {
  name                 = "snet-appgw-${var.environment}"
  resource_group_name  = azurerm_resource_group.dat_bolt.name
  virtual_network_name = azurerm_virtual_network.dat_bolt.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Create subnet for Private Endpoints
resource "azurerm_subnet" "private_endpoints" {
  name                 = "snet-pe-${var.environment}"
  resource_group_name  = azurerm_resource_group.dat_bolt.name
  virtual_network_name = azurerm_virtual_network.dat_bolt.name
  address_prefixes     = ["10.0.2.0/24"]
}

# Create subnet for Functions
resource "azurerm_subnet" "functions" {
  name                 = "snet-func-${var.environment}"
  resource_group_name  = azurerm_resource_group.dat_bolt.name
  virtual_network_name = azurerm_virtual_network.dat_bolt.name
  address_prefixes     = ["10.0.3.0/24"]
  
  delegation {
    name = "functions-delegation"
    service_delegation {
      name    = "Microsoft.Web/serverFarms"
      actions = ["Microsoft.Network/virtualNetworks/subnets/action"]
    }
  }
}

# Create Key Vault
resource "azurerm_key_vault" "dat_bolt" {
  name                = "kv-dat-bolt-${var.environment}-${random_id.key_vault_suffix.hex}"
  location            = azurerm_resource_group.dat_bolt.location
  resource_group_name = azurerm_resource_group.dat_bolt.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Create", "Get", "List", "Update", "Delete", "Import", "Backup", "Restore"
    ]

    secret_permissions = [
      "Set", "Get", "Delete", "List", "Purge", "Recover"
    ]

    certificate_permissions = [
      "Create", "Get", "Import", "List", "Update", "Delete"
    ]
  }

  tags = var.common_tags
}

resource "random_id" "key_vault_suffix" {
  byte_length = 4
}

# Create Storage Account for Functions
resource "azurerm_storage_account" "functions" {
  name                     = "stfunc${var.environment}${random_id.storage_suffix.hex}"
  resource_group_name      = azurerm_resource_group.dat_bolt.name
  location                 = azurerm_resource_group.dat_bolt.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = var.common_tags
}

resource "random_id" "storage_suffix" {
  byte_length = 4
}

# Create Storage Account for Static Web App (if needed)
resource "azurerm_storage_account" "static_web" {
  name                     = "stweb${var.environment}${random_id.web_storage_suffix.hex}"
  resource_group_name      = azurerm_resource_group.dat_bolt.name
  location                 = azurerm_resource_group.dat_bolt.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  static_website {
    index_document     = "index.html"
    error_404_document = "404.html"
  }

  tags = var.common_tags
}

resource "random_id" "web_storage_suffix" {
  byte_length = 4
}

# Create NEW Application Service Plan for Functions (v2) - Premium Plan
resource "azurerm_service_plan" "functions_v2" {
  name                = "asp-func-v2-${var.environment}"
  resource_group_name = azurerm_resource_group.dat_bolt.name
  location            = azurerm_resource_group.dat_bolt.location
  os_type             = "Linux"
  sku_name            = "EP1"  # Premium plan for better reliability

  tags = var.common_tags
}

# Create NEW Function App (v2) with corrected configuration
resource "azurerm_linux_function_app" "dat_bolt_v2" {
  name                = "func-dat-bolt-v2-${var.environment}-${random_id.function_v2_suffix.hex}"
  resource_group_name = azurerm_resource_group.dat_bolt.name
  location            = azurerm_resource_group.dat_bolt.location
  service_plan_id     = azurerm_service_plan.functions_v2.id
  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins = ["*"]  # Will be restricted in production
      support_credentials = false
    }
    # Premium plan elastic scaling settings  
    pre_warmed_instance_count = 1
    # Remove problematic settings that cause conflicts
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" = "node"
    # Removed WEBSITE_NODE_DEFAULT_VERSION - causes conflicts on Linux
    "NODE_ENV" = "production"
    "AZURE_POSTGRESQL_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.dat_bolt.name};SecretName=postgresql-connection-string)"
    "JWT_SECRET" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.dat_bolt.name};SecretName=jwt-secret)"
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.dat_bolt.connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  tags = var.common_tags
}

resource "random_id" "function_suffix" {
  byte_length = 4
}

resource "random_id" "function_v2_suffix" {
  byte_length = 4
}

# Grant Function App (V2) access to Key Vault
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = azurerm_key_vault.dat_bolt.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_function_app.dat_bolt_v2.identity[0].principal_id

  secret_permissions = [
    "Get", "List"
  ]
}

# Create PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "dat_bolt" {
  name                   = "psql-dat-bolt-${var.environment}-${random_id.postgresql_suffix.hex}"
  resource_group_name    = azurerm_resource_group.dat_bolt.name
  location              = azurerm_resource_group.dat_bolt.location
  version               = "15"
  administrator_login    = var.postgresql_admin_username
  administrator_password = var.postgresql_admin_password
  zone                  = "1"
  storage_mb            = 32768
  sku_name              = var.postgresql_sku_name
  backup_retention_days = 7

  tags = var.common_tags
}

resource "random_id" "postgresql_suffix" {
  byte_length = 4
}

# Create PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "dat_bolt" {
  name      = "dat_bolt_db"
  server_id = azurerm_postgresql_flexible_server.dat_bolt.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Create Private DNS Zone for PostgreSQL
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.dat_bolt.name

  tags = var.common_tags
}

# Link Private DNS Zone to VNet
resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "postgresql-dns-link"
  resource_group_name   = azurerm_resource_group.dat_bolt.name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = azurerm_virtual_network.dat_bolt.id

  tags = var.common_tags
}

# Create Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "dat_bolt" {
  name                = "log-dat-bolt-${var.environment}"
  location            = azurerm_resource_group.dat_bolt.location
  resource_group_name = azurerm_resource_group.dat_bolt.name
  sku                 = "PerGB2018"
  retention_in_days   = var.log_retention_days

  tags = var.common_tags
}

# Create Application Insights
resource "azurerm_application_insights" "dat_bolt" {
  name                = "appi-dat-bolt-${var.environment}"
  location            = azurerm_resource_group.dat_bolt.location
  resource_group_name = azurerm_resource_group.dat_bolt.name
  workspace_id        = azurerm_log_analytics_workspace.dat_bolt.id
  application_type    = "web"

  tags = var.common_tags
}

# Store secrets in Key Vault
resource "azurerm_key_vault_secret" "postgresql_connection_string" {
  name         = "postgresql-connection-string"
  value        = "Server=${azurerm_postgresql_flexible_server.dat_bolt.fqdn};Database=${azurerm_postgresql_flexible_server_database.dat_bolt.name};Port=5432;User Id=${var.postgresql_admin_username};Password=${var.postgresql_admin_password};Ssl Mode=Require;"
  key_vault_id = azurerm_key_vault.dat_bolt.id

  depends_on = [azurerm_key_vault_access_policy.function_app]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = random_password.jwt_secret.result
  key_vault_id = azurerm_key_vault.dat_bolt.id

  depends_on = [azurerm_key_vault_access_policy.function_app]
}

resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

# Create Azure Static Web Apps for hosting the React frontend
resource "azurerm_static_site" "dat_bolt_frontend" {
  name                = "stapp-dat-bolt-${var.environment}"
  resource_group_name = azurerm_resource_group.dat_bolt.name
  location            = "East US 2"  # Static Web Apps limited regions
  sku_tier            = var.environment == "prod" ? "Standard" : "Free"
  sku_size            = var.environment == "prod" ? "Standard" : "Free"

  tags = var.common_tags
}

# Store Azure Static Web Apps deployment token in Key Vault
resource "azurerm_key_vault_secret" "static_web_app_token" {
  name         = "static-web-app-deployment-token"
  value        = azurerm_static_site.dat_bolt_frontend.api_key
  key_vault_id = azurerm_key_vault.dat_bolt.id

  depends_on = [azurerm_key_vault_access_policy.function_app]
}