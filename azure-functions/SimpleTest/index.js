const { app } = require('@azure/functions');

async function simpleTest(request, context) {
  context.log('🧪 Simple test function executed');
  
  try {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'Simple test function working',
        timestamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          hasConnectionString: !!process.env.AZURE_POSTGRESQL_CONNECTION_STRING,
          hasJwtSecret: !!process.env.JWT_SECRET,
          allEnvKeys: Object.keys(process.env).filter(key => 
            key.includes('AZURE') || key.includes('DB') || key.includes('JWT')
          )
        }
      })
    };
  } catch (error) {
    context.log('❌ Error in simple test:', error);
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}

// Register the function
app.http('SimpleTest', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: simpleTest
}); 