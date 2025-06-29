#!/usr/bin/env node

/**
 * Schema Deployment Script for Azure PostgreSQL
 * Deploys the converted schema to Azure Database for PostgreSQL
 * 
 * Usage: node deploy-schema.js [--dry-run] [--force]
 * 
 * Environment Variables Required:
 * - AZURE_POSTGRESQL_CONNECTION_STRING: Target Azure PostgreSQL connection string
 */

require('dotenv').config();

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  force: process.argv.includes('--force'),
  schemaFile: path.join(__dirname, 'azure-schema.sql'),
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Logger
const logger = {
  info: (msg) => CONFIG.logLevel !== 'silent' && console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => CONFIG.logLevel === 'debug' && console.log(`[DEBUG] ${msg}`)
};

async function connectToDatabase() {
  const connectionString = process.env.AZURE_POSTGRESQL_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_POSTGRESQL_CONNECTION_STRING environment variable is required');
  }
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  await client.connect();
  logger.info('Connected to Azure PostgreSQL database');
  
  return client;
}

async function checkDatabaseExists(client) {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tableCount = parseInt(result.rows[0].table_count);
    logger.info(`Found ${tableCount} existing tables in database`);
    
    if (tableCount > 0 && !CONFIG.force) {
      const existingTables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      logger.warn('Database already contains tables:');
      existingTables.rows.forEach(row => logger.warn(`  - ${row.table_name}`));
      logger.warn('Use --force flag to proceed anyway');
      
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to check database: ${error.message}`);
    throw error;
  }
}

async function loadSchemaFile() {
  try {
    const schemaContent = await fs.readFile(CONFIG.schemaFile, 'utf8');
    logger.info(`Loaded schema file: ${CONFIG.schemaFile}`);
    logger.debug(`Schema file size: ${schemaContent.length} characters`);
    
    return schemaContent;
  } catch (error) {
    logger.error(`Failed to load schema file: ${error.message}`);
    throw error;
  }
}

function splitSQLStatements(sqlContent) {
  // Split SQL content into individual statements
  // This is a simple implementation - for production use, consider a proper SQL parser
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    .map(stmt => stmt + ';');
  
  logger.debug(`Split schema into ${statements.length} statements`);
  return statements;
}

async function executeStatement(client, statement, index) {
  try {
    if (CONFIG.dryRun) {
      logger.debug(`[DRY RUN] Statement ${index + 1}: ${statement.substring(0, 100)}...`);
      return;
    }
    
    await client.query(statement);
    logger.debug(`Executed statement ${index + 1} successfully`);
  } catch (error) {
    // Log the error but continue with other statements for some types of errors
    if (error.message.includes('already exists') && CONFIG.force) {
      logger.warn(`Statement ${index + 1} failed (already exists): ${error.message}`);
    } else {
      logger.error(`Statement ${index + 1} failed: ${error.message}`);
      logger.error(`Statement content: ${statement.substring(0, 200)}...`);
      throw error;
    }
  }
}

async function deploySchema(client, schemaContent) {
  logger.info('Deploying schema to Azure PostgreSQL...');
  
  const statements = splitSQLStatements(schemaContent);
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    try {
      await executeStatement(client, statements[i], i);
      successCount++;
    } catch (error) {
      errorCount++;
      if (!CONFIG.force) {
        throw error;
      }
    }
  }
  
  logger.info(`Schema deployment completed: ${successCount} successful, ${errorCount} errors`);
  
  if (errorCount > 0 && !CONFIG.force) {
    throw new Error(`Schema deployment failed with ${errorCount} errors`);
  }
  
  return { successCount, errorCount };
}

async function validateDeployment(client) {
  logger.info('Validating schema deployment...');
  
  try {
    // Check that expected tables exist
    const expectedTables = [
      'users',
      'user_profiles', 
      'user_activities',
      'user_stats',
      'AuditReports',
      'incidents',
      'reports'
    ];
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name = ANY($1)
      ORDER BY table_name
    `, [expectedTables]);
    
    const createdTables = result.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !createdTables.includes(table));
    
    logger.info(`Created tables: ${createdTables.join(', ')}`);
    
    if (missingTables.length > 0) {
      logger.warn(`Missing tables: ${missingTables.join(', ')}`);
    }
    
    // Check functions
    const functionsResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_type = 'FUNCTION'
      AND routine_name IN ('upsert_user_profile', 'log_user_activity', 'update_updated_at_column')
    `);
    
    const createdFunctions = functionsResult.rows.map(row => row.routine_name);
    logger.info(`Created functions: ${createdFunctions.join(', ')}`);
    
    // Check views
    const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
      AND table_name = 'user_dashboard'
    `);
    
    const createdViews = viewsResult.rows.map(row => row.table_name);
    logger.info(`Created views: ${createdViews.join(', ')}`);
    
    // Check enums
    const enumsResult = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      AND typname IN ('activity_type', 'incident_severity', 'incident_status')
    `);
    
    const createdEnums = enumsResult.rows.map(row => row.typname);
    logger.info(`Created enums: ${createdEnums.join(', ')}`);
    
    const validation = {
      tables: { created: createdTables, missing: missingTables },
      functions: createdFunctions,
      views: createdViews,
      enums: createdEnums,
      success: missingTables.length === 0
    };
    
    return validation;
    
  } catch (error) {
    logger.error(`Validation failed: ${error.message}`);
    throw error;
  }
}

async function generateDeploymentReport(deployment, validation) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `schema-deployment-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: CONFIG.dryRun,
    force: CONFIG.force,
    deployment: deployment,
    validation: validation,
    summary: {
      success: deployment.errorCount === 0 && (validation?.success !== false),
      statementsExecuted: deployment.successCount,
      errors: deployment.errorCount,
      tablesCreated: validation?.tables?.created?.length || 0,
      missingTables: validation?.tables?.missing?.length || 0
    }
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  logger.info(`Deployment report saved to: ${reportPath}`);
  
  return report;
}

async function main() {
  logger.info('Starting schema deployment to Azure PostgreSQL...');
  logger.info(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
  
  let client;
  
  try {
    // Connect to database
    client = await connectToDatabase();
    
    // Check if database is empty or if we should proceed
    const canProceed = await checkDatabaseExists(client);
    if (!canProceed) {
      logger.error('Database validation failed. Exiting.');
      process.exit(1);
    }
    
    // Load schema file
    const schemaContent = await loadSchemaFile();
    
    // Deploy schema
    const deployment = await deploySchema(client, schemaContent);
    
    // Validate deployment (skip for dry run)
    let validation = null;
    if (!CONFIG.dryRun) {
      validation = await validateDeployment(client);
    }
    
    // Generate report
    const report = await generateDeploymentReport(deployment, validation);
    
    if (CONFIG.dryRun) {
      logger.info('DRY RUN completed successfully!');
      logger.info('No changes were made to the database');
    } else {
      logger.info('Schema deployment completed successfully!');
      logger.info(`Summary: ${report.summary.statementsExecuted} statements executed, ${report.summary.tablesCreated} tables created`);
      
      if (report.summary.errors > 0) {
        logger.warn(`${report.summary.errors} errors occurred during deployment`);
      }
    }
    
    if (!report.summary.success) {
      process.exit(1);
    }
    
  } catch (error) {
    logger.error(`Schema deployment failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      logger.debug('Database connection closed');
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the deployment
if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };