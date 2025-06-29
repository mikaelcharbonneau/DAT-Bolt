# DAT-Bolt Azure Migration Guide

## Overview

This document provides a comprehensive guide for migrating the DAT-Bolt audit management application from Supabase to Microsoft Azure. The migration includes infrastructure provisioning, database migration, API transformation, and deployment automation.

## Current Architecture

### Source Stack
- **Frontend**: React 18.3.1 with TypeScript, Vite build system
- **Backend**: Node.js/Express serverless functions (Netlify/Vercel style)
- **Database**: Supabase PostgreSQL with integrated authentication
- **Hosting**: Netlify/Vercel for frontend, Supabase for backend services
- **Authentication**: Supabase Auth

### Target Azure Architecture
- **Frontend**: Azure Static Web Apps or Azure App Service
- **Backend**: Azure Functions (Node.js)
- **Database**: Azure Database for PostgreSQL Flexible Server
- **Authentication**: Azure AD B2C or custom JWT implementation
- **Storage**: Azure Blob Storage
- **Monitoring**: Application Insights + Log Analytics
- **Security**: Azure Key Vault for secrets management

## Migration Components

The migration consists of several key components organized in dedicated directories:

```
DAT-Bolt/
├── terraform/                 # Infrastructure as Code
├── migration/                 # Database migration scripts
├── azure-functions/          # Serverless API functions
└── AZURE_MIGRATION_GUIDE.md  # This guide
```

## Phase 1: Infrastructure Setup

### Terraform Configuration

The `terraform/` directory contains Infrastructure as Code (IaC) configurations:

**Key Files:**
- `main.tf` - Core Azure resources definition
- `variables.tf` - Configurable parameters
- `outputs.tf` - Resource outputs for integration
- `environments/` - Environment-specific configurations
- `deploy.sh` - Automated deployment script

**Supported Environments:**
- **Development** (`dev.tfvars`) - Cost-optimized, single instance
- **Staging** (`staging.tfvars`) - Production-like, medium scale
- **Production** (`prod.tfvars`) - High availability, performance-optimized

### Core Azure Resources

1. **Resource Group** - Logical container for all resources
2. **Virtual Network** - Network isolation and security
3. **PostgreSQL Flexible Server** - Managed database service
4. **Azure Functions** - Serverless compute for API
5. **Storage Account** - Static website hosting and blob storage
6. **Key Vault** - Secure secrets management
7. **Application Insights** - Application monitoring
8. **Log Analytics Workspace** - Centralized logging

### Deployment Commands

```bash
# Development environment
cd terraform
./deploy.sh dev plan     # Preview changes
./deploy.sh dev apply    # Deploy infrastructure

# Production environment
./deploy.sh prod apply   # Deploy to production
```

## Phase 2: Database Migration

### Schema Conversion

The `migration/` directory contains database migration tools:

**Key Files:**
- `azure-schema.sql` - Converted PostgreSQL schema for Azure
- `migrate-data.js` - Data migration script
- `deploy-schema.js` - Schema deployment script
- `package.json` - Migration tool dependencies

### Schema Changes

**Supabase to Azure Conversions:**
1. **User Management**: `auth.users` → custom `users` table
2. **Authentication**: Supabase Auth → Azure AD B2C or JWT
3. **Extensions**: Supabase-specific → PostgreSQL standard
4. **Functions**: Supabase functions → Azure Functions

### Migration Process

```bash
# 1. Deploy schema to Azure PostgreSQL
cd migration
npm install
node deploy-schema.js --dry-run  # Preview
node deploy-schema.js            # Deploy

# 2. Migrate data from Supabase
node migrate-data.js --dry-run   # Preview
node migrate-data.js             # Execute migration

# 3. Validate migration
# Validation is included in the migration process
```

### Data Transformations

