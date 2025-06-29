# DAT-Bolt - HPE Audit Portal

A modern web application designed to facilitate, record, and report on audit workflows for datacenter operations. Built with React and powered by Microsoft Azure cloud infrastructure.

## 🏗️ Architecture

- **Frontend:** React 18.3.1 with TypeScript, Vite, Grommet UI (HPE Design System)
- **Backend:** Azure Functions (Premium Plan) with Node.js 20
- **Database:** Azure PostgreSQL with SSL
- **Infrastructure:** Terraform-managed Azure resources
- **CI/CD:** GitHub Actions
- **Security:** Azure Key Vault for secrets management

## ☁️ Azure Infrastructure

### Deployed Resources (25 total)
- **Function App:** `func-dat-bolt-v2-dev-0d0d0d0a` (Premium Plan EP1)
- **PostgreSQL:** `psql-dat-bolt-dev-61206194.postgres.database.azure.com`
- **Key Vault:** `kv-dat-bolt-dev-e5ab23a3`
- **Storage Account:** `stdatboltdev54c8b8d1`
- **Virtual Network:** Secure networking with private endpoints
- **Application Insights:** Monitoring and diagnostics

### Database Schema
- **Tables:** 7 tables including AuditReports, user_profiles, incidents, reports
- **Functions:** 3 PostgreSQL functions for logging and data management
- **Security:** Row Level Security (RLS) policies enabled

## 🚀 API Endpoints

All endpoints are hosted on Azure Functions:

- **Base URL:** `https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net/api/`

### Available Functions
- `GET /GetInspections` - Retrieve inspection data
- `POST /SubmitInspection` - Submit new inspection
- `POST /GenerateReport` - Generate audit reports
- `GET /MinimalTest` - Health check endpoint
- `GET /SimpleTest` - Basic connectivity test
- `GET /UltraSimple` - Ultra-minimal test endpoint

## 🛠️ Local Development

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Azure CLI (for deployment)
- Terraform (for infrastructure management)

### Frontend Setup
```bash
# Clone the repository
git clone https://github.com/mikaelcharbonneau/DAT-Bolt.git
cd DAT-Bolt

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

### Azure Functions Development
```bash
# Navigate to Azure Functions directory
cd azure-functions

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Environment Variables
Create a `.env.local` file in the root directory:
```env
# Azure Function URLs
VITE_API_BASE_URL=https://func-dat-bolt-v2-dev-0d0d0d0a.azurewebsites.net/api

# If using Supabase for authentication (legacy)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🚢 Deployment

### Automatic Deployment
The project uses GitHub Actions for continuous deployment:

- **Trigger:** Push to `main` branch with changes in `azure-functions/` directory
- **Workflow:** `.github/workflows/main_func-dat-bolt-v2-dev-0d0d0d0a.yml`
- **Target:** Azure Functions Premium Plan

### Manual Deployment
```bash
# Deploy Azure Functions
cd azure-functions
func azure functionapp publish func-dat-bolt-v2-dev-0d0d0d0a

# Deploy infrastructure changes
cd terraform
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

## 📁 Project Structure
```
DAT-Bolt/
├── src/                          # React frontend source
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
├── azure-functions/             # Azure Functions backend
│   ├── GetInspections/          # Inspection retrieval function
│   ├── SubmitInspection/        # Inspection submission function
│   ├── GenerateReport/          # Report generation function
│   └── shared/                  # Shared utilities
├── terraform/                   # Infrastructure as Code
│   ├── main.tf                  # Main Terraform configuration
│   ├── variables.tf             # Variable definitions
│   └── environments/           # Environment-specific configs
├── migration/                   # Database migration scripts
└── .github/workflows/          # GitHub Actions CI/CD
```

## 🔧 Infrastructure Management

### Terraform Commands
```bash
cd terraform

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file="environments/dev.tfvars"

# Apply changes
terraform apply -var-file="environments/dev.tfvars"

# Destroy infrastructure (careful!)
terraform destroy -var-file="environments/dev.tfvars"
```

### Database Management
```bash
cd migration

# Install dependencies
npm install

# Test database connection
node test-connection.js

# Deploy schema changes
node deploy-schema.js

# Create test user
node create-test-user.js
```

## 🔐 Security

- **Authentication:** JWT-based authentication
- **Database:** SSL-enforced connections
- **Secrets:** Azure Key Vault integration
- **Network:** Virtual Network with private endpoints
- **CORS:** Configured for secure cross-origin requests

## 📊 Monitoring

- **Application Insights:** Real-time performance monitoring
- **Function Logs:** Available via Azure Portal or CLI
- **Database Metrics:** PostgreSQL performance insights

### Viewing Logs
```bash
# Stream Function App logs
az functionapp log tail --name func-dat-bolt-v2-dev-0d0d0d0a --resource-group rg-dat-bolt-dev

# View specific function logs in Azure Portal
https://portal.azure.com -> Function Apps -> func-dat-bolt-v2-dev-0d0d0d0a -> Functions
```

## 🧪 Testing

### Frontend Testing
```bash
npm run lint              # ESLint checks
npm run build            # Production build test
```

### API Testing
```bash
cd migration
node test-api.js         # Test API endpoints
```

## 📚 Documentation

- **Azure Migration Guide:** `AZURE_MIGRATION_GUIDE.md`
- **Database Schema:** `migration/azure-schema.sql`
- **API Documentation:** Function-specific README files

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test locally
4. Submit a pull request
5. GitHub Actions will automatically deploy approved changes

## 📝 License

This project is for internal HPE use only.

## 🆘 Support

For issues and questions:
- Check Azure Portal for function logs and metrics
- Review GitHub Actions workflow runs
- Check Application Insights for performance issues
- Contact the development team

## ✅ Migration Status

- ✅ Infrastructure deployed (25 Azure resources)
- ✅ Database schema migrated
- ✅ Azure Functions deployed (6 functions)
- ✅ GitHub Actions CI/CD configured
- ✅ Test user created
- 🔄 Function runtime issues being resolved
