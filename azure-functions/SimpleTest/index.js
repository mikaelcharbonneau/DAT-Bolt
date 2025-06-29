module.exports = async function (context, req) {
    context.log('SimpleTest function triggered');
    
    // Try explicit response setting
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            success: true,
            message: "Azure Functions is working!",
            timestamp: new Date().toISOString(),
            method: req.method,
            environment: {
                nodeVersion: process.version,
                platform: process.platform
            }
        })
    };
    
    context.log('Response set:', context.res);
}; 