- **User Profiles**: Creates Azure users from Supabase user profiles
- **Audit Reports**: Preserves all audit data with enhanced validation
- **Incidents**: Maintains incident tracking with improved categorization
- **Reports**: Transfers generated reports with enhanced analytics

## Phase 3: API Migration

### Azure Functions Architecture

The `azure-functions/` directory contains the serverless API:

**Shared Services:**
- `shared/database.js` - PostgreSQL connection management
- `shared/auth.js` - JWT authentication and user management
- `shared/validation.js` - Request validation using Joi
- `shared/response.js` - Consistent API response formatting

**API Functions:**
- `GetInspections/` - Retrieve audit reports with filtering/pagination
- `SubmitInspection/` - Submit new inspection reports
- `GenerateReport/` - Generate comprehensive reports

### API Endpoints

| Original Endpoint | Azure Function | Method | Description |
|-------------------|----------------|--------|-------------|
| `/api/inspections` | `GetInspections` | GET | Retrieve inspections with filters |
| `/api/inspections` | `SubmitInspection` | POST | Submit new inspection |
| `/api/reports` | `GenerateReport` | GET/POST | Generate/retrieve reports |

### Enhanced Features

**Security Improvements:**
- JWT token validation with configurable expiry
- SQL injection prevention with parameterized queries
- Input validation with comprehensive schemas
- CORS configuration with security headers

**Performance Optimizations:**
- Connection pooling for database connections
- Batch processing for large data operations
- Efficient pagination and filtering
- Response caching strategies

**Monitoring & Logging:**
- Application Insights integration
- Structured logging with request IDs
- Performance metrics collection
- Error tracking and alerting

## Phase 4: Frontend Migration

### Application Configuration Changes

Update the frontend to use Azure services:

```typescript
// Replace Supabase client configuration
// Before (Supabase)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, key)

// After (Azure Functions)
const API_BASE_URL = process.env.REACT_APP_API_URL // Azure Functions URL
const authToken = localStorage.getItem('authToken')

// API calls with Bearer token authentication
fetch(`${API_BASE_URL}/api/GetInspections`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})
```

### Authentication Integration

**Option 1: Azure AD B2C Integration**
```typescript
import { PublicClientApplication } from '@azure/msal-browser'

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID,
    authority: process.env.REACT_APP_AZURE_AUTHORITY
  }
}
```

**Option 2: Custom JWT Authentication**
```typescript
// Custom login implementation
const loginUser = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  
  const { token } = await response.json()
  localStorage.setItem('authToken', token)
}
```

## Phase 5: Deployment & CI/CD

### Azure Static Web Apps Deployment

```bash
# Build and deploy frontend
npm run build
az staticwebapp create \
  --name dat-bolt-frontend \
  --resource-group rg-dat-bolt-prod \
  --source https://github.com/your-org/dat-bolt \
  --location "East US" \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

### GitHub Actions Workflow

```yaml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  deploy-infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Terraform
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve

  deploy-functions:
    runs-on: ubuntu-latest
    needs: deploy-infrastructure
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Azure Functions
        run: |
          cd azure-functions
          npm install
          func azure functionapp publish dat-bolt-functions
