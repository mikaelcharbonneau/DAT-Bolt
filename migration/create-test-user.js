const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function createTestUser() {
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

    // Check current user count
    const userCountResult = await client.query('SELECT COUNT(*) as user_count FROM users');
    const userCount = parseInt(userCountResult.rows[0].user_count);
    
    console.log(`👥 Current users in database: ${userCount}`);

    if (userCount === 0) {
      console.log('🔧 Creating test user...');
      
      // Hash password using bcryptjs (like the Azure Functions)
      const testPassword = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(testPassword, 12);
      
      // Create test user
      const userId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Fixed UUID for testing
      
      await client.query('BEGIN');
      
      try {
        // Insert user
        await client.query(`
          INSERT INTO users (id, email, encrypted_password, full_name, is_active, created_at, email_confirmed_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [userId, 'test@hpe.com', hashedPassword, 'Test User', true]);
        
        // Create user profile
        await client.query(`
          INSERT INTO user_profiles (user_id, full_name, department)
          VALUES ($1, $2, $3)
        `, [userId, 'Test User', 'Data Center Operations']);
        
        // Initialize user stats
        await client.query(`
          INSERT INTO user_stats (user_id)
          VALUES ($1)
        `, [userId]);
        
        await client.query('COMMIT');
        
        console.log('✅ Test user created successfully!');
        console.log('📧 Email: test@hpe.com');
        console.log('🔑 Password: TestPassword123!');
        console.log('🆔 User ID:', userId);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
      
    } else {
      console.log('✅ Users already exist in database');
      
      // Show existing users
      const usersResult = await client.query('SELECT id, email, full_name, is_active FROM users LIMIT 5');
      console.log('👥 Existing users:');
      usersResult.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.full_name}) - ${user.is_active ? 'Active' : 'Inactive'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestUser().catch(console.error); 