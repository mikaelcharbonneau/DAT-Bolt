/**
 * MinimalTest Azure Function - Premium Plan
 * Simple test function to verify Azure Functions runtime
 * Last deployment trigger: 2024-12-20
 */
const { app } = require('@azure/functions');

async function minimalTest(request, context) {
    context.log('MinimalTest function triggered on Premium Plan');
    
    try {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        // Simple response
        const response = {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                message: 'MinimalTest function is working on Premium Plan!',
                timestamp: new Date().toISOString(),
                functionName: 'MinimalTest',
                planType: 'Premium EP1'
            })
        };

        context.log('MinimalTest completed successfully on Premium Plan');
        return response;

    } catch (error) {
        context.log('Error in MinimalTest:', error);
        
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while processing the request'
            })
        };
    }
}

// Register the function
app.http('MinimalTest', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: minimalTest
});