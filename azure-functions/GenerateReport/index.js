const { v4: uuidv4 } = require('uuid');

/**
 * Azure Function: GenerateReport (Simplified)
 * Generates reports from inspection and incident data - starting with mock data
 */

module.exports = async function (context, req) {
    context.log('GenerateReport function started');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            };
            return;
        }

        // Generate mock report data
        const reportId = uuidv4();
        const currentDate = new Date();
        const sevenDaysAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);

        const mockReport = {
            reportId: reportId,
            title: 'Weekly Audit Report',
            generatedAt: currentDate.toISOString(),
            dateRange: {
                start: sevenDaysAgo.toISOString(),
                end: currentDate.toISOString()
            },
            summary: {
                totalInspections: 24,
                totalIncidents: 3,
                criticalIssues: 1,
                warningIssues: 2,
                healthyInspections: 21
            },
            locations: [
                { datacenter: 'DC1', datahall: 'Hall A', inspections: 8, incidents: 1 },
                { datacenter: 'DC1', datahall: 'Hall B', inspections: 7, incidents: 0 },
                { datacenter: 'DC2', datahall: 'Hall A', inspections: 9, incidents: 2 }
            ],
            trends: {
                improvementRate: 15.5,
                averageResponseTime: '2.3 hours',
                topIssues: ['Temperature Control', 'Security Access', 'Power Systems']
            }
        };

        if (req.method === 'GET') {
            // Handle GET request - return existing report
            const requestedId = req.query.id;
            if (requestedId) {
                mockReport.reportId = requestedId;
                mockReport.title = 'Existing Report';
            }
        } else if (req.method === 'POST') {
            // Handle POST request - generate new report
            let requestData;
            try {
                requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
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

            if (requestData?.title) {
                mockReport.title = requestData.title;
            }
            if (requestData?.dateRangeStart && requestData?.dateRangeEnd) {
                mockReport.dateRange = {
                    start: requestData.dateRangeStart,
                    end: requestData.dateRangeEnd
                };
            }
        }

        context.res = {
            status: req.method === 'POST' ? 201 : 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                data: mockReport,
                message: `Report ${req.method === 'POST' ? 'generated' : 'retrieved'} successfully (mock data)`
            })
        };

        context.log('GenerateReport completed successfully');

    } catch (error) {
        context.log('Error in GenerateReport:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to process report request',
                error: error.message
            })
        };
    }
};