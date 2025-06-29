/**
 * GetInspections Azure Function - Traditional Model
 * Returns mock inspection data for testing
 */
module.exports = async function (context, req) {
    context.log('GetInspections function triggered');
    
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

        context.res = {
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

    } catch (error) {
        context.log('Error in GetInspections:', error);
        
        context.res = {
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
};

