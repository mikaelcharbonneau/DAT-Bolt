/**
 * MinimalTest Azure Function - Premium Plan
 * Simple test function to verify Azure Functions runtime
 * Last deployment trigger: 2024-12-20
 */
module.exports = async function (context, req) {
    context.log('MinimalTest function triggered on Premium Plan');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
            return;
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        // Simple response
        context.res = {
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

    } catch (error) {
        context.log('Error in MinimalTest:', error);
        
        context.res = {
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
};