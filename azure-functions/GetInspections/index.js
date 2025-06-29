/**
 * Azure Function: GetInspections (Simplified)
 * Retrieves audit reports - starting with mock data
 */

module.exports = async function (context, req) {
    context.log('GetInspections function started');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
            return;
        }

        // Return mock inspection data for now
        const mockInspections = [
            {
                Id: "1",
                UserEmail: "test@hpe.com",
                GeneratedBy: "System",
                Timestamp: new Date().toISOString(),
                datacenter: "DC1",
                datahall: "Hall A",
                issuesReported: 2,
                state: "Healthy",
                walkthroughId: "WT001",
                userFullName: "Test User"
            },
            {
                Id: "2", 
                UserEmail: "test@hpe.com",
                GeneratedBy: "System",
                Timestamp: new Date(Date.now() - 86400000).toISOString(),
                datacenter: "DC2",
                datahall: "Hall B", 
                issuesReported: 5,
                state: "Warning",
                walkthroughId: "WT002",
                userFullName: "Test User"
            }
        ];

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: mockInspections,
                pagination: {
                    page: 1,
                    limit: 20,
                    total: mockInspections.length
                },
                message: 'Inspections retrieved successfully (mock data)'
            })
        };

        context.log('GetInspections completed successfully');

    } catch (error) {
        context.log('Error in GetInspections:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to retrieve inspections',
                error: error.message
            })
        };
    }
};

