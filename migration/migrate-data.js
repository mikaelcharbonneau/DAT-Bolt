#!/usr/bin/env node

/**
 * DAT-Bolt Data Migration Script
 * Migrates data from Supabase to Azure PostgreSQL
 * 
 * Usage: node migrate-data.js [--dry-run] [--table=table_name]
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Source Supabase URL
 * - SUPABASE_SERVICE_KEY: Source Supabase service role key
 * - AZURE_POSTGRESQL_CONNECTION_STRING: Target Azure PostgreSQL connection string
 */

const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  specificTable: process.argv.find(arg => arg.startsWith('--table='))?.split('=')[1],
  batchSize: 1000,
  logLevel: process.env.LOG_LEVEL || 'info'
};

// Logger
const logger = {
  info: (msg) => CONFIG.logLevel !== 'silent' && console.log(`[INFO] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  debug: (msg) => CONFIG.logLevel === 'debug' && console.log(`[DEBUG] ${msg}`)
};

// Initialize clients
let supabaseClient;
let azureClient;

async function initializeClients() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    logger.info('Supabase client initialized');
    
    // Initialize Azure PostgreSQL client
    const azureConnectionString = process.env.AZURE_POSTGRESQL_CONNECTION_STRING;
    
    if (!azureConnectionString) {
      throw new Error('AZURE_POSTGRESQL_CONNECTION_STRING environment variable is required');
    }
    
    azureClient = new Client({
      connectionString: azureConnectionString,
      ssl: { rejectUnauthorized: false }
    });
    
    await azureClient.connect();
    logger.info('Azure PostgreSQL client connected');
    
  } catch (error) {
    logger.error(`Failed to initialize clients: ${error.message}`);
    process.exit(1);
  }
}

// Table migration configurations
const tableMigrations = {
  'AuditReports': {
    sourceTable: 'AuditReports',
    targetTable: 'AuditReports',
    transform: (row) => ({
      Id: row.Id,
      UserEmail: row.UserEmail,
      GeneratedBy: row.GeneratedBy || row.UserEmail,
      Timestamp: row.Timestamp,
      datacenter: row.datacenter || 'Unknown',
      datahall: row.datahall || 'Unknown',
      issues_reported: row.issues_reported || 0,
      state: row.state || 'Healthy',
      walkthrough_id: row.walkthrough_id || Math.floor(Math.random() * 10000),
      user_full_name: row.user_full_name || 'Unknown User',
      ReportData: row.ReportData || {}
    }),
    columns: [
      'Id', 'UserEmail', 'GeneratedBy', 'Timestamp', 'datacenter', 
      'datahall', 'issues_reported', 'state', 'walkthrough_id', 
      'user_full_name', 'ReportData'
    ]
  },
  
  'user_profiles': {
    sourceTable: 'user_profiles',
    targetTable: 'user_profiles',
    transform: (row) => ({
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      phone: row.phone,
      department: row.department || 'Data Center Operations',
      updated_at: row.updated_at
    }),
    columns: ['user_id', 'full_name', 'avatar_url', 'phone', 'department', 'updated_at']
  },
  
  'user_activities': {
    sourceTable: 'user_activities',
    targetTable: 'user_activities',
    transform: (row) => ({
      id: row.id,
      user_id: row.user_id,
      type: row.type,
      description: row.description,
      created_at: row.created_at
    }),
    columns: ['id', 'user_id', 'type', 'description', 'created_at']
  },
  
  'user_stats': {
    sourceTable: 'user_stats',
    targetTable: 'user_stats',
    transform: (row) => ({
      user_id: row.user_id,
      walkthroughs_completed: row.walkthroughs_completed || 0,
      issues_resolved: row.issues_resolved || 0,
      reports_generated: row.reports_generated || 0,
      updated_at: row.updated_at
    }),
    columns: ['user_id', 'walkthroughs_completed', 'issues_resolved', 'reports_generated', 'updated_at']
  },
  
  'incidents': {
    sourceTable: 'incidents',
    targetTable: 'incidents',
    transform: (row) => ({
      id: row.id,
      location: row.location,
      datahall: row.datahall,
      description: row.description || '',
      severity: row.severity,
      status: row.status || 'open',
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_id: row.user_id
    }),
    columns: ['id', 'location', 'datahall', 'description', 'severity', 'status', 'created_at', 'updated_at', 'user_id']
  },
  
  'reports': {
    sourceTable: 'reports',
    targetTable: 'reports',
    transform: (row) => ({
      id: row.id,
      title: row.title,
      generated_by: row.generated_by,
      generated_at: row.generated_at,
      date_range_start: row.date_range_start,
      date_range_end: row.date_range_end,
      datacenter: row.datacenter,
      datahall: row.datahall,
      status: row.status || 'draft',
      total_incidents: row.total_incidents || 0,
      report_data: row.report_data || {}
    }),
    columns: ['id', 'title', 'generated_by', 'generated_at', 'date_range_start', 'date_range_end', 'datacenter', 'datahall', 'status', 'total_incidents', 'report_data']
  }
};

async function migrateTable(tableName, config) {
  logger.info(`Starting migration for table: ${tableName}`);
  
  try {
    // Count total records
    const { count: totalRecords } = await supabaseClient
      .from(config.sourceTable)
      .select('*', { count: 'exact', head: true });
    
    logger.info(`Total records to migrate: ${totalRecords}`);
    
    if (totalRecords === 0) {
      logger.warn(`No data found in table ${tableName}`);
      return { success: true, recordsMigrated: 0 };
    }
    
    let recordsMigrated = 0;
    let offset = 0;
    
    while (offset < totalRecords) {
      // Fetch batch from Supabase
      const { data: sourceData, error: fetchError } = await supabaseClient
        .from(config.sourceTable)
        .select('*')
        .range(offset, offset + CONFIG.batchSize - 1)
        .order('created_at', { ascending: true });
      
      if (fetchError) {
        throw new Error(`Failed to fetch data from ${tableName}: ${fetchError.message}`);
      }
      
      if (!sourceData || sourceData.length === 0) {
        break;
      }
      
      // Transform data
      const transformedData = sourceData.map(config.transform);
      
      if (CONFIG.dryRun) {
        logger.info(`[DRY RUN] Would insert ${transformedData.length} records into ${config.targetTable}`);
        logger.debug(`Sample record: ${JSON.stringify(transformedData[0], null, 2)}`);
      } else {
        // Insert into Azure PostgreSQL
        await insertBatch(config.targetTable, transformedData, config.columns);
      }
      
      recordsMigrated += transformedData.length;
      offset += CONFIG.batchSize;
      
      logger.info(`Progress: ${recordsMigrated}/${totalRecords} records migrated`);
    }
    
    logger.info(`Completed migration for table: ${tableName} (${recordsMigrated} records)`);
    return { success: true, recordsMigrated };
    
  } catch (error) {
    logger.error(`Failed to migrate table ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function insertBatch(tableName, data, columns) {
  if (data.length === 0) return;
  
  try {
    // Generate placeholders for prepared statement
    const placeholders = data.map((_, rowIndex) => {
      const rowPlaceholders = columns.map((_, colIndex) => 
        `$${rowIndex * columns.length + colIndex + 1}`
      ).join(', ');
      return `(${rowPlaceholders})`;
    }).join(', ');
    
    // Generate column names with proper quoting
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    
    // Flatten data for prepared statement
    const values = data.flatMap(row => 
      columns.map(col => {
        const value = row[col];
        // Handle JSON objects
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return value;
      })
    );
    
    const query = `
      INSERT INTO "${tableName}" (${columnNames})
      VALUES ${placeholders}
      ON CONFLICT DO NOTHING
    `;
    
    await azureClient.query(query, values);
    logger.debug(`Inserted ${data.length} records into ${tableName}`);
    
  } catch (error) {
    logger.error(`Failed to insert batch into ${tableName}: ${error.message}`);
    throw error;
  }
}

async function createUsersFromProfiles() {
  logger.info('Creating users from user profiles...');
  
  try {
    // This is a special case since Supabase uses auth.users which we can't access directly
    // We'll create users based on user_profiles and AuditReports data
    
    const { data: profiles } = await supabaseClient
      .from('user_profiles')
      .select('*');
    
    const { data: auditReports } = await supabaseClient
      .from('AuditReports')
      .select('UserEmail, user_full_name')
      .not('UserEmail', 'is', null);
    
    // Combine data to create unique users
    const userMap = new Map();
    
    // Add users from profiles
    profiles?.forEach(profile => {
      if (profile.user_id && !userMap.has(profile.user_id)) {
        userMap.set(profile.user_id, {
          id: profile.user_id,
          email: `user-${profile.user_id.slice(0, 8)}@temp.local`, // Placeholder email
          full_name: profile.full_name,
          department: profile.department
        });
      }
    });
    
    // Add users from audit reports
    auditReports?.forEach(report => {
      const email = report.UserEmail;
      if (email && !Array.from(userMap.values()).some(u => u.email === email)) {
        userMap.set(email, {
          id: require('crypto').randomUUID(),
          email: email,
          full_name: report.user_full_name || 'Unknown User',
          department: 'Data Center Operations'
        });
      }
    });
    
    const users = Array.from(userMap.values());
    
    if (CONFIG.dryRun) {
      logger.info(`[DRY RUN] Would create ${users.length} users`);
      logger.debug(`Sample user: ${JSON.stringify(users[0], null, 2)}`);
      return { success: true, recordsMigrated: users.length };
    }
    
    // Insert users
    for (const user of users) {
      try {
        await azureClient.query(
          `INSERT INTO users (id, email, full_name, department, is_active, created_at, email_confirmed_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (email) DO NOTHING`,
          [user.id, user.email, user.full_name, user.department, true, new Date(), new Date()]
        );
      } catch (error) {
        logger.warn(`Failed to insert user ${user.email}: ${error.message}`);
      }
    }
    
    logger.info(`Created ${users.length} users`);
    return { success: true, recordsMigrated: users.length };
    
  } catch (error) {
    logger.error(`Failed to create users: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function validateMigration() {
  logger.info('Validating migration...');
  
  const results = {};
  
  for (const [tableName, config] of Object.entries(tableMigrations)) {
    try {
      // Count records in source
      const { count: sourceCount } = await supabaseClient
        .from(config.sourceTable)
        .select('*', { count: 'exact', head: true });
      
      // Count records in target
      const targetResult = await azureClient.query(`SELECT COUNT(*) FROM "${config.targetTable}"`);
      const targetCount = parseInt(targetResult.rows[0].count);
      
      results[tableName] = {
        source: sourceCount || 0,
        target: targetCount,
        match: (sourceCount || 0) === targetCount
      };
      
      logger.info(`${tableName}: Source=${results[tableName].source}, Target=${results[tableName].target}, Match=${results[tableName].match}`);
      
    } catch (error) {
      logger.error(`Failed to validate ${tableName}: ${error.message}`);
      results[tableName] = { error: error.message };
    }
  }
  
  return results;
}

async function generateMigrationReport(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(__dirname, `migration-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: CONFIG.dryRun,
    results: results,
    summary: {
      totalTables: Object.keys(results).length,
      successfulTables: Object.values(results).filter(r => r.success).length,
      failedTables: Object.values(results).filter(r => !r.success).length,
      totalRecordsMigrated: Object.values(results)
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.recordsMigrated || 0), 0)
    }
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  logger.info(`Migration report saved to: ${reportPath}`);
  
  return report;
}

async function main() {
  logger.info('Starting DAT-Bolt data migration...');
  logger.info(`Configuration: ${JSON.stringify(CONFIG, null, 2)}`);
  
  try {
    await initializeClients();
    
    const results = {};
    const tablesToMigrate = CONFIG.specificTable 
      ? { [CONFIG.specificTable]: tableMigrations[CONFIG.specificTable] }
      : tableMigrations;
    
    // First, create users (special case)
    results.users = await createUsersFromProfiles();
    
    // Migrate tables in dependency order
    const migrationOrder = ['user_profiles', 'user_activities', 'user_stats', 'AuditReports', 'incidents', 'reports'];
    
    for (const tableName of migrationOrder) {
      if (tablesToMigrate[tableName]) {
        results[tableName] = await migrateTable(tableName, tablesToMigrate[tableName]);
      }
    }
    
    // Validate migration if not dry run
    if (!CONFIG.dryRun) {
      logger.info('Validating migration...');
      const validation = await validateMigration();
      results.validation = validation;
    }
    
    // Generate report
    const report = await generateMigrationReport(results);
    
    logger.info('Migration completed successfully!');
    logger.info(`Summary: ${report.summary.totalRecordsMigrated} records migrated across ${report.summary.successfulTables} tables`);
    
    if (report.summary.failedTables > 0) {
      logger.warn(`${report.summary.failedTables} tables had migration failures`);
      process.exit(1);
    }
    
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  } finally {
    if (azureClient) {
      await azureClient.end();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (azureClient) {
    await azureClient.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (azureClient) {
    await azureClient.end();
  }
  process.exit(0);
});

// Run the migration
if (require.main === module) {
  main().catch(error => {
    logger.error(`Unhandled error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, tableMigrations };