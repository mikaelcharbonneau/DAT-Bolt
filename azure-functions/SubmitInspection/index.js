const { app } = require('@azure/functions');
const { database } = require('../shared/database');
const { authService } = require('../shared/auth');
const { validationService, schemas } = require('../shared/validation');
const { responseService } = require('../shared/response');
const { v4: uuidv4 } = require('uuid');

/**
 * Azure Function: SubmitInspection
 * Submits a new inspection/audit report
 * 
 * Request Body:
 * {
 *   "userEmail": "user@company.com",
 *   "reportData": {
 *     "datahall": "DH-01",
 *     "status": "Healthy",
 *     "isUrgent": false,
 *     "temperatureReading": "72F",
 *     "humidityReading": "45%",
 *     "comments": "All systems operational",
 *     "securityPassed": true,
 *     "coolingSystemCheck": true
 *   },
 *   "datacenter": "DC-East-01",
 *   "datahall": "DH-01",
 *   "issuesReported": 0,
 *   "state": "Healthy",
 *   "walkthroughId": 1001,
 *   "userFullName": "John Doe"
 * }
 */

async function submitInspection(request, context) {
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

    // Validate request body
    const validation = validationService.validateRequest(request, schemas.inspectionSubmission, 'body');
    if (!validation.success) {
      const response = responseService.validationError(validation.errors);
      logResponse(response);
      return response;
    }

    const inspectionData = validation.data;

    // Additional business logic validation
    const businessValidation = await validateBusinessRules(inspectionData, authResult.user);
    if (!businessValidation.success) {
      const response = responseService.badRequest(businessValidation.message, businessValidation.details);
      logResponse(response);
      return response;
    }

    // Submit inspection in a transaction
    const result = await database.transaction(async (client) => {
      // Insert audit report
      const inspectionId = uuidv4();
      const auditResult = await client.query(
        `INSERT INTO "AuditReports" (
          "Id", "UserEmail", "GeneratedBy", "Timestamp", "datacenter", 
          "datahall", "issues_reported", "state", "walkthrough_id", 
          "user_full_name", "ReportData"
        ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10)
        RETURNING "Id", "Timestamp"`,
        [
          inspectionId,
          inspectionData.userEmail,
          authResult.user.email,
          inspectionData.datacenter,
          inspectionData.datahall,
          inspectionData.issuesReported,
          inspectionData.state,
          inspectionData.walkthroughId,
          inspectionData.userFullName,
          JSON.stringify(inspectionData.reportData)
        ]
      );

      const insertedReport = auditResult.rows[0];

      // Log user activity
      await client.query(
        `SELECT log_user_activity($1, $2, $3)`,
        [
          authResult.user.id,
          'inspection',
          `Completed inspection for ${inspectionData.datacenter}/${inspectionData.datahall} - Status: ${inspectionData.state}`
        ]
      );

      // Create incidents if any issues were reported
      if (inspectionData.issuesReported > 0 && inspectionData.reportData.comments) {
        await createIncidentsFromInspection(client, inspectionData, authResult.user, insertedReport.Id);
      }

      // Send notification if critical
      if (inspectionData.state === 'Critical') {
        await sendCriticalInspectionNotification(inspectionData, authResult.user);
      }

      return {
        inspectionId: insertedReport.Id,
        timestamp: insertedReport.Timestamp,
        walkthroughId: inspectionData.walkthroughId
      };
    });

    const response = responseService.created(
      {
        inspectionId: result.inspectionId,
        timestamp: result.timestamp,
        walkthroughId: result.walkthroughId,
        message: 'Inspection submitted successfully'
      },
      'Inspection submitted successfully'
    );

    logResponse(response);
    return responseService.setCorsHeaders(response);

  } catch (error) {
    console.error('Error in SubmitInspection:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique violation
      const response = responseService.conflict('Inspection with this walkthrough ID already exists');
      logResponse(response);
      return responseService.setCorsHeaders(response);
    }

    const response = responseService.internalServerError('Failed to submit inspection');
    logResponse(response);
    return responseService.setCorsHeaders(response);
  }
}

