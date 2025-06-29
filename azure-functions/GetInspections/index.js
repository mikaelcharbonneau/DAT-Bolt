const { app } = require('@azure/functions');
const { database } = require('../shared/database');
const { authService } = require('../shared/auth');
const { validationService, schemas } = require('../shared/validation');
const { responseService } = require('../shared/response');

/**
 * Azure Function: GetInspections
 * Retrieves audit reports with filtering, pagination, and sorting
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - datacenter: Filter by datacenter
 * - datahall: Filter by data hall
 * - state: Filter by state (Healthy, Warning, Critical)
 * - startDate: Filter by start date (ISO format)
 * - endDate: Filter by end date (ISO format)
 * - userEmail: Filter by user email
 * - sortBy: Sort field (default: Timestamp)
 * - sortOrder: Sort order (asc, desc, default: desc)
 */

async function getInspections(request, context) {
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

    // Validate query parameters
    const paginationValidation = validationService.validateRequest(request, schemas.paginationParams, 'query');
    if (!paginationValidation.success) {
      const response = responseService.validationError(paginationValidation.errors);
      logResponse(response);
      return response;
    }

    const filtersValidation = validationService.validateRequest(request, schemas.inspectionFilters, 'query');
    if (!filtersValidation.success) {
      const response = responseService.validationError(filtersValidation.errors);
      logResponse(response);
      return response;
    }

    const pagination = paginationValidation.data;
    const filters = filtersValidation.data;

    // Build the query
    const { query, countQuery, params } = buildInspectionsQuery(filters, pagination);

    // Execute queries
    const [dataResult, countResult] = await Promise.all([
      database.query(query, params),
      database.query(countQuery, params.slice(0, -2)) // Remove LIMIT and OFFSET params for count
    ]);

    const inspections = dataResult.rows;
    const total = parseInt(countResult.rows[0].total);

    // Transform data for response
    const transformedInspections = inspections.map(transformInspectionForResponse);

    const response = responseService.paginated(
      transformedInspections,
      {
        page: pagination.page,
        limit: pagination.limit,
        total
      },
      'Inspections retrieved successfully'
    );

    logResponse(response);
    return responseService.setCorsHeaders(response);

  } catch (error) {
    console.error('Error in GetInspections:', error);
    const response = responseService.internalServerError('Failed to retrieve inspections');
    logResponse(response);
    return responseService.setCorsHeaders(response);
  }
}

function buildInspectionsQuery(filters, pagination) {
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  // Add filters
  if (filters.datacenter) {
    whereClause += ` AND "datacenter" = $${paramIndex}`;
    params.push(filters.datacenter);
    paramIndex++;
  }

  if (filters.datahall) {
    whereClause += ` AND "datahall" = $${paramIndex}`;
    params.push(filters.datahall);
    paramIndex++;
  }

  if (filters.state) {
    whereClause += ` AND "state" = $${paramIndex}`;
    params.push(filters.state);
    paramIndex++;
  }

  if (filters.userEmail) {
    whereClause += ` AND "UserEmail" = $${paramIndex}`;
    params.push(filters.userEmail);
    paramIndex++;
  }

  if (filters.startDate) {
    whereClause += ` AND "Timestamp" >= $${paramIndex}`;
    params.push(filters.startDate);
    paramIndex++;
  }

  if (filters.endDate) {
    whereClause += ` AND "Timestamp" <= $${paramIndex}`;
    params.push(filters.endDate);
    paramIndex++;
  }

  // Build ORDER BY clause
  const allowedSortFields = ['Timestamp', 'datacenter', 'datahall', 'state', 'issues_reported', 'walkthrough_id'];
  const sortField = allowedSortFields.includes(pagination.sortBy) ? pagination.sortBy : 'Timestamp';
  const sortOrder = pagination.sortOrder || 'desc';
  const orderClause = `ORDER BY "${sortField}" ${sortOrder.toUpperCase()}`;

  // Add pagination
  const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  params.push(pagination.limit);
  params.push((pagination.page - 1) * pagination.limit);

  // Main query
  const query = `
    SELECT 
      "Id",
      "UserEmail",
      "GeneratedBy",
      "Timestamp",
      "datacenter",
      "datahall",
      "issues_reported",
      "state",
      "walkthrough_id",
      "user_full_name",
      "ReportData"
    FROM "AuditReports"
    ${whereClause}
    ${orderClause}
    ${limitClause}
  `;

  // Count query
  const countQuery = `
    SELECT COUNT(*) as total
    FROM "AuditReports"
    ${whereClause}
  `;

  return { query, countQuery, params };
}

function transformInspectionForResponse(inspection) {
  return {
    Id: inspection.Id,
    UserEmail: inspection.UserEmail,
    GeneratedBy: inspection.GeneratedBy,
    Timestamp: inspection.Timestamp,
    datacenter: inspection.datacenter,
    datahall: inspection.datahall,
    issuesReported: inspection.issues_reported,
    state: inspection.state,
    walkthroughId: inspection.walkthrough_id,
    userFullName: inspection.user_full_name,
    ReportData: inspection.ReportData,
    // Add computed fields
    isUrgent: inspection.state === 'Critical' || inspection.issues_reported > 5,
    daysAgo: Math.floor((Date.now() - new Date(inspection.Timestamp).getTime()) / (1000 * 60 * 60 * 24))
  };
}

// Register the function
app.http('GetInspections', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'function',
  handler: getInspections
});

module.exports = getInspections;