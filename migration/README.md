# DAT-Bolt Database Migration

This directory contains scripts and tools for migrating the DAT-Bolt application database from Supabase to Azure PostgreSQL.

## Overview

The migration process involves:

1. **Schema Conversion** - Converting Supabase-specific schema to Azure PostgreSQL
2. **Data Migration** - Transferring data from Supabase to Azure PostgreSQL
3. **Validation** - Ensuring data integrity and completeness
4. **Testing** - Verifying the migrated database works correctly

## Files

- `azure-schema.sql` - Converted PostgreSQL schema for Azure
- `migrate-data.js` - Data migration script
- `deploy-schema.js` - Schema deployment script
- `package.json` - Node.js dependencies
- `README.md` - This documentation

## Prerequisites

### Software Requirements

1. **Node.js** (18.x or later)
   ```bash
   node --version  # Should be 18.x or later
   ```

2. **Azure CLI** (logged in)
   ```bash
   az login
   az account show
   ```

3. **PostgreSQL Client** (optional, for manual testing)
   ```bash
   psql --version
   ```

### Access Requirements

1. **Supabase Access**
   - Supabase project URL
   - Service role key (for data export)

2. **Azure PostgreSQL Access**
   - Azure Database for PostgreSQL connection string
   - Database admin permissions

### Environment Variables

Create a `.env` file in this directory:

```bash
# Supabase (Source)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Azure PostgreSQL (Target)
AZURE_POSTGRESQL_CONNECTION_STRING="postgresql://username:password@server:port/database?sslmode=require"

# Optional
LOG_LEVEL=info  # debug, info, warn, error, silent
```

## Installation

1. **Navigate to migration directory**
   ```bash
   cd migration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   nano .env
   ```

## Migration Process

### Step 1: Schema Deployment

Deploy the converted schema to Azure PostgreSQL:

```bash
# Dry run to preview changes
node deploy-schema.js --dry-run

# Deploy schema (fresh database)
node deploy-schema.js

# Force deployment (existing database)
node deploy-schema.js --force
```

**Expected Output:**
```
[INFO] Starting schema deployment to Azure PostgreSQL...
[INFO] Connected to Azure PostgreSQL database
[INFO] Found 0 existing tables in database
[INFO] Loaded schema file: azure-schema.sql
[INFO] Deploying schema to Azure PostgreSQL...
[INFO] Schema deployment completed: 45 successful, 0 errors
[INFO] Created tables: AuditReports, incidents, reports, user_activities, user_profiles, user_stats, users
[INFO] Schema deployment completed successfully!
```

### Step 2: Data Migration

Migrate data from Supabase to Azure PostgreSQL:

```bash
# Dry run to preview migration
npm run migrate:dry-run

# Full migration
npm run migrate

# Migrate specific table
npm run migrate:table AuditReports
```

**Expected Output:**
```
[INFO] Starting DAT-Bolt data migration...
[INFO] Supabase client initialized
[INFO] Azure PostgreSQL client connected
[INFO] Creating users from user profiles...
[INFO] Created 15 users
[INFO] Starting migration for table: AuditReports
[INFO] Total records to migrate: 1250
[INFO] Progress: 1000/1250 records migrated
[INFO] Completed migration for table: AuditReports (1250 records)
[INFO] Migration completed successfully!
```

### Step 3: Validation

The migration script automatically validates the migration:

```bash
# Validation is included in the migration process
# Results are saved in migration-report-[timestamp].json
```

**Validation Checks:**
- Record counts match between source and target
- Data integrity verification
- Schema validation
- Performance baseline

## Migration Scripts

### deploy-schema.js

Deploys the converted database schema to Azure PostgreSQL.

**Usage:**
```bash
node deploy-schema.js [--dry-run] [--force]
```

**Options:**
- `--dry-run` - Preview changes without executing
- `--force` - Proceed even if database contains existing tables

### migrate-data.js

Migrates data from Supabase to Azure PostgreSQL.

**Usage:**
```bash
node migrate-data.js [--dry-run] [--table=table_name]
```

**Options:**
- `--dry-run` - Preview migration without transferring data
- `--table=name` - Migrate only a specific table

**Features:**
- Batch processing for large datasets
- Automatic retry on transient failures
- Progress monitoring
- Data transformation during migration
- Comprehensive validation

