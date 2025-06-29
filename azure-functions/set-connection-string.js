const { exec } = require('child_process');

// Azure Function App configuration
const functionAppName = 'func-dat-bolt-v2-dev-0d0d0d0a';
const resourceGroup = 'rg-dat-bolt-dev';

// Database connection details (avoiding shell escaping issues)
const dbConfig = {
  host: 'psql-dat-bolt-dev-61206194.postgres.database.azure.com',
  port: '5432',
  user: 'datboltadmin',
  password: 'DATBolt2024!SecureP@ssw0rd',
  database: 'dat_bolt_db'
};

// Build connection string
const connectionString = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}?sslmode=require`;

// App settings to configure
const appSettings = [
  `AZURE_POSTGRESQL_CONNECTION_STRING="${connectionString}"`,
  `DB_HOST="${dbConfig.host}"`,
  `DB_PORT="${dbConfig.port}"`,
  `DB_USER="${dbConfig.user}"`,
  `DB_PASSWORD="${dbConfig.password}"`,
  `DB_NAME="${dbConfig.database}"`,
  `NODE_ENV="production"`,
  `JWT_SECRET="your-jwt-secret-key-change-this"`,
  `CORS_ORIGINS="*"`
];

console.log('🔧 Configuring Azure Function App settings...');
console.log(`📱 Function App: ${functionAppName}`);
console.log(`📦 Resource Group: ${resourceGroup}`);

// Set app settings using Azure CLI (avoiding shell escaping)
const command = `az functionapp config appsettings set --name "${functionAppName}" --resource-group "${resourceGroup}" --settings ${appSettings.map(s => `"${s}"`).join(' ')}`;

console.log('🚀 Executing configuration...');

exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Configuration failed:', error.message);
    return;
  }
  
  if (stderr) {
    console.log('⚠️ Warnings:', stderr);
  }
  
  console.log('✅ Configuration completed successfully!');
  console.log('📋 App settings configured:');
  appSettings.forEach(setting => {
    const [key] = setting.split('=');
    console.log(`  - ${key.replace(/"/g, '')}`);
  });
  
  console.log('\n💡 Next: Deploy Azure Functions');
  console.log('   Run: func azure functionapp publish func-dat-bolt-v2-dev-0d0d0d0a');
}); 