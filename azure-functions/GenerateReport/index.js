const { app } = require('@azure/functions');
const { database } = require('../shared/database');
const { authService } = require('../shared/auth');
const { validationService, schemas } = require('../shared/validation');
const { responseService } = require('../shared/response');
const { v4: uuidv4 } = require('uuid');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');

/**
 * Azure Function: GenerateReport
 * Generates reports from inspection and incident data
 * 
 * GET /api/GenerateReport?id={reportId} - Get existing report by ID
 * POST /api/GenerateReport - Generate new report
 * 
 * POST Request Body:
 * {
 *   "title": "Weekly Audit Report",
 *   "dateRangeStart": "2024-01-01T00:00:00Z",
 *   "dateRangeEnd": "2024-01-07T23:59:59Z",
 *   "datacenter": "DC-East-01",
 *   "datahall": "DH-01",
 *   "includeIncidents": true,
 *   "includeAudits": true
 * }
 */

async function generateReport(request, context) {
  const logResponse = responseService.logRequest(context, request);

  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      const corsResponse = responseService.cors();
      logResponse(corsResponse);
      return corsResponse;
    }

    // Validate authentication
    const authResult = await authService.requireAuth(request);
    if (!authResult.success) {
      const response = responseService.unauthorized(authResult.message);
      logResponse(response);
      return response;
    }

    let response;

    if (request.method === 'GET') {
      response = await handleGetReport(request, authResult.user);
    } else if (request.method === 'POST') {
      response = await handleGenerateReport(request, authResult.user);
    } else {
      response = responseService.badRequest('Method not supported');
    }

    logResponse(response);
    return responseService.setCorsHeaders(response);

  } catch (error) {
    console.error('Error in GenerateReport:', error);
    const response = responseService.internalServerError('Failed to process report request');
    logResponse(response);
    return responseService.setCorsHeaders(response);
  }
}

