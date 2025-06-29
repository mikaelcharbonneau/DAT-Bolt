/**
 * SubmitInspection Azure Function - Traditional Model
 * Accepts inspection data and returns mock success response
 */
const { app } = require('@azure/functions');

async function submitInspection(request, context) {
    context.log('SubmitInspection function triggered');
    
    try {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
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
            const body = await request.text();
            inspectionData = body ? JSON.parse(body) : {};
        } catch (parseError) {
            context.log('JSON parse error:', parseError);
            return {
                status: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: 'Invalid JSON',
                    message: 'Request body must be valid JSON'
                })
            };
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

        const response = {
            status: 201,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: mockResponse,
                message: 'Inspection submitted successfully (mock data)'
            })
        };

        context.log('SubmitInspection completed successfully');
        return response;

    } catch (error) {
        context.log('Error in SubmitInspection:', error);
        
        return {
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
}

// Register the function
app.http('SubmitInspection', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: submitInspection
});