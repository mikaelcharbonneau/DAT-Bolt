#!/bin/bash

# Azure Function App configuration script
# Uses environment variables to avoid shell escaping issues

FUNCTION_APP_NAME="func-dat-bolt-v2-dev-0d0d0d0a"
RESOURCE_GROUP="rg-dat-bolt-dev"

# Set environment variables (avoiding shell history expansion)
export DB_HOST="psql-dat-bolt-dev-61206194.postgres.database.azure.com"
export DB_PORT="5432" 
export DB_USER="datboltadmin"
export DB_PASSWORD='DATBolt2024!SecureP@ssw0rd'
export DB_NAME="dat_bolt_db"

# Build connection string using environment variables
export CONNECTION_STRING="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

echo "🔧 Configuring Azure Function App settings..."
echo "📱 Function App: $FUNCTION_APP_NAME"
echo "📦 Resource Group: $RESOURCE_GROUP"

# Configure app settings one by one to avoid issues
echo "⚙️ Setting database connection string..."
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "AZURE_POSTGRESQL_CONNECTION_STRING=$CONNECTION_STRING"

echo "⚙️ Setting individual database parameters..."
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "DB_HOST=$DB_HOST" "DB_PORT=$DB_PORT" "DB_USER=$DB_USER" "DB_NAME=$DB_NAME"

echo "⚙️ Setting application configuration..."
az functionapp config appsettings set \
  --name "$FUNCTION_APP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "NODE_ENV=production" "JWT_SECRET=change-this-jwt-secret" "CORS_ORIGINS=*"

echo "✅ Configuration completed!"
echo "💡 Next steps:"
echo "   1. Deploy functions: func azure functionapp publish $FUNCTION_APP_NAME"  
echo "   2. Test the API endpoints" 
