# Frontend Migration to Azure - Summary

## Overview

This document summarizes the changes made to complete the DAT-Bolt frontend migration from Supabase to Azure. The migration includes hosting the React application on Azure Static Web Apps and integrating it with the existing Azure Functions backend.

## ✅ Completed Changes

### 1. Azure Infrastructure Updates

**File: `terraform/main.tf`**
- Added Azure Static Web Apps resource (`azurerm_static_site`) 
- Configured deployment token storage in Key Vault
- Set up proper SKU tiers (Free for dev, Standard for prod)

**File: `terraform/outputs.tf`**
- Added Static Web App outputs:
  - `static_web_app_name`
  - `static_web_app_url` 
  - `static_web_app_deployment_token`

### 2. Frontend Application Updates

**File: `src/lib/azureClient.ts` (NEW)**
- Created comprehensive Azure API client to replace Supabase
- Implements authentication, inspections, reports, and incidents APIs
- Includes proper error handling and JWT token management
- Provides type-safe interfaces matching Azure Functions

**File: `src/context/AuthContext.tsx`**
- Updated to use Azure client instead of Supabase
- Implements JWT token-based authentication
- Maintains user session state with localStorage

**File: `src/types/index.ts`**
- Added `AuditReport` interface (alias for `Inspection`)
- Added `Incident` interface for incident management
- Enhanced type definitions for Azure integration

**File: `src/vite-env.d.ts`**
- Added environment variable types for Azure Functions URL
- Maintains existing Supabase variables for transition period

### 3. CI/CD Pipeline

**File: `.github/workflows/azure-static-web-apps-deploy.yml` (NEW)**
- Automated deployment to Azure Static Web Apps
- Builds React application with proper environment variables
- Handles both push and pull request deployments
- Integrates with GitHub Actions for CI/CD

### 4. Deployment Automation

**File: `scripts/deploy-frontend.sh` (NEW)**
- Automated deployment script for complete migration
- Deploys Terraform infrastructure
- Creates environment configuration
- Provides step-by-step instructions
- Tests connectivity to Azure Functions

## 🔄 Next Steps Required

### 1. Deploy Infrastructure

Run the deployment script to provision Azure Static Web Apps:

```bash
# Deploy to development environment
./scripts/deploy-frontend.sh dev

# For production
./scripts/deploy-frontend.sh prod
```

This will:
- Deploy/update Terraform infrastructure
- Create Azure Static Web Apps
- Generate deployment tokens
- Create environment configuration files

### 2. Configure GitHub Secrets

Add the following secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

1. **AZURE_STATIC_WEB_APPS_API_TOKEN**
   - Get from Terraform output or Azure portal
   - Used by GitHub Actions for deployment

2. **VITE_AZURE_FUNCTIONS_URL**  
   - Your Azure Functions URL (e.g., `https://func-dat-bolt-v2-dev-xxx.azurewebsites.net`)
   - Used as API base URL for the frontend

### 3. Update Remaining Components

Several components still need to be updated to use the Azure client:

**Priority Components to Update:**
- `src/pages/Dashboard.tsx`
- `src/pages/Inspections.tsx` 
- `src/pages/InspectionForm.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Incidents.tsx`

**Example Migration Pattern:**
```typescript
// Before (Supabase)
import { supabase } from '../lib/supabaseClient';
const { data, error } = await supabase.from('inspections').select('*');

// After (Azure)
import { azureClient } from '../lib/azureClient';
const response = await azureClient.getInspections();
if (response.success) {
  const data = response.data;
} else {
  const error = response.error;
}
```

### 4. Azure Functions Integration

Ensure your Azure Functions have the following endpoints implemented:

**Authentication:**
- `POST /api/auth/login`
- `POST /api/auth/register` 
- `GET /api/auth/me`

**Inspections:**
- `GET /api/GetInspections`
- `POST /api/SubmitInspection`

**Additional APIs (if needed):**
- `GET /api/GetReports`
- `POST /api/GenerateReport`
- `GET /api/GetIncidents`
- `POST /api/CreateIncident`

### 5. Test the Migration

1. **Local Development:**
   ```bash
   # Use the environment file created by the script
   cp .env.dev .env
   npm run dev
   ```

2. **Production Deployment:**
   - Push code to `main` branch
   - Monitor GitHub Actions deployment
   - Test functionality at the Static Web App URL

## 🔧 Configuration Details

### Environment Variables

**For Local Development (.env):**
```
VITE_AZURE_FUNCTIONS_URL=https://func-dat-bolt-v2-dev-xxx.azurewebsites.net
```

**For GitHub Actions (Repository Secrets):**
- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `VITE_AZURE_FUNCTIONS_URL`

### Azure Resources Created

1. **Azure Static Web Apps**
   - Name: `stapp-dat-bolt-{environment}`
   - Features: Global CDN, custom domains, automatic SSL
   - Free tier for dev, Standard for production

2. **Integration with Existing Resources**
   - Links to existing Azure Functions
   - Uses existing Key Vault for secrets
   - Leverages existing Application Insights for monitoring

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure Azure Functions have proper CORS configuration
   - Verify Static Web App URL is in allowed origins

2. **Authentication Issues**
   - Check JWT secret configuration in Key Vault
   - Verify token expiration settings
   - Ensure proper token storage in localStorage

3. **API Connection Issues**
   - Verify Azure Functions URL is correct
   - Check function app is running and healthy
   - Test endpoints using the TestConnection function

4. **Build Failures**
   - Ensure all environment variables are set
   - Check TypeScript errors
   - Verify all dependencies are installed

### Monitoring

- **Application Insights:** Monitor frontend errors and performance
- **GitHub Actions:** Track deployment status and logs
- **Azure Portal:** Monitor Static Web App metrics and logs

## 📊 Architecture Overview

### Before (Supabase)
```
Frontend (Netlify/Vercel) → Supabase API → PostgreSQL
```

### After (Azure)
```
Frontend (Azure Static Web Apps) → Azure Functions → PostgreSQL Flexible Server
```

### Benefits of Migration

1. **Unified Platform:** All resources in Azure for better management
2. **Cost Optimization:** Azure pricing models for enterprise usage
3. **Security:** Enhanced security with Key Vault and VNet integration
4. **Scalability:** Premium Azure Functions and Static Web Apps
5. **Monitoring:** Comprehensive monitoring with Application Insights

## 🚀 Deployment Timeline

1. **Infrastructure Deployment** (5-10 minutes)
   - Run deployment script
   - Configure GitHub secrets

2. **Code Deployment** (2-5 minutes)
   - Push to main branch
   - Automatic build and deployment

3. **Testing & Validation** (15-30 minutes)
   - Test all functionality
   - Verify API connections
   - Check authentication flow

4. **DNS & Custom Domain** (Optional)
   - Configure custom domain in Azure portal
   - Update DNS records

## 📝 Rollback Plan

If issues occur during migration:

1. **Immediate Rollback**
   - Revert DNS to original Supabase application
   - Update environment variables back to Supabase

2. **Partial Rollback**
   - Keep Azure infrastructure
   - Revert frontend code changes
   - Gradually migrate components

3. **Infrastructure Rollback**
   - Remove Azure Static Web Apps resource
   - Keep other Azure resources for backend

## 📞 Support

For issues during migration:
1. Check Azure portal for resource status
2. Monitor GitHub Actions for deployment logs
3. Use Application Insights for runtime errors
4. Test individual Azure Functions endpoints

---

**Status:** Ready for deployment
**Next Action:** Run `./scripts/deploy-frontend.sh dev` to begin migration