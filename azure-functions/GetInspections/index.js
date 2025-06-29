/**
 * GetInspections Azure Function - Traditional Model
 * Returns mock inspection data for testing
 */
const { app } = require('@azure/functions');

async function getInspections(request, context) {
    context.log('GetInspections function triggered');
    
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

        // Mock inspection data
        const mockInspections = [
            {
                id: 'insp-001',
                datacenter: 'DC-001',
                datahall: 'Hall-A',
                inspector: 'Test User',
                inspection_date: new Date().toISOString(),
                status: 'Completed',
                findings: ['Temperature OK', 'Security Systems Active'],
                issues_count: 0,
                state: 'Healthy'
            },
            {
                id: 'insp-002',
                datacenter: 'DC-001', 
                datahall: 'Hall-B',
                inspector: 'Test User',
                inspection_date: new Date(Date.now() - 24*60*60*1000).toISOString(),
                status: 'Completed',
                findings: ['Power fluctuation detected', 'HVAC system needs attention'],
                issues_count: 2,
                state: 'Warning'
            }
        ];

        const response = {
            status: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                success: true,
                data: mockInspections,
                message: 'Inspections retrieved successfully (mock data)',
                total: mockInspections.length
            })
        };

        context.log('GetInspections completed successfully');
        return response;

    } catch (error) {
        context.log('Error in GetInspections:', error);
        
        return {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: 'An error occurred while retrieving inspections'
            })
        };
    }
}

// Register the function
app.http('GetInspections', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: getInspections
});