```

## Migration Execution Plan

### Pre-Migration Checklist

- [ ] Azure subscription and permissions configured
- [ ] Resource naming conventions established
- [ ] Environment variables and secrets identified
- [ ] Backup strategy for current Supabase data
- [ ] Testing environment prepared

### Step-by-Step Execution

#### Week 1: Infrastructure Setup
1. **Day 1-2**: Deploy development environment
   ```bash
   cd terraform
   ./deploy.sh dev apply
   ```

2. **Day 3-4**: Deploy staging environment
   ```bash
   ./deploy.sh staging apply
   ```

3. **Day 5**: Validate infrastructure and networking

#### Week 2: Database Migration
1. **Day 1-2**: Deploy schema to development
   ```bash
   cd migration
   node deploy-schema.js
   ```

2. **Day 3-4**: Test data migration with sample data
   ```bash
   node migrate-data.js --dry-run
   node migrate-data.js --table=AuditReports  # Test single table
   ```

3. **Day 5**: Full data migration to development
   ```bash
   node migrate-data.js
   ```

#### Week 3: API Migration
1. **Day 1-2**: Deploy Azure Functions to development
   ```bash
   cd azure-functions
   npm install
   func azure functionapp publish dat-bolt-functions-dev
   ```

2. **Day 3-4**: Test API endpoints and integration
3. **Day 5**: Deploy to staging and conduct integration testing

#### Week 4: Frontend Migration & Testing
1. **Day 1-2**: Update frontend configuration for Azure
2. **Day 3-4**: Deploy frontend to Azure Static Web Apps
3. **Day 5**: End-to-end testing and performance validation

#### Week 5: Production Deployment
1. **Day 1-2**: Production infrastructure deployment
2. **Day 3**: Production database migration
3. **Day 4**: Production API and frontend deployment
4. **Day 5**: Go-live and monitoring

### Post-Migration Tasks

#### Immediate (Week 6)
- [ ] Monitor application performance and errors
- [ ] Validate all functionality works correctly
- [ ] Set up alerting and monitoring dashboards
- [ ] Conduct user acceptance testing

#### Short-term (Month 2)
- [ ] Optimize performance based on usage patterns
- [ ] Implement advanced monitoring and alerting
- [ ] Set up automated backup and disaster recovery
- [ ] Security audit and penetration testing

#### Long-term (Month 3+)
- [ ] Cost optimization review
- [ ] Scale testing and auto-scaling configuration
- [ ] Advanced Azure features integration (e.g., CDN, WAF)
- [ ] Documentation and training updates

## Cost Analysis

### Development Environment
- **Azure Functions**: ~$20/month (Consumption plan)
- **PostgreSQL**: ~$50/month (B_Standard_B1ms)
- **Storage**: ~$5/month
- **Monitoring**: ~$10/month
- **Total**: ~$85/month

### Production Environment
- **Azure Functions**: ~$100/month (Premium plan)
- **PostgreSQL**: ~$200/month (GP_Standard_D4s_v3)
- **Storage**: ~$20/month
- **Monitoring**: ~$30/month
- **Application Gateway**: ~$50/month
- **Total**: ~$400/month

### Cost Optimization Strategies
1. **Auto-scaling**: Implement consumption-based scaling
2. **Reserved Instances**: Use for predictable workloads
3. **Storage Tiers**: Use appropriate storage tiers for different data
4. **Monitoring**: Set up cost alerts and budgets

## Security Considerations

### Data Protection
- **Encryption**: At-rest and in-transit encryption enabled
- **Network Security**: VNet integration and private endpoints
- **Access Control**: Role-based access control (RBAC)
- **Key Management**: Azure Key Vault for all secrets

### Compliance
- **GDPR**: Data residency and privacy controls
- **SOC 2**: Azure compliance certifications
- **Industry Standards**: Healthcare and financial compliance options

### Monitoring & Auditing
- **Azure Security Center**: Continuous security assessment
- **Azure Sentinel**: SIEM capabilities for threat detection
- **Audit Logs**: Comprehensive logging and retention policies

## Rollback Strategy

### Contingency Planning

**Immediate Rollback (< 1 hour):**
1. Redirect DNS to original Supabase application
2. Revert frontend configuration to use Supabase
3. Communicate status to users

**Partial Rollback (< 4 hours):**
1. Keep database changes, revert API to Supabase
2. Use data synchronization scripts if needed
3. Gradual re-migration of specific components

**Full Rollback (< 24 hours):**
1. Restore Supabase database from pre-migration backup
2. Revert all application configurations
3. Full testing and validation

### Backup Strategy

**Pre-Migration Backups:**
- Supabase database export
- Application configuration backup
- DNS and routing configuration
- User account and permission exports

**During Migration:**
- Point-in-time recovery capabilities
- Transaction log backups
- Configuration versioning
- Deployment artifacts retention

## Testing Strategy

### Automated Testing

**Unit Tests:**
```bash
# Database migration tests
cd migration
npm test

