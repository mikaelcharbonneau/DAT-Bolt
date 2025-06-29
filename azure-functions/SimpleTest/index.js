const { app } = require('@azure/functions');

async function simpleTest(request, context) {
    context.log('SimpleTest function triggered');
    
    // Create response
    const response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            message: "Azure Functions is working!",
            timestamp: new Date().toISOString(),
            method: request.method,
            environment: {
                nodeVersion: process.version,
                platform: process.platform
            }
        })
    };
    
    context.log('Response created:', response);
    return response;
}

// Register the function
app.http('SimpleTest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: simpleTest
}); 