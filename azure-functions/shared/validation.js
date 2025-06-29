const Joi = require('joi');

// Common validation schemas
const schemas = {
  // User schemas
  userRegistration: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(100).required(),
    department: Joi.string().max(100).optional()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Inspection schemas
  inspectionSubmission: Joi.object({
    userEmail: Joi.string().email().required(),
    reportData: Joi.object({
      datahall: Joi.string().required(),
      status: Joi.string().valid('Healthy', 'Warning', 'Critical').required(),
      isUrgent: Joi.boolean().default(false),
      temperatureReading: Joi.string().optional(),
      humidityReading: Joi.string().optional(),
      comments: Joi.string().max(1000).optional(),
      securityPassed: Joi.boolean().default(true),
      coolingSystemCheck: Joi.boolean().default(true)
    }).required(),
    datacenter: Joi.string().required(),
    datahall: Joi.string().required(),
    issuesReported: Joi.number().integer().min(0).default(0),
    state: Joi.string().valid('Healthy', 'Warning', 'Critical').required(),
    walkthroughId: Joi.number().integer().required(),
    userFullName: Joi.string().required()
  }),

  // Incident schemas
  incidentCreation: Joi.object({
    location: Joi.string().required(),
    datahall: Joi.string().required(),
    description: Joi.string().min(10).max(2000).required(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low').required(),
    status: Joi.string().valid('open', 'in-progress', 'resolved').default('open')
  }),

  incidentUpdate: Joi.object({
    description: Joi.string().min(10).max(2000).optional(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
    status: Joi.string().valid('open', 'in-progress', 'resolved').optional()
  }),

  // Report schemas
  reportGeneration: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    dateRangeStart: Joi.date().iso().required(),
    dateRangeEnd: Joi.date().iso().min(Joi.ref('dateRangeStart')).required(),
    datacenter: Joi.string().optional(),
    datahall: Joi.string().optional(),
    includeIncidents: Joi.boolean().default(true),
    includeAudits: Joi.boolean().default(true)
  }),

  // Query parameter schemas
  paginationParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  inspectionFilters: Joi.object({
    datacenter: Joi.string().optional(),
    datahall: Joi.string().optional(),
    state: Joi.string().valid('Healthy', 'Warning', 'Critical').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    userEmail: Joi.string().email().optional()
  }),

  incidentFilters: Joi.object({
    location: Joi.string().optional(),
    datahall: Joi.string().optional(),
    severity: Joi.string().valid('critical', 'high', 'medium', 'low').optional(),
    status: Joi.string().valid('open', 'in-progress', 'resolved').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  }),

  // UUID validation
  uuidParam: Joi.string().uuid().required()
};

class ValidationService {
  validate(data, schema, options = {}) {
    const defaultOptions = {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    };

    const validationOptions = { ...defaultOptions, ...options };
    const { error, value } = schema.validate(data, validationOptions);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return {
        success: false,
        errors: details,
        message: 'Validation failed'
      };
    }

    return {
      success: true,
      data: value
    };
  }

  validateRequest(request, schema, source = 'body') {
    let data;
    
    switch (source) {
      case 'body':
        data = request.body || {};
        break;
      case 'query':
        data = request.query || {};
        break;
      case 'params':
        data = request.params || {};
        break;
      case 'headers':
        data = request.headers || {};
        break;
      default:
        throw new Error(`Invalid validation source: ${source}`);
    }

    return this.validate(data, schema);
  }

  // Middleware function for Azure Functions
  createValidationMiddleware(schema, source = 'body') {
    return (request) => {
      const validation = this.validateRequest(request, schema, source);
      
      if (!validation.success) {
        return {
          status: 400,
          body: {
            success: false,
            message: validation.message,
            errors: validation.errors
          }
        };
      }

      // Attach validated data to request
      request.validated = request.validated || {};
      request.validated[source] = validation.data;

      return null; // No error
    };
  }

  // Sanitization helpers
  sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str.trim().slice(0, maxLength);
  }

  sanitizeEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  sanitizeFilename(filename) {
    if (typeof filename !== 'string') return '';
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 100);
  }

  // Custom validation rules
  customValidations = {
    isDatahall: (value) => {
      const validDatahalls = [
        'DH-01', 'DH-02', 'DH-03', 'DH-04', 'DH-05',
        'DH-06', 'DH-07', 'DH-08', 'DH-09', 'DH-10'
      ];
      return validDatahalls.includes(value);
    },

    isDatacenter: (value) => {
      const validDatacenters = [
        'DC-East-01', 'DC-West-01', 'DC-Central-01',
        'DC-North-01', 'DC-South-01'
      ];
      return validDatacenters.includes(value);
    },

    isValidWalkthroughId: (value) => {
      return Number.isInteger(value) && value > 0 && value < 1000000;
    }
  };

  // Enhanced schemas with custom validations
  getEnhancedSchemas() {
    return {
      ...schemas,
      
      inspectionSubmissionEnhanced: schemas.inspectionSubmission.keys({
        datacenter: Joi.string().custom((value, helpers) => {
          if (!this.customValidations.isDatacenter(value)) {
            return helpers.error('any.invalid');
          }
          return value;
        }).required(),
        
        datahall: Joi.string().custom((value, helpers) => {
          if (!this.customValidations.isDatahall(value)) {
            return helpers.error('any.invalid');
          }
          return value;
        }).required(),
        
        walkthroughId: Joi.number().custom((value, helpers) => {
          if (!this.customValidations.isValidWalkthroughId(value)) {
            return helpers.error('any.invalid');
          }
          return value;
        }).required()
      })
    };
  }
}

// Singleton instance
const validationService = new ValidationService();

module.exports = {
  validationService,
  schemas,
  ValidationService
};