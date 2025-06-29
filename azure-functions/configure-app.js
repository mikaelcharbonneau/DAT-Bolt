const { exec } = require('child_process');
const fs = require('fs');

// Configuration
const config = {
  functionAppName: 'func-dat-bolt-v2-dev-0d0d0d0a',
  resourceGroup: 'rg-dat-bolt-dev',
  dbHost: 'psql-dat-bolt-dev-61206194.postgres.database.azure.com',
  dbPort: '5432',
  dbUser: 'datboltadmin',
  dbPassword: 'DATBolt2024!SecureP@ssw0rd',
  dbName: 'dat_bolt_db'
};

// Build connection string
const connectionString = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}?sslmode=require`;

// Create temporary JSON file with settings to avoid shell escaping
const appSettings = {
  "AZURE_POSTGRESQL_CONNECTION_STRING": connectionString,
  "DB_HOST": config.dbHost,
  "DB_PORT": config.dbPort,
  "DB_USER": config.dbUser,
  "DB_NAME": config.dbName,
  "NODE_ENV": "production",
  "JWT_SECRET": "change-this-jwt-secret-in-production",
  "CORS_ORIGINS": "*"
};

console.log('🔧 Configuring Azure Function App...');
console.log(`📱 Function App: ${config.functionAppName}`);
console.log(`📦 Resource Group: ${config.resourceGroup}`);

// Write settings to temporary file
const tempFile = 'temp-app-settings.json';
fs.writeFileSync(tempFile, JSON.stringify(appSettings, null, 2));

// Use Azure CLI with JSON file to avoid shell escaping
const command = `az functionapp config appsettings set --name ${config.functionAppName} --resource-group ${config.resourceGroup} --settings @${tempFile}`;

console.log('🚀 Applying configuration...');

exec(command, (error, stdout, stderr) => {
  // Clean up temporary file
  fs.unlinkSync(tempFile);
  
  if (error) {
    console.error('❌ Configuration failed:', error.message);
    return;
  }
  
  if (stderr) {
    console.log('⚠️ Warnings:', stderr);
  }
  
  console.log('✅ Configuration completed successfully!');
  console.log('📋 App settings configured:');
  Object.keys(appSettings).forEach(key => {
    if (key.includes('PASSWORD') || key.includes('SECRET')) {
      console.log(`  - ${key}: [HIDDEN]`);
    } else {
      console.log(`  - ${key}: ${appSettings[key]}`);
    }
  });
  
  console.log('\n💡 Next steps:');
  console.log('   1. Deploy functions: func azure functionapp publish func-dat-bolt-v2-dev-0d0d0d0a');
  console.log('   2. Test the API endpoints');
}); 