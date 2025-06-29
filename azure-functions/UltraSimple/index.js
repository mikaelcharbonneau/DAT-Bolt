const { app } = require('@azure/functions');

async function ultraSimple(request, context) {
    context.log('UltraSimple function started');
    
    const response = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            message: "Hello World from Azure Functions!",
            timestamp: new Date().toISOString()
        })
    };
    
    context.log('UltraSimple function completed');
    return response;
}

// Register the function
app.http('UltraSimple', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: ultraSimple
}); 