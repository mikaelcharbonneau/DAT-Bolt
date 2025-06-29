const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'psql-dat-bolt-dev-61206194.postgres.database.azure.com',
    port: 5432,
    user: 'datboltadmin',
    password: 'DATBolt2024!SecureP@ssw0rd',
    database: 'dat_bolt_db',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Attempting to connect to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT version()');
    console.log('Database version:', result.rows[0].version);
    
    const tablesResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Current tables in database:', tablesResult.rows[0].table_count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();