# Azure Functions tests
cd azure-functions
npm test
```

**Integration Tests:**
```bash
# API endpoint testing
npm run test:integration

# End-to-end testing
npm run test:e2e
```

### Manual Testing Checklist

#### Core Functionality
- [ ] User authentication and authorization
- [ ] Inspection submission and retrieval
- [ ] Report generation and download
- [ ] Data filtering and pagination
- [ ] Error handling and validation

#### Performance Testing
- [ ] Load testing with expected user volumes
- [ ] Database query performance
- [ ] API response times
- [ ] Frontend rendering performance

#### Security Testing
- [ ] Authentication bypass attempts
- [ ] SQL injection testing
- [ ] XSS vulnerability testing
- [ ] Access control validation

## Monitoring & Maintenance

### Application Insights Dashboards

**Key Metrics:**
- Request volume and response times
- Error rates and exceptions
- Database connection metrics
- User authentication success rates

**Custom Metrics:**
- Inspection submission rates
- Report generation times
- User activity patterns
- System health indicators

### Alerting Configuration

**Critical Alerts:**
- Application downtime (> 1 minute)
- Database connection failures
- High error rates (> 5%)
- Authentication system failures

**Warning Alerts:**
- Response time degradation (> 2 seconds)
- High resource utilization (> 80%)
- Failed login attempts
- Unusual traffic patterns

### Maintenance Tasks

**Daily:**
- Monitor application health dashboards
- Review error logs and exceptions
- Check backup completion status

**Weekly:**
- Performance metrics review
- Security log analysis
- Cost monitoring and optimization

**Monthly:**
- Security patching and updates
- Capacity planning review
- Disaster recovery testing
- Cost optimization analysis

## Support & Documentation

### Documentation Updates

**Technical Documentation:**
- API documentation with OpenAPI specs
- Database schema documentation
- Deployment and configuration guides
- Troubleshooting and FAQ

**User Documentation:**
- Updated user guides for any UI changes
- Training materials for new features
- Migration communication to end users

### Support Procedures

**Incident Response:**
1. Detection via monitoring alerts
2. Initial assessment and triage
3. Communication to stakeholders
4. Resolution and post-incident review

**Change Management:**
1. Change request documentation
2. Impact assessment and testing
3. Approval and scheduling
4. Implementation and monitoring

## Success Criteria

### Technical Metrics
- [ ] 99.9% uptime (improved from current)
- [ ] < 500ms average API response time
- [ ] Zero data loss during migration
- [ ] All functionality working as expected

### Business Metrics
- [ ] No disruption to user productivity
- [ ] Maintained or improved user satisfaction
- [ ] Cost within projected budget
- [ ] Enhanced security posture

### Migration Completion Criteria
- [ ] All environments successfully deployed
- [ ] Data migration validated and complete
- [ ] User acceptance testing passed
- [ ] Monitoring and alerting operational
- [ ] Documentation updated and delivered
- [ ] Support team trained on new architecture

## Conclusion

This comprehensive migration guide provides a structured approach to migrating the DAT-Bolt application from Supabase to Microsoft Azure. The migration leverages modern Azure services to improve scalability, security, and maintainability while preserving all existing functionality.

The phased approach minimizes risk and allows for thorough testing at each stage. The Infrastructure as Code approach ensures reproducible deployments across environments, while the comprehensive monitoring and alerting setup provides visibility into application health and performance.

Upon completion, the application will benefit from:
- Enhanced security through Azure's enterprise-grade services
- Improved scalability with serverless compute
- Better monitoring and observability
- Simplified maintenance through managed services
- Cost optimization through consumption-based pricing

For questions or support during the migration, refer to the documentation in each component directory or contact the DevOps team.