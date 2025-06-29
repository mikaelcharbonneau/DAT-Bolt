const { app } = require('@azure/functions');

app.http('SimpleTest', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: "Hello from Azure Functions v4!",
                timestamp: new Date().toISOString(),
                method: request.method,
                url: request.url
            })
        };
    }
}); 