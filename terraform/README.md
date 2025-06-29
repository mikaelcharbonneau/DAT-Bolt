# DAT-Bolt Azure Infrastructure

This directory contains the Terraform configuration for deploying the DAT-Bolt application infrastructure on Microsoft Azure.

## Architecture Overview

The infrastructure includes:

- **Azure Functions** - Serverless API backend
- **Azure Database for PostgreSQL** - Managed database service
- **Azure Storage Account** - Static website hosting and blob storage
- **Azure Key Vault** - Secure secret management
- **Azure Application Insights** - Application monitoring
- **Azure Log Analytics** - Centralized logging
- **Virtual Network** - Network isolation and security
- **Application Gateway** - Load balancing and WAF (optional)

## Prerequisites

1. **Azure CLI** - Install and login
   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

2. **Terraform** - Version 1.0 or later
   ```bash
   # Install via Homebrew (macOS)
   brew install terraform
   
   # Or download from https://www.terraform.io/downloads.html
   ```

3. **Azure Permissions** - Your account needs:
   - Contributor role on the subscription
   - User Access Administrator (for managed identities)
   - Key Vault Administrator (for Key Vault access)

## Quick Start

1. **Clone and Navigate**
   ```bash
   cd terraform
   ```

2. **Configure Environment**
   ```bash
   # Copy the example variables file
   cp terraform.tfvars.example terraform.tfvars
   
   # Edit with your values
   nano terraform.tfvars
   ```

3. **Deploy Development Environment**
   ```bash
   # Plan the deployment
   ./deploy.sh dev plan
   
   # Apply the changes
   ./deploy.sh dev apply
   ```

## Environment Management

### Available Environments

- **dev** - Development environment with minimal resources
- **staging** - Pre-production environment mirroring production
- **prod** - Production environment with high availability

### Environment-Specific Configuration

Each environment has its own configuration file in `environments/`:

- `environments/dev.tfvars` - Development settings
- `environments/staging.tfvars` - Staging settings
- `environments/prod.tfvars` - Production settings

### Deployment Commands

```bash
# Development
./deploy.sh dev plan     # Preview changes
./deploy.sh dev apply    # Deploy infrastructure
./deploy.sh dev destroy  # Destroy infrastructure (be careful!)

# Staging
./deploy.sh staging plan
./deploy.sh staging apply

# Production
./deploy.sh prod plan
./deploy.sh prod apply
```

## Configuration

### Required Variables

These variables must be set in your `terraform.tfvars` or environment-specific files:

```hcl
# Basic Configuration
environment = "dev"
location    = "East US"

# Database Configuration
postgresql_admin_username = "datboltadmin"
postgresql_admin_password = "YourSecurePassword123!"

# Contact Information
alert_email = "your-email@company.com"
```

### Optional Variables

```hcl
# Custom Domain
custom_domain = "auditportal.yourcompany.com"

# Security
allowed_client_ips = ["203.0.113.0/24"]
enable_private_endpoints = true

# Cost Optimization
dev_mode = true
auto_scale_enabled = true
```

## Security Considerations

### Secrets Management

- Database passwords are stored in Azure Key Vault
- Function Apps use Managed Identity to access Key Vault
- Application secrets are retrieved from Key Vault at runtime

### Network Security

- Private endpoints for database and storage (production)
- Virtual Network integration for Functions
- Application Gateway with WAF for web application firewall

### Access Control

- Managed identities for service-to-service authentication
- Role-based access control (RBAC) for Azure resources
- Key Vault access policies for secret management

## Cost Optimization

### Development Environment

- Uses Burstable PostgreSQL instances (B_Standard_B1ms)
- Consumption plan for Azure Functions
- Shorter log retention periods
- Reduced backup retention

### Production Environment

- General Purpose PostgreSQL instances for better performance
- Extended backup and log retention
- High availability configurations
- Application Gateway for load balancing

### Cost Monitoring

Monitor costs using:
- Azure Cost Management
- Resource tags for cost allocation
- Terraform state for resource tracking

## Monitoring and Logging

### Application Insights

- Performance monitoring
- Error tracking
- Custom metrics and events
- Dependency tracking

### Log Analytics

- Centralized log collection
- Query capabilities with KQL
- Alert rules and notifications
- Dashboard creation

### Alerts Configuration

Configure alerts for:
- Application errors
- Performance degradation
- Resource utilization
- Security events

## Backup and Recovery

### Database Backups

- Automated daily backups
- Point-in-time recovery
- Cross-region backup replication (production)

### Application Recovery

- Infrastructure as Code for rapid redeployment
- Key Vault backup for secrets
- Storage account geo-replication

## Troubleshooting

### Common Issues

1. **Terraform Init Fails**
   ```bash
   # Clear Terraform cache
   rm -rf .terraform
   terraform init
   ```

2. **Azure Authentication Issues**
   ```bash
   # Re-login to Azure
   az logout
   az login
   ```

3. **Resource Name Conflicts**
   - Azure resource names must be globally unique
   - Random suffixes are added to prevent conflicts
   - Check Azure portal for existing resources

4. **Permission Errors**
   ```bash
   # Check your Azure permissions
   az role assignment list --assignee $(az account show --query user.name -o tsv)
   ```

### Debugging

1. **Enable Terraform Debug Logging**
   ```bash
   export TF_LOG=DEBUG
   ./deploy.sh dev plan
   ```

2. **Check Azure Resource Status**
   ```bash
   # List resources in resource group
   az resource list --resource-group rg-dat-bolt-dev --output table
   ```

3. **Function App Logs**
   ```bash
   # Stream Function App logs
   az webapp log tail --name func-dat-bolt-dev-xxxx --resource-group rg-dat-bolt-dev
   ```

## Advanced Configuration

### Custom Domains and SSL

1. **Add Custom Domain**
   ```hcl
   custom_domain = "auditportal.yourcompany.com"
   ```

2. **Configure SSL Certificate**
   - Use Azure-managed certificates
   - Or upload custom certificates to Key Vault

### Azure AD B2C Integration

1. **Create Azure AD B2C Tenant**
2. **Configure Application Registration**
3. **Set Variables**
   ```hcl
   azure_ad_b2c_tenant_name = "yourcompany.onmicrosoft.com"
   azure_ad_b2c_client_id = "your-client-id"
   azure_ad_b2c_client_secret = "your-client-secret"
   ```

### Private Endpoints

For enhanced security in production:

```hcl
enable_private_endpoints = true
```

This creates private endpoints for:
- PostgreSQL database
- Storage accounts
- Key Vault

## Maintenance

### Regular Tasks

1. **Update Terraform Providers**
   ```bash
   terraform init -upgrade
   ```

2. **Review Security Updates**
   - Monitor Azure security advisories
   - Update PostgreSQL minor versions
   - Review Key Vault access logs

3. **Cost Review**
   - Monthly cost analysis
   - Resource utilization review
   - Scaling adjustments

### Terraform State Management

- State is stored locally (consider Azure Storage backend for teams)
- Use workspaces for environment isolation
- Regular state backups recommended

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Azure documentation
3. Check Terraform Azure provider documentation
4. Contact your DevOps team

## Next Steps

After infrastructure deployment:

1. **Deploy Application Code**
   - Set up CI/CD pipeline
   - Deploy Azure Functions
   - Deploy frontend to Static Web App

2. **Configure Monitoring**
   - Set up alerts
   - Create dashboards
   - Configure log queries

3. **Security Hardening**
   - Review access policies
   - Enable security features
   - Conduct security assessment

4. **Performance Optimization**
   - Monitor resource utilization
   - Optimize database queries
   - Configure caching strategies