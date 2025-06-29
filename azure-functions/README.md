# DAT-Bolt Azure Functions

This directory contains the Azure Functions that replace the original serverless API endpoints for the DAT-Bolt application.

## Overview

The Azure Functions provide a scalable, serverless API backend for the DAT-Bolt audit management system. These functions handle:

- **GetInspections** - Retrieve audit reports with filtering and pagination
- **SubmitInspection** - Submit new inspection/audit reports
- **GenerateReport** - Generate comprehensive reports from audit and incident data

## Architecture

```
azure-functions/
├── shared/                    # Shared utilities and services
│   ├── database.js           # PostgreSQL connection management
│   ├── auth.js               # Authentication and authorization
│   ├── validation.js         # Request validation using Joi
│   └── response.js           # Consistent response formatting
├── GetInspections/           # Get inspections function
├── SubmitInspection/         # Submit inspection function
├── GenerateReport/           # Generate report function
├── host.json                 # Function app configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## Prerequisites

### Software Requirements

1. **Node.js** (18.x or later)
   ```bash
   node --version
   ```

2. **Azure Functions Core Tools**
   ```bash
   npm install -g azure-functions-core-tools@4 --unsafe-perm true
   ```

3. **Azure CLI** (for deployment)
   ```bash
   az login
   ```

### Environment Setup

Create a `local.settings.json` file for local development:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_POSTGRESQL_CONNECTION_STRING": "postgresql://username:password@server:port/database?sslmode=require",
    "KEY_VAULT_NAME": "your-keyvault-name",
    "JWT_SECRET": "your-jwt-secret-key",
    "JWT_EXPIRY": "24h",
    "LOG_LEVEL": "info"
  }
}
```

**Note:** Never commit `local.settings.json` to version control.

## Installation

1. **Navigate to the functions directory**
   ```bash
   cd azure-functions
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up local configuration**
   ```bash
   cp local.settings.json.example local.settings.json
   # Edit with your actual values
   ```

## Local Development

### Running Functions Locally

```bash
# Start the function app locally
npm start

# Or use the Azure Functions Core Tools directly
func start
```

The functions will be available at:
- `http://localhost:7071/api/GetInspections`
- `http://localhost:7071/api/SubmitInspection`
- `http://localhost:7071/api/GenerateReport`

### Testing Functions

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Debugging

Use VS Code with the Azure Functions extension for the best debugging experience:

1. Install the Azure Functions extension
2. Set breakpoints in your code
3. Press F5 to start debugging

## API Reference

### Authentication

All endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <jwt-token>
```

### GetInspections

Retrieve inspection/audit reports with filtering and pagination.

**Endpoint:** `GET /api/GetInspections`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Items per page
- `datacenter` (string, optional) - Filter by datacenter
- `datahall` (string, optional) - Filter by data hall
- `state` (string, optional) - Filter by state (Healthy, Warning, Critical)
- `startDate` (ISO date, optional) - Filter by start date
- `endDate` (ISO date, optional) - Filter by end date
- `userEmail` (email, optional) - Filter by user email
- `sortBy` (string, default: 'Timestamp') - Sort field
- `sortOrder` (string, default: 'desc') - Sort order (asc, desc)

**Example Request:**
```bash
curl -X GET "http://localhost:7071/api/GetInspections?page=1&limit=10&state=Critical" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response:**
```json
{
  "success": true,
  "message": "Inspections retrieved successfully",
  "data": [
    {
      "Id": "uuid",
      "UserEmail": "user@company.com",
      "Timestamp": "2024-01-15T10:30:00Z",
      "datacenter": "DC-East-01",
      "datahall": "DH-01",
      "state": "Critical",
      "issuesReported": 3,
      "walkthroughId": 1001,
      "userFullName": "John Doe",
      "ReportData": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### SubmitInspection

Submit a new inspection/audit report.

**Endpoint:** `POST /api/SubmitInspection`

**Request Body:**
```json
{
  "userEmail": "user@company.com",
  "reportData": {
    "datahall": "DH-01",
    "status": "Healthy",
    "isUrgent": false,
    "temperatureReading": "72F",
    "humidityReading": "45%",
    "comments": "All systems operational",
    "securityPassed": true,
    "coolingSystemCheck": true
  },
  "datacenter": "DC-East-01",
  "datahall": "DH-01",
  "issuesReported": 0,
  "state": "Healthy",
  "walkthroughId": 1001,
  "userFullName": "John Doe"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:7071/api/SubmitInspection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d @inspection-data.json
```

**Response:**
```json
{
  "success": true,
  "message": "Inspection submitted successfully",
  "data": {
    "inspectionId": "uuid",
    "timestamp": "2024-01-15T10:30:00Z",
    "walkthroughId": 1001
  }
}
```

### GenerateReport

Generate comprehensive reports from audit and incident data.

**Endpoints:**
- `GET /api/GenerateReport?id={reportId}` - Get existing report
- `POST /api/GenerateReport` - Generate new report

**POST Request Body:**
```json
{
  "title": "Weekly Audit Report",
  "dateRangeStart": "2024-01-01T00:00:00Z",
  "dateRangeEnd": "2024-01-07T23:59:59Z",
  "datacenter": "DC-East-01",
  "datahall": "DH-01",
  "includeIncidents": true,
  "includeAudits": true
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:7071/api/GenerateReport" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d @report-params.json
```

**Response:**
```json
{
  "success": true,
  "message": "Report generated successfully",
  "data": {
    "reportId": "uuid",
    "generatedAt": "2024-01-15T10:30:00Z",
    "title": "Weekly Audit Report",
    "summary": {
      "totalAudits": 45,
      "totalIncidents": 3,
      "healthyPercentage": 89.5,
      "criticalAudits": 2,
      "openIncidents": 1
    }
  }
}
```

## Shared Services

### Database Service (`shared/database.js`)

Manages PostgreSQL connections with connection pooling and transaction support.

```javascript
const { database } = require('./shared/database');

// Simple query
const result = await database.query('SELECT * FROM users WHERE email = $1', [email]);

// Transaction
const result = await database.transaction(async (client) => {
  const user = await client.query('INSERT INTO users...');
  await client.query('INSERT INTO user_profiles...');
  return user.rows[0];
});
```

### Authentication Service (`shared/auth.js`)

Handles JWT token validation and user authentication.

```javascript
const { authService } = require('./shared/auth');

// Validate authentication
const authResult = await authService.requireAuth(request);
if (!authResult.success) {
  return responseService.unauthorized(authResult.message);
}

// User is authenticated, access via authResult.user
```

### Validation Service (`shared/validation.js`)

Provides request validation using Joi schemas.

```javascript
const { validationService, schemas } = require('./shared/validation');

// Validate request body
const validation = validationService.validateRequest(request, schemas.inspectionSubmission, 'body');
if (!validation.success) {
  return responseService.validationError(validation.errors);
}
```

### Response Service (`shared/response.js`)

Ensures consistent response formatting across all endpoints.

```javascript
const { responseService } = require('./shared/response');

// Success response
return responseService.success(data, 'Operation completed');

// Error responses
return responseService.badRequest('Invalid input');
return responseService.unauthorized('Token required');
return responseService.internalServerError('Something went wrong');
```

## Error Handling

All functions use consistent error handling:

```javascript
try {
  // Function logic
} catch (error) {
  console.error('Error in function:', error);
  
  if (error.code === '23505') { // Unique violation
    return responseService.conflict('Resource already exists');
  }
  
  return responseService.internalServerError('Operation failed');
}
```

## Security Features

### Authentication & Authorization
- JWT token validation
- User session management
- Role-based access control

### Input Validation
- Request schema validation
- SQL injection prevention
- XSS protection

### Security Headers
- CORS configuration
- Security headers (CSP, HSTS, etc.)
- Content type validation

### Database Security
- Connection pooling with limits
- Prepared statements
- Transaction isolation

## Performance Optimization

### Connection Pooling
- PostgreSQL connection pool with configurable limits
- Automatic connection recovery
- Connection timeout handling

### Caching Strategy
- Response caching for read-heavy operations
- Database query optimization
- Connection reuse

### Monitoring
- Application Insights integration
- Custom metrics and logging
- Performance counters

## Deployment

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Azure**
   ```bash
   func azure functionapp publish your-function-app-name
   ```

### Automated Deployment (CI/CD)

See the main project's CI/CD documentation for automated deployment pipelines.

### Environment Configuration

Production environment variables should be configured in Azure:

- **Application Settings** for non-sensitive configuration
- **Key Vault** for sensitive data (connection strings, secrets)
- **Managed Identity** for secure access to Azure resources

## Monitoring & Logging

### Application Insights

The functions are configured to send telemetry to Application Insights:

- Performance metrics
- Exception tracking
- Custom events and metrics
- Dependency tracking

### Logging Best Practices

```javascript
// Structured logging
console.log(`[${context.requestId}] Processing request`, {
  method: request.method,
  url: request.url,
  user: authResult.user.email
});

// Error logging
console.error('Database error:', error, {
  query: 'SELECT * FROM table',
  params: [param1, param2]
});
```

### Health Monitoring

Each function includes health checks and monitoring:

- Database connectivity
- External service availability
- Performance metrics
- Error rates

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```
Error: connect ECONNREFUSED
```

**Solutions:**
- Check connection string format
- Verify network connectivity
- Ensure database server is running
- Check firewall rules

#### 2. Authentication Failures

```
Error: JWT token verification failed
```

**Solutions:**
- Verify JWT secret configuration
- Check token expiration
- Validate token format
- Ensure Key Vault access

#### 3. Validation Errors

```
Error: Validation failed
```

**Solutions:**
- Check request body format
- Verify required fields
- Validate data types
- Review schema definitions

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
export LOG_LEVEL=debug

# Or in local.settings.json
{
  "Values": {
    "LOG_LEVEL": "debug"
  }
}
```

### Performance Issues

Monitor and optimize:

1. **Database Queries**
   - Check query execution times
   - Review query plans
   - Add appropriate indexes

2. **Memory Usage**
   - Monitor function memory consumption
   - Optimize object creation
   - Implement proper cleanup

3. **Network Latency**
   - Monitor external service calls
   - Implement retry logic
   - Consider caching strategies

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- GetInspections.test.js

# Run tests with coverage
npm test -- --coverage
```

### Integration Tests

```bash
# Start local functions
npm start

# Run integration tests
npm run test:integration
```

### Load Testing

Use tools like Artillery or Azure Load Testing to test function performance under load.

## Contributing

1. Follow the existing code structure
2. Add appropriate validation for new endpoints
3. Include unit tests for new functionality
4. Update documentation for API changes
5. Use consistent error handling patterns

## Best Practices

### Code Organization
- Keep functions focused and single-purpose
- Use shared utilities for common operations
- Implement proper error handling
- Follow consistent naming conventions

### Security
- Always validate input data
- Use parameterized queries
- Implement proper authentication
- Follow security headers best practices

### Performance
- Use connection pooling
- Implement appropriate caching
- Optimize database queries
- Monitor resource usage

### Maintenance
- Keep dependencies updated
- Monitor for security vulnerabilities
- Regular performance reviews
- Maintain comprehensive documentation