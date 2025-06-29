const { v4: uuidv4 } = require('uuid');

/**
 * Azure Function: SubmitInspection (Simplified)
 * Submits a new inspection/audit report - starting with mock success response
 */

module.exports = async function (context, req) {
    context.log('SubmitInspection function started');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
            return;
        }

        // Get the request body
        let inspectionData;
        try {
            inspectionData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (parseError) {
            context.res = {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid JSON in request body'
                })
            };
            return;
        }

        // Generate a mock inspection ID
        const inspectionId = uuidv4();
        const timestamp = new Date().toISOString();

        // Mock success response
        context.res = {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: {
                    inspectionId: inspectionId,
                    timestamp: timestamp,
                    walkthroughId: inspectionData?.walkthroughId || 'MOCK-001',
                    datacenter: inspectionData?.datacenter || 'Unknown',
                    datahall: inspectionData?.datahall || 'Unknown',
                    state: inspectionData?.state || 'Healthy'
                },
                message: 'Inspection submitted successfully (mock data)'
            })
        };

        context.log('SubmitInspection completed successfully');

    } catch (error) {
        context.log('Error in SubmitInspection:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to submit inspection',
                error: error.message
            })
        };
    }
};