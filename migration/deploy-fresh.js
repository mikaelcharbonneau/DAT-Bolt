#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function deployFreshSchema() {
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

    console.log('🧹 Cleaning up existing objects...');
    
    // Begin transaction for cleanup
    await client.query('BEGIN');
    
    try {
      // Drop existing objects in reverse dependency order
      console.log('  - Dropping views...');
      await client.query('DROP VIEW IF EXISTS user_dashboard CASCADE');
      
      console.log('  - Dropping functions...');
      await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
      await client.query('DROP FUNCTION IF EXISTS upsert_user_profile(uuid, text, text, text, text) CASCADE');
      await client.query('DROP FUNCTION IF EXISTS log_user_activity(uuid, activity_type, text) CASCADE');
      
      console.log('  - Dropping tables...');
      await client.query('DROP TABLE IF EXISTS reports CASCADE');
      await client.query('DROP TABLE IF EXISTS incidents CASCADE');
      await client.query('DROP TABLE IF EXISTS "AuditReports" CASCADE');
      await client.query('DROP TABLE IF EXISTS user_stats CASCADE');
      await client.query('DROP TABLE IF EXISTS user_activities CASCADE');
      await client.query('DROP TABLE IF EXISTS user_profiles CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      
      console.log('  - Dropping types...');
      await client.query('DROP TYPE IF EXISTS incident_status CASCADE');
      await client.query('DROP TYPE IF EXISTS incident_severity CASCADE');
      await client.query('DROP TYPE IF EXISTS activity_type CASCADE');
      
      await client.query('COMMIT');
      console.log('✅ Cleanup completed successfully!');
      
    } catch (cleanupError) {
      await client.query('ROLLBACK');
      console.log('⚠️ Cleanup had issues, but continuing with deployment...');
      console.log('   Error:', cleanupError.message);
    }

    console.log('📖 Reading schema file...');
    const schemaPath = path.join(__dirname, 'azure-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing fresh schema deployment...');
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

    // Verify deployment
    console.log('🔍 Verifying deployment...');
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`📊 Tables created: ${tables.rows.length}`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    const types = await client.query(`
      SELECT typname as type_name
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname
    `);
    
    console.log(`🏷️ Enum types created: ${types.rows.length}`);
    types.rows.forEach(row => console.log(`  - ${row.type_name}`));

    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);
    
    console.log(`⚙️ Functions created: ${functions.rows.length}`);
    functions.rows.forEach(row => console.log(`  - ${row.routine_name}`));

    console.log('\n🎉 Database schema deployment completed successfully!');
    console.log('💡 Next steps:');
    console.log('   1. Deploy Azure Functions API');
    console.log('   2. Configure frontend to use Azure endpoints');
    console.log('   3. Test the complete application');

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
  deployFreshSchema().catch(console.error);
}

module.exports = { deployFreshSchema }; 