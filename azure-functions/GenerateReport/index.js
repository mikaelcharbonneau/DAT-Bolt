/**
 * GenerateReport Azure Function - Traditional Model
 * Handles both GET (retrieve report by ID) and POST (generate new report) requests
 */
module.exports = async function (context, req) {
    context.log('GenerateReport function triggered');

  try {
    // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
            return;
        }

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        };

        if (req.method === 'GET') {
            // Mock GET request - retrieve report by ID
            const reportId = req.query.id || 'mock-report-id';
            
            const mockReport = {
                id: reportId,
                title: 'Data Center Health Report - Mock',
                generatedBy: {
                    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                    name: 'Test User',
                    email: 'test@hpe.com'
                },
                generatedAt: new Date().toISOString(),
                dateRange: {
                    start: '2024-01-01T00:00:00Z',
                    end: '2024-01-31T23:59:59Z'
                },
                filters: {
                    datacenter: 'DC-001',
                    datahall: 'Hall-A'
                },
                status: 'published',
                totalIncidents: 5,
                summary: {
                    totalAudits: 25,
                    totalIncidents: 5,
                    healthyAudits: 18,
                    warningAudits: 5,
                    criticalAudits: 2,
                    openIncidents: 2,
                    resolvedIncidents: 3
                },
                analytics: {
                    healthyPercentage: 72.0,
                    avgIssuesPerAudit: 1.2,
                    trends: {
                        criticalChange: -1,
                        totalChange: 3
                    }
                }
            };

            context.res = {
                status: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: mockReport,
                    message: 'Report retrieved successfully'
                })
            };
            return;
        }

        if (req.method === 'POST') {
            // Mock POST request - generate new report
            let requestData = {};
            try {
                requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
            } catch (parseError) {
                context.log('JSON parse error:', parseError);
                requestData = {};
            }

            const mockGeneratedReport = {
                reportId: `report-${Date.now()}`,
                generatedAt: new Date().toISOString(),
                title: requestData.title || 'Generated Report - Mock',
                summary: {
                    totalAudits: 25,
                    totalIncidents: 5,
                    healthyPercentage: 72.0,
                    criticalAudits: 2,
                    openIncidents: 2
                },
                analytics: {
                    performance: {
                        totalAudits: 25,
                        healthyPercentage: 72.0,
                        avgIssuesPerAudit: 1.2
                    },
                    trends: {
                        currentPeriod: { total: 25, critical: 2, warning: 5, healthy: 18 },
                        previousPeriod: { total: 22, critical: 3, warning: 4, healthy: 15 },
                        changes: { totalChange: 3, criticalChange: -1 }
                    }
                }
            };

            context.res = {
                status: 201,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    data: mockGeneratedReport,
                    message: 'Report generated successfully'
                })
            };
            return;
        }

        // Method not allowed
        context.res = {
            status: 405,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Method not allowed',
                message: 'Only GET and POST methods are supported'
            })
        };

    } catch (error) {
        context.log('Error in GenerateReport function:', error);
        
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