#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function deploySchema() {
  // Use environment variables to avoid shell escaping issues
  const client = new Client({
    host: 'psql-dat-bolt-dev-61206194.postgres.database.azure.com',
    port: 5432,
    user: 'datboltadmin',
    password: 'DATBolt2024!SecureP@ssw0rd',
    database: 'dat_bolt_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to Azure PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('📖 Reading schema file...');
    const schemaPath = path.join(__dirname, 'azure-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing schema deployment...');
    console.log(`📄 Schema size: ${schemaSQL.length} characters`);

    // Execute the schema in a single transaction
    await client.query('BEGIN');
    
    try {
      await client.query(schemaSQL);
      await client.query('COMMIT');
      console.log('✅ Schema deployed successfully!');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Verify deployment by checking table count
    console.log('🔍 Verifying deployment...');
    const result = await client.query(`
      SELECT 
        COUNT(*) as table_count,
        string_agg(table_name, ', ') as tables
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log(`📊 Tables created: ${result.rows[0].table_count}`);
    console.log(`📋 Table names: ${result.rows[0].tables}`);

    // Check functions
    const functionsResult = await client.query(`
      SELECT COUNT(*) as function_count
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    console.log(`⚙️ Functions created: ${functionsResult.rows[0].function_count}`);

    console.log('🎉 Database schema deployment completed successfully!');

  } catch (error) {
    console.error('❌ Schema deployment failed:');
    console.error(error.message);
    
    if (error.position) {
      console.error(`SQL Error at position ${error.position}`);
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the deployment
if (require.main === module) {
  deploySchema().catch(console.error);
}

module.exports = { deploySchema }; 