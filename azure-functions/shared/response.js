/**
 * Response utilities for Azure Functions
 * Provides consistent response formatting across all API endpoints
 */

class ResponseService {
  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    };
  }

  // Success responses
  success(data = null, message = 'Success', status = 200, headers = {}) {
    return {
      status,
      headers: { ...this.defaultHeaders, ...headers },
      body: {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
      }
    };
  }

  created(data = null, message = 'Created successfully', headers = {}) {
    return this.success(data, message, 201, headers);
  }

  noContent(message = 'No content', headers = {}) {
    return {
      status: 204,
      headers: { ...this.defaultHeaders, ...headers },
      body: null
    };
  }

  // Error responses
  error(message = 'Internal server error', status = 500, details = null, headers = {}) {
    const errorResponse = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      errorResponse.details = details;
    }

    // Add error ID for tracking
    errorResponse.errorId = this.generateErrorId();

    return {
      status,
      headers: { ...this.defaultHeaders, ...headers },
      body: errorResponse
    };
  }

  badRequest(message = 'Bad request', details = null, headers = {}) {
    return this.error(message, 400, details, headers);
  }

  unauthorized(message = 'Unauthorized', headers = {}) {
    return this.error(message, 401, null, headers);
  }

  forbidden(message = 'Forbidden', headers = {}) {
    return this.error(message, 403, null, headers);
  }

  notFound(message = 'Not found', headers = {}) {
    return this.error(message, 404, null, headers);
  }

  conflict(message = 'Conflict', details = null, headers = {}) {
    return this.error(message, 409, details, headers);
  }

  unprocessableEntity(message = 'Unprocessable entity', details = null, headers = {}) {
    return this.error(message, 422, details, headers);
  }

  tooManyRequests(message = 'Too many requests', retryAfter = null, headers = {}) {
    const responseHeaders = { ...headers };
    if (retryAfter) {
      responseHeaders['Retry-After'] = retryAfter;
    }
    return this.error(message, 429, null, responseHeaders);
  }

  internalServerError(message = 'Internal server error', details = null, headers = {}) {
    return this.error(message, 500, details, headers);
  }

  serviceUnavailable(message = 'Service unavailable', headers = {}) {
    return this.error(message, 503, null, headers);
  }

  // Validation error response
  validationError(errors, message = 'Validation failed', headers = {}) {
    return this.badRequest(message, { validationErrors: errors }, headers);
  }

  // Paginated response
  paginated(data, pagination, message = 'Success', status = 200, headers = {}) {
    return {
      status,
      headers: { ...this.defaultHeaders, ...headers },
      body: {
        success: true,
        message,
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total,
          totalPages: Math.ceil(pagination.total / pagination.limit),
          hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
          hasPrev: pagination.page > 1
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  // CORS response
  cors(allowedOrigins = ['*'], allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders = ['Content-Type', 'Authorization']) {
    return {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': Array.isArray(allowedOrigins) ? allowedOrigins.join(', ') : allowedOrigins,
        'Access-Control-Allow-Methods': Array.isArray(allowedMethods) ? allowedMethods.join(', ') : allowedMethods,
        'Access-Control-Allow-Headers': Array.isArray(allowedHeaders) ? allowedHeaders.join(', ') : allowedHeaders,
        'Access-Control-Max-Age': '86400'
      },
      body: null
    };
  }

  // File download response
  fileDownload(fileContent, filename, contentType = 'application/octet-stream', headers = {}) {
    const downloadHeaders = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': Buffer.isBuffer(fileContent) ? fileContent.length : Buffer.from(fileContent).length,
      ...headers
    };

    return {
      status: 200,
      headers: downloadHeaders,
      body: fileContent,
      isRaw: true
    };
  }

  // Redirect response
  redirect(location, permanent = false, headers = {}) {
    return {
      status: permanent ? 301 : 302,
      headers: {
        'Location': location,
        ...headers
      },
      body: null
    };
  }

  // Health check response
  healthCheck(status = 'healthy', checks = {}, headers = {}) {
    const overallHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: overallHealthy ? 200 : 503,
      headers: { ...this.defaultHeaders, ...headers },
      body: {
        status: overallHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks
      }
    };
  }

  // Utility methods
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setCorsHeaders(response, origin = '*') {
    response.headers = {
      ...response.headers,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true'
    };
    return response;
  }

  setSecurityHeaders(response) {
    response.headers = {
      ...response.headers,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
    return response;
  }

  // Express.js style send method for Azure Functions context
  sendResponse(context, response) {
    context.res = response;
  }

  // Middleware-style error handler
  handleError(error, context, customMessage = null) {
    console.error('Function error:', error);

    let response;
    
    if (error.name === 'ValidationError') {
      response = this.validationError(error.details || [], error.message);
    } else if (error.statusCode) {
      response = this.error(customMessage || error.message, error.statusCode);
    } else if (error.code === 'ECONNREFUSED') {
      response = this.serviceUnavailable('Database connection failed');
    } else if (error.code === 'ENOTFOUND') {
      response = this.serviceUnavailable('External service unavailable');
    } else {
      response = this.internalServerError(customMessage || 'An unexpected error occurred');
    }

    this.sendResponse(context, response);
    return response;
  }

  // Async wrapper for Azure Functions
  wrapAsync(handler) {
    return async (context, req) => {
      try {
        const result = await handler(context, req);
        if (result && !context.res) {
          this.sendResponse(context, result);
        }
        return result;
      } catch (error) {
        return this.handleError(error, context);
      }
    };
  }

  // Request logging middleware
  logRequest(context, req) {
    const start = Date.now();
    const requestId = `req_${start}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] ${req.method} ${req.url} - Start`);
    
    // Add request ID to context for tracking
    context.requestId = requestId;
    
    // Return a function to log the response
    return (response) => {
      const duration = Date.now() - start;
      console.log(`[${requestId}] ${req.method} ${req.url} - ${response?.status || 'Unknown'} - ${duration}ms`);
    };
  }
}

// Singleton instance
const responseService = new ResponseService();

module.exports = {
  responseService,
  ResponseService
};