## Data Transformations

The migration includes several data transformations:

### User Management
- Creates `users` table to replace Supabase `auth.users`
- Maps user profiles to new user records
- Generates placeholder emails where needed

### AuditReports
- Ensures all required fields have default values
- Converts JSON data structures
- Maintains referential integrity

### Incidents & Reports
- Maps status enums correctly
- Preserves relationships between tables
- Updates timestamps to match Azure format

## Troubleshooting

### Common Issues

#### 1. Connection Failures

**Error:** `Failed to initialize clients`

**Solutions:**
- Verify environment variables are set correctly
- Check network connectivity to both Supabase and Azure
- Ensure SSL settings are correct for Azure PostgreSQL

```bash
# Test Azure connection
psql "$AZURE_POSTGRESQL_CONNECTION_STRING" -c "SELECT version();"
```

#### 2. Permission Errors

**Error:** `permission denied for table`

**Solutions:**
- Ensure database user has CREATE/INSERT/UPDATE permissions
- Check that the database exists
- Verify connection string includes correct database name

#### 3. Schema Conflicts

**Error:** `relation already exists`

**Solutions:**
- Use `--force` flag to overwrite existing schema
- Drop existing tables manually
- Use a fresh database

```sql
-- Drop all tables (careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

#### 4. Data Type Errors

**Error:** `invalid input syntax for type`

**Solutions:**
- Check data transformation logic
- Review source data for inconsistencies
- Update transformation functions

### Debug Mode

Enable debug logging for detailed information:

```bash
LOG_LEVEL=debug node migrate-data.js --dry-run
```

### Manual Verification

Verify migration manually:

```sql
-- Check record counts
SELECT 'AuditReports' as table_name, COUNT(*) as count FROM "AuditReports"
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'incidents', COUNT(*) FROM incidents;

-- Check data samples
SELECT * FROM "AuditReports" LIMIT 5;
SELECT * FROM users LIMIT 5;
```

## Performance Considerations

### Batch Size

Adjust batch size based on your data size and network:

```javascript
// In migrate-data.js
const CONFIG = {
  batchSize: 1000,  // Reduce for slower networks, increase for faster
  // ...
};
```

### Indexing

The schema includes optimized indexes:
- Primary keys on all tables
- Foreign key indexes
- Query-specific indexes for common operations

### Monitoring

Monitor migration progress:
- Check Azure PostgreSQL metrics
- Monitor connection counts
- Watch for query performance issues

## Post-Migration Tasks

### 1. Update Application Configuration

Update your application to use Azure PostgreSQL:

```javascript
// Replace Supabase client with PostgreSQL client
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.AZURE_POSTGRESQL_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false }
});
```

### 2. Test Application Functionality

- User authentication
- Data retrieval
- Report generation
- Incident management

### 3. Performance Optimization

- Review query performance
- Adjust indexes if needed
- Configure connection pooling
- Set up monitoring

### 4. Backup Strategy

Set up automated backups:
- Azure Database backup retention
- Point-in-time recovery testing
- Cross-region backup replication

## Rollback Procedure

If migration issues occur:

### 1. Stop Application

Prevent new data from being written.

### 2. Restore from Backup

```bash
# If you took a backup before migration
pg_restore -d $AZURE_DATABASE backup-file.sql
```

### 3. Revert Application Configuration

Point application back to Supabase temporarily.

### 4. Investigate Issues

- Review migration logs
- Check data integrity
- Identify transformation problems

## Migration Checklist

- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Schema deployment tested (dry-run)
- [ ] Schema deployed successfully
- [ ] Data migration tested (dry-run)
- [ ] Data migration completed
- [ ] Validation passed
- [ ] Application configuration updated
- [ ] Functionality testing completed
- [ ] Performance testing completed
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Documentation updated

## Support

For migration issues:

1. Check the troubleshooting section above
2. Review migration logs and reports
3. Test individual components
4. Contact your database administrator
5. Refer to Azure PostgreSQL documentation

## Files Generated

The migration process generates several files:

- `migration-report-[timestamp].json` - Detailed migration results
- `schema-deployment-report-[timestamp].json` - Schema deployment results
- Log files (if configured)

Keep these files for audit and troubleshooting purposes.