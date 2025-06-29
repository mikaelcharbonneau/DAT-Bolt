/**
 * SubmitInspection Azure Function - Traditional Model
 * Accepts inspection data and returns mock success response
 */
module.exports = async function (context, req) {
    context.log('SubmitInspection function triggered');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
            return;
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        // Parse request body
        let inspectionData = {};
        try {
            inspectionData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        } catch (parseError) {
            context.log('JSON parse error:', parseError);
            context.res = {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON',
                    message: 'Request body must be valid JSON'
                })
            };
            return;
        }

        // Generate mock response
        const mockResponse = {
            inspectionId: `insp-${Date.now()}`,
            submittedAt: new Date().toISOString(),
            status: 'Submitted',
            datacenter: inspectionData.datacenter || 'Unknown',
            datahall: inspectionData.datahall || 'Unknown',
            inspector: inspectionData.user_full_name || 'Unknown',
            findings: inspectionData.findings || [],
            processingStatus: 'Queued for processing'
        };

        context.res = {
            status: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: mockResponse,
                message: 'Inspection submitted successfully (mock data)'
            })
        };

        context.log('SubmitInspection completed successfully');

    } catch (error) {
        context.log('Error in SubmitInspection:', error);
        
        context.res = {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while submitting the inspection'
            })
        };
    }
};