const https = require('https');
const jwt = require('jsonwebtoken');

// Configuration
const API_BASE_URL = 'https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net/api';
const TEST_USER = {
  email: 'test@hpe.com',
  password: 'TestPassword123!'
};

// JWT secret from our Azure Functions configuration
const JWT_SECRET = 'change-this-jwt-secret-in-production';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function generateTestToken() {
  // Generate a JWT token for our test user
  const payload = {
    userId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    email: 'test@hpe.com',
    fullName: 'Test User',
    iat: Math.floor(Date.now() / 1000)
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
  console.log('🎫 Generated JWT token:', token.substring(0, 50) + '...');
  return token;
}

async function testAPIs() {
  console.log('🧪 Testing Azure Functions APIs...');
  console.log(`🔗 Base URL: ${API_BASE_URL}`);
  
  try {
    // Generate JWT token
    const authToken = await generateTestToken();
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };

    console.log('\n1️⃣ Testing GetInspections API...');
    const inspectionsResponse = await makeRequest(`${API_BASE_URL}/getinspections?limit=5`, {
      method: 'GET',
      headers
    });
    
    console.log(`   Status: ${inspectionsResponse.statusCode}`);
    if (inspectionsResponse.statusCode === 200) {
      console.log('   ✅ GetInspections API working!');
      console.log(`   📊 Response: ${JSON.stringify(inspectionsResponse.body, null, 2)}`);
    } else {
      console.log('   ❌ GetInspections failed');
      console.log(`   📄 Response: ${JSON.stringify(inspectionsResponse.body, null, 2)}`);
    }

    console.log('\n2️⃣ Testing SubmitInspection API...');
    const submitResponse = await makeRequest(`${API_BASE_URL}/submitinspection`, {
      method: 'POST',
      headers,
      body: {
        UserEmail: 'test@hpe.com',
        datacenter: 'DC-TEST',
        datahall: 'DH-A01',
        state: 'Healthy',
        walkthrough_id: 'TEST-001',
        issues_reported: 0,
        ReportData: {
          timestamp: new Date().toISOString(),
          summary: 'Test inspection via API',
          details: 'This is a test inspection to verify the API is working'
        }
      }
    });
    
    console.log(`   Status: ${submitResponse.statusCode}`);
    if (submitResponse.statusCode === 200 || submitResponse.statusCode === 201) {
      console.log('   ✅ SubmitInspection API working!');
      console.log(`   📊 Response: ${JSON.stringify(submitResponse.body, null, 2)}`);
    } else {
      console.log('   ❌ SubmitInspection failed');
      console.log(`   📄 Response: ${JSON.stringify(submitResponse.body, null, 2)}`);
    }

    console.log('\n3️⃣ Testing GenerateReport API...');
    const reportResponse = await makeRequest(`${API_BASE_URL}/generatereport`, {
      method: 'POST',
      headers,
      body: {
        title: 'Test Report',
        dateRangeStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        dateRangeEnd: new Date().toISOString(),
        datacenter: 'DC-TEST'
      }
    });
    
    console.log(`   Status: ${reportResponse.statusCode}`);
    if (reportResponse.statusCode === 200 || reportResponse.statusCode === 201) {
      console.log('   ✅ GenerateReport API working!');
      console.log(`   📊 Response: ${JSON.stringify(reportResponse.body, null, 2)}`);
    } else {
      console.log('   ❌ GenerateReport failed');
      console.log(`   📄 Response: ${JSON.stringify(reportResponse.body, null, 2)}`);
    }

    console.log('\n🎉 API Testing Complete!');
    
  } catch (error) {
    if (error.code === 'ENETUNREACH' || error.code === 'EAI_AGAIN') {
      console.error('❌ Network unreachable. This environment may block outbound connections.');
    } else {
      console.error('❌ API Testing failed:', error.message);
    }
  }
}

// Run the tests
if (require.main === module) {
  testAPIs().catch(console.error);
}

module.exports = { testAPIs, generateTestToken }; 
