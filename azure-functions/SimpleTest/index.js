module.exports = async function (context, req) {
    context.log('🧪 Simple test function executed');
    
    try {
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                message: 'Simple test function working',
                timestamp: new Date().toISOString(),
                environment: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    hasConnectionString: !!process.env.AZURE_POSTGRESQL_CONNECTION_STRING,
                    hasJwtSecret: !!process.env.JWT_SECRET
                }
            }
        };
    } catch (error) {
        context.log('❌ Error in simple test:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: false,
                error: error.message
            }
        };
    }
}; 