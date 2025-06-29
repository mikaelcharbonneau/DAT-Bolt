const { app } = require('@azure/functions');

async function testConnection(request, context) {
  context.log('🔍 Testing database connection in Azure Functions...');
  
  try {
    // Test environment variables
    context.log('📋 Environment variables:');
    context.log('- NODE_ENV:', process.env.NODE_ENV);
    context.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    context.log('- DB connection string exists:', !!process.env.AZURE_POSTGRESQL_CONNECTION_STRING);
    
    // Test basic pg connection
    const { Client } = require('pg');
    
    const connectionString = process.env.AZURE_POSTGRESQL_CONNECTION_STRING;
    context.log('🔗 Connection string (masked):', connectionString ? connectionString.substring(0, 30) + '...' : 'NOT FOUND');
    
    if (!connectionString) {
      return {
        status: 500,
        body: JSON.stringify({
          error: 'Database connection string not found',
          env: Object.keys(process.env).filter(key => key.includes('DB') || key.includes('POSTGRESQL'))
        })
      };
    }
    
    const client = new Client({
      connectionString: connectionString
    });
    
    context.log('🔌 Attempting database connection...');
    await client.connect();
    context.log('✅ Database connected successfully');
    
    // Test user query
    context.log('👤 Testing user query...');
    const result = await client.query('SELECT COUNT(*) as user_count FROM users');
    const userCount = result.rows[0].user_count;
    context.log(`📊 Users in database: ${userCount}`);
    
    // Test specific user
    const userResult = await client.query(
      'SELECT id, email, full_name, is_active FROM users WHERE email = $1',
      ['test@hpe.com']
    );
    
    context.log(`🔍 Test user found: ${userResult.rows.length > 0}`);
    if (userResult.rows.length > 0) {
      context.log('📋 User details:', JSON.stringify(userResult.rows[0]));
    }
    
    await client.end();
    context.log('🔌 Database connection closed');
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Database connection successful',
        userCount: parseInt(userCount),
        testUserExists: userResult.rows.length > 0,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasDbConnection: !!process.env.AZURE_POSTGRESQL_CONNECTION_STRING
        }
      })
    };
    
  } catch (error) {
    context.log('❌ Error in test connection:', error.message);
    context.log('🔍 Error details:', error);
    
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      })
    };
  }
}

// Register the function
app.http('TestConnection', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: testConnection
}); 