async function validateBusinessRules(inspectionData, user) {
  try {
    // Check if walkthrough ID is already used
    const existingInspection = await database.query(
      'SELECT "Id" FROM "AuditReports" WHERE "walkthrough_id" = $1',
      [inspectionData.walkthroughId]
    );

    if (existingInspection.rows.length > 0) {
      return {
        success: false,
        message: 'Walkthrough ID already exists',
        details: { walkthroughId: inspectionData.walkthroughId }
      };
    }

    // Validate datacenter and datahall combination
    const validCombinations = await getValidDatacenterDatahallCombinations();
    const combination = `${inspectionData.datacenter}/${inspectionData.datahall}`;
    
    if (!validCombinations.includes(combination)) {
      return {
        success: false,
        message: 'Invalid datacenter and datahall combination',
        details: { combination }
      };
    }

    // Check for recent inspections in the same location (prevent duplicates within 1 hour)
    const recentInspection = await database.query(
      `SELECT "Id" FROM "AuditReports" 
       WHERE "datacenter" = $1 AND "datahall" = $2 
       AND "Timestamp" > NOW() - INTERVAL '1 hour'
       AND "UserEmail" = $3`,
      [inspectionData.datacenter, inspectionData.datahall, user.email]
    );

    if (recentInspection.rows.length > 0) {
      return {
        success: false,
        message: 'Recent inspection already exists for this location',
        details: { 
          message: 'Please wait at least 1 hour between inspections for the same location' 
        }
      };
    }

    // Validate state matches issues reported
    if (inspectionData.state === 'Healthy' && inspectionData.issuesReported > 0) {
      return {
        success: false,
        message: 'State cannot be Healthy when issues are reported',
        details: { 
          state: inspectionData.state, 
          issuesReported: inspectionData.issuesReported 
        }
      };
    }

    if (inspectionData.state === 'Critical' && inspectionData.issuesReported === 0) {
      return {
        success: false,
        message: 'Critical state requires at least one issue to be reported',
        details: { 
          state: inspectionData.state, 
          issuesReported: inspectionData.issuesReported 
        }
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error validating business rules:', error);
    return {
      success: false,
      message: 'Validation error occurred'
    };
  }
}

async function getValidDatacenterDatahallCombinations() {
  // This could be fetched from a configuration table
  // For now, return hardcoded valid combinations
  return [
    'DC-East-01/DH-01', 'DC-East-01/DH-02', 'DC-East-01/DH-03',
    'DC-West-01/DH-01', 'DC-West-01/DH-02', 'DC-West-01/DH-03',
    'DC-Central-01/DH-01', 'DC-Central-01/DH-02', 'DC-Central-01/DH-03',
    'DC-North-01/DH-01', 'DC-North-01/DH-02',
    'DC-South-01/DH-01', 'DC-South-01/DH-02'
  ];
}

async function createIncidentsFromInspection(client, inspectionData, user, inspectionId) {
  try {
    // Create an incident based on the inspection
    const severity = getSeverityFromState(inspectionData.state);
    
    await client.query(
      `INSERT INTO incidents (
        location, datahall, description, severity, status, user_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        inspectionData.datacenter,
        inspectionData.datahall,
        `Issues found during inspection ${inspectionData.walkthroughId}: ${inspectionData.reportData.comments}`,
        severity,
        'open',
        user.id
      ]
    );

    console.log(`Created incident for inspection ${inspectionId}`);

  } catch (error) {
    console.error('Error creating incident from inspection:', error);
    // Don't throw - incident creation failure shouldn't fail the inspection
  }
}

function getSeverityFromState(state) {
  switch (state) {
    case 'Critical':
      return 'critical';
    case 'Warning':
      return 'medium';
    case 'Healthy':
    default:
      return 'low';
  }
}

async function sendCriticalInspectionNotification(inspectionData, user) {
  try {
    // In a real implementation, this would send notifications via:
    // - Email
    // - SMS
    // - Teams/Slack
    // - Push notifications
    
    console.log(`CRITICAL INSPECTION ALERT: ${inspectionData.datacenter}/${inspectionData.datahall}`, {
      user: user.email,
      walkthroughId: inspectionData.walkthroughId,
      issues: inspectionData.issuesReported,
      comments: inspectionData.reportData.comments
    });

    // Log the notification attempt
    await database.query(
      `INSERT INTO user_activities (user_id, type, description, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        user.id,
        'issue',
        `Critical inspection notification sent for ${inspectionData.datacenter}/${inspectionData.datahall}`
      ]
    );

  } catch (error) {
    console.error('Error sending critical inspection notification:', error);
    // Don't throw - notification failure shouldn't fail the inspection
  }
}

// Register the function
app.http('SubmitInspection', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'function',
  handler: submitInspection
});

module.exports = submitInspection;