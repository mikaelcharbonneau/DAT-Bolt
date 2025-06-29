const { Client } = require('pg');

async function checkDatabaseObjects() {
  const client = new Client({
    host: 'psql-dat-bolt-dev-61206194.postgres.database.azure.com',
    port: 5432,
    user: 'datboltadmin',
    password: 'DATBolt2024!SecureP@ssw0rd',
    database: 'dat_bolt_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\n📊 Tables:', tables.rows.length);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check enums/types
    const types = await client.query(`
      SELECT typname as type_name, typtype as type_type
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname
    `);
    console.log('\n🏷️ Custom Types:', types.rows.length);
    types.rows.forEach(row => console.log(`  - ${row.type_name} (${row.type_type})`));

    // Check functions
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `);
    console.log('\n⚙️ Functions:', functions.rows.length);
    functions.rows.forEach(row => console.log(`  - ${row.routine_name}`));

    // Check views
    const views = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\n👁️ Views:', views.rows.length);
    views.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabaseObjects().catch(console.error); 