async function handleGetReport(request, user) {
  const reportId = request.query.id;

  if (!reportId) {
    return responseService.badRequest('Report ID is required');
  }

  // Validate UUID format
  const uuidValidation = validationService.validate({ id: reportId }, { id: schemas.uuidParam });
  if (!uuidValidation.success) {
    return responseService.badRequest('Invalid report ID format');
  }

  try {
    // Get report by ID
    const result = await database.query(
      `SELECT r.*, u.full_name as generated_by_name, u.email as generated_by_email
       FROM reports r
       LEFT JOIN users u ON r.generated_by = u.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return responseService.notFound('Report not found');
    }

    const report = result.rows[0];
    const transformedReport = transformReportForResponse(report);

    return responseService.success(transformedReport, 'Report retrieved successfully');

  } catch (error) {
    console.error('Error retrieving report:', error);
    return responseService.internalServerError('Failed to retrieve report');
  }
}

async function handleGenerateReport(request, user) {
  // Validate request body
  const validation = validationService.validateRequest(request, schemas.reportGeneration, 'body');
  if (!validation.success) {
    return responseService.validationError(validation.errors);
  }

  const reportData = validation.data;

  try {
    // Generate report in a transaction
    const result = await database.transaction(async (client) => {
      // Collect data for the report
      const reportContent = await collectReportData(client, reportData);

      // Create the report record
      const reportId = uuidv4();
      const reportResult = await client.query(
        `INSERT INTO reports (
          id, title, generated_by, generated_at, date_range_start, date_range_end,
          datacenter, datahall, status, total_incidents, report_data
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, generated_at`,
        [
          reportId,
          reportData.title,
          user.id,
          reportData.dateRangeStart,
          reportData.dateRangeEnd,
          reportData.datacenter || null,
          reportData.datahall || null,
          'published',
          reportContent.incidents.length,
          JSON.stringify(reportContent)
        ]
      );

      // Log user activity
      await client.query(
        `SELECT log_user_activity($1, $2, $3)`,
        [
          user.id,
          'report',
          `Generated report: ${reportData.title}`
        ]
      );

      return {
        reportId: reportResult.rows[0].id,
        generatedAt: reportResult.rows[0].generated_at,
        reportContent
      };
    });

    return responseService.created(
      {
        reportId: result.reportId,
        generatedAt: result.generatedAt,
        title: reportData.title,
        summary: generateReportSummary(result.reportContent)
      },
      'Report generated successfully'
    );

  } catch (error) {
    console.error('Error generating report:', error);
    return responseService.internalServerError('Failed to generate report');
  }
}

async function collectReportData(client, reportParams) {
  const { dateRangeStart, dateRangeEnd, datacenter, datahall, includeIncidents, includeAudits } = reportParams;

  const reportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      dateRange: { start: dateRangeStart, end: dateRangeEnd },
      filters: { datacenter, datahall }
    },
    summary: {},
    audits: [],
    incidents: [],
    analytics: {}
  };

  // Collect audit data
  if (includeAudits) {
    const auditQuery = buildAuditQuery(dateRangeStart, dateRangeEnd, datacenter, datahall);
    const auditResult = await client.query(auditQuery.query, auditQuery.params);
    reportData.audits = auditResult.rows;
  }

  // Collect incident data
  if (includeIncidents) {
    const incidentQuery = buildIncidentQuery(dateRangeStart, dateRangeEnd, datacenter, datahall);
    const incidentResult = await client.query(incidentQuery.query, incidentQuery.params);
    reportData.incidents = incidentResult.rows;
  }

  // Generate analytics
  reportData.analytics = await generateAnalytics(client, reportData, reportParams);

  // Generate summary
  reportData.summary = {
    totalAudits: reportData.audits.length,
    totalIncidents: reportData.incidents.length,
    healthyAudits: reportData.audits.filter(a => a.state === 'Healthy').length,
    warningAudits: reportData.audits.filter(a => a.state === 'Warning').length,
    criticalAudits: reportData.audits.filter(a => a.state === 'Critical').length,
    openIncidents: reportData.incidents.filter(i => i.status === 'open').length,
    resolvedIncidents: reportData.incidents.filter(i => i.status === 'resolved').length
  };

  return reportData;
}

function buildAuditQuery(startDate, endDate, datacenter, datahall) {
  let whereClause = 'WHERE "Timestamp" >= $1 AND "Timestamp" <= $2';
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (datacenter) {
    whereClause += ` AND "datacenter" = $${paramIndex}`;
    params.push(datacenter);
    paramIndex++;
  }

  if (datahall) {
    whereClause += ` AND "datahall" = $${paramIndex}`;
    params.push(datahall);
    paramIndex++;
  }

  const query = `
    SELECT 
      "Id", "UserEmail", "Timestamp", "datacenter", "datahall",
      "issues_reported", "state", "walkthrough_id", "user_full_name", "ReportData"
    FROM "AuditReports"
    ${whereClause}
    ORDER BY "Timestamp" DESC
  `;

  return { query, params };
}

function buildIncidentQuery(startDate, endDate, datacenter, datahall) {
  let whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
  const params = [startDate, endDate];
  let paramIndex = 3;

  if (datacenter) {
    whereClause += ` AND location = $${paramIndex}`;
    params.push(datacenter);
    paramIndex++;
  }

  if (datahall) {
    whereClause += ` AND datahall = $${paramIndex}`;
    params.push(datahall);
    paramIndex++;
  }

  const query = `
    SELECT 
      i.id, i.location, i.datahall, i.description, i.severity, i.status,
      i.created_at, i.updated_at, u.full_name as user_name, u.email as user_email
    FROM incidents i
    LEFT JOIN users u ON i.user_id = u.id
    ${whereClause}
    ORDER BY i.created_at DESC
  `;

  return { query, params };
}

async function generateAnalytics(client, reportData, reportParams) {
  const analytics = {};

  try {
    // Trend analysis
    analytics.trends = await generateTrendAnalysis(client, reportParams);

    // Location analysis
    analytics.locationStats = generateLocationStats(reportData.audits, reportData.incidents);

    // User activity analysis
    analytics.userActivity = generateUserActivityStats(reportData.audits);

    // Issue analysis
    analytics.issueAnalysis = generateIssueAnalysis(reportData.incidents);

    // Performance metrics
    analytics.performance = generatePerformanceMetrics(reportData.audits);

  } catch (error) {
    console.error('Error generating analytics:', error);
    analytics.error = 'Failed to generate some analytics';
  }

  return analytics;
}

async function generateTrendAnalysis(client, reportParams) {
  // Compare with previous period
  const periodLength = new Date(reportParams.dateRangeEnd) - new Date(reportParams.dateRangeStart);
  const previousStart = new Date(new Date(reportParams.dateRangeStart) - periodLength);
  const previousEnd = new Date(reportParams.dateRangeStart);

  const currentPeriodQuery = buildAuditQuery(reportParams.dateRangeStart, reportParams.dateRangeEnd, reportParams.datacenter, reportParams.datahall);
  const previousPeriodQuery = buildAuditQuery(previousStart, previousEnd, reportParams.datacenter, reportParams.datahall);

  const [currentResult, previousResult] = await Promise.all([
    client.query(currentPeriodQuery.query, currentPeriodQuery.params),
    client.query(previousPeriodQuery.query, previousPeriodQuery.params)
  ]);

  const currentCritical = currentResult.rows.filter(r => r.state === 'Critical').length;
  const previousCritical = previousResult.rows.filter(r => r.state === 'Critical').length;

  return {
    currentPeriod: {
      total: currentResult.rows.length,
      critical: currentCritical,
      warning: currentResult.rows.filter(r => r.state === 'Warning').length,
      healthy: currentResult.rows.filter(r => r.state === 'Healthy').length
    },
    previousPeriod: {
      total: previousResult.rows.length,
      critical: previousCritical,
      warning: previousResult.rows.filter(r => r.state === 'Warning').length,
      healthy: previousResult.rows.filter(r => r.state === 'Healthy').length
    },
    changes: {
      totalChange: currentResult.rows.length - previousResult.rows.length,
      criticalChange: currentCritical - previousCritical
    }
  };
}

function generateLocationStats(audits, incidents) {
  const stats = {};

  // Group by datacenter
  audits.forEach(audit => {
    const dc = audit.datacenter;
    if (!stats[dc]) {
      stats[dc] = { audits: 0, incidents: 0, critical: 0, warning: 0, healthy: 0 };
    }
    stats[dc].audits++;
    stats[dc][audit.state.toLowerCase()]++;
  });

  incidents.forEach(incident => {
    const dc = incident.location;
    if (stats[dc]) {
      stats[dc].incidents++;
    }
  });

  return stats;
}

function generateUserActivityStats(audits) {
  const userStats = {};

  audits.forEach(audit => {
    const user = audit.user_full_name || audit.UserEmail;
    if (!userStats[user]) {
      userStats[user] = { total: 0, critical: 0, warning: 0, healthy: 0 };
    }
    userStats[user].total++;
    userStats[user][audit.state.toLowerCase()]++;
  });

  return userStats;
}

function generateIssueAnalysis(incidents) {
  const severityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  const statusCount = { open: 0, 'in-progress': 0, resolved: 0 };

  incidents.forEach(incident => {
    severityCount[incident.severity]++;
    statusCount[incident.status]++;
  });

  return { severityCount, statusCount };
}

function generatePerformanceMetrics(audits) {
  const totalAudits = audits.length;
  const healthyPercentage = totalAudits > 0 ? (audits.filter(a => a.state === 'Healthy').length / totalAudits) * 100 : 0;
  const avgIssuesPerAudit = totalAudits > 0 ? audits.reduce((sum, a) => sum + (a.issues_reported || 0), 0) / totalAudits : 0;

  return {
    totalAudits,
    healthyPercentage: Math.round(healthyPercentage * 100) / 100,
    avgIssuesPerAudit: Math.round(avgIssuesPerAudit * 100) / 100
  };
}

function generateReportSummary(reportContent) {
  return {
    totalAudits: reportContent.summary.totalAudits,
    totalIncidents: reportContent.summary.totalIncidents,
    healthyPercentage: reportContent.analytics.performance?.healthyPercentage || 0,
    criticalAudits: reportContent.summary.criticalAudits,
    openIncidents: reportContent.summary.openIncidents
  };
}

function transformReportForResponse(report) {
  return {
    id: report.id,
    title: report.title,
    generatedBy: {
      id: report.generated_by,
      name: report.generated_by_name,
      email: report.generated_by_email
    },
    generatedAt: report.generated_at,
    dateRange: {
      start: report.date_range_start,
      end: report.date_range_end
    },
    filters: {
      datacenter: report.datacenter,
      datahall: report.datahall
    },
    status: report.status,
    totalIncidents: report.total_incidents,
    reportData: report.report_data
  };
}

// Register the function
app.http('GenerateReport', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'function',
  handler: generateReport
});

module.exports = generateReport;