const jwt = require('jsonwebtoken');
const https = require('https');

// Test JWT generation and verification locally
const JWT_SECRET = 'change-this-jwt-secret-in-production';

function makeHttpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          text: () => Promise.resolve(data)
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function debugAuth() {
  console.log('🔍 Debugging Authentication...');
  
  try {
    // Step 1: Generate JWT token
    console.log('\n1️⃣ Testing JWT Token Generation...');
    const payload = {
      userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      email: 'test@hpe.com',
      fullName: 'Test User',
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
    console.log('   ✅ Token generated:', token.substring(0, 50) + '...');
    
    // Step 2: Verify JWT token
    console.log('\n2️⃣ Testing JWT Token Verification...');
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('   ✅ Token verified successfully');
      console.log('   📋 Decoded payload:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.log('   ❌ Token verification failed:', error.message);
      return;
    }

    // Step 3: Test API call with just CORS
    console.log('\n3️⃣ Testing CORS preflight...');
    const corsResponse = await makeHttpsRequest('https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net/api/getinspections', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type'
      }
    });
    
    console.log(`   Status: ${corsResponse.status}`);
    console.log(`   Headers:`, corsResponse.headers);

    // Step 4: Test with Authorization header
    console.log('\n4️⃣ Testing API with Authorization header...');
    const apiResponse = await makeHttpsRequest('https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net/api/getinspections?limit=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`   Status: ${apiResponse.status}`);
    const responseText = await apiResponse.text();
    console.log(`   Response: ${responseText}`);

    // Step 5: Check if it's a database connection issue
    console.log('\n5️⃣ Testing Database Connection from Local...');
    const { Client } = require('pg');
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
      
      // Test if user exists
      const userResult = await client.query(
        'SELECT id, email, full_name, is_active FROM users WHERE email = $1',
        ['test@hpe.com']
      );
      
      console.log('   ✅ Database connection successful');
      console.log(`   👤 User found: ${userResult.rows.length > 0 ? 'Yes' : 'No'}`);
      
      if (userResult.rows.length > 0) {
        console.log('   📋 User details:', JSON.stringify(userResult.rows[0], null, 2));
      }
      
      await client.end();
      
    } catch (dbError) {
      console.log('   ❌ Database connection failed:', dbError.message);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAuth().catch(console.error); 