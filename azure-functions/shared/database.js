const { Pool } = require('pg');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

class DatabaseConnection {
  constructor() {
    this.pool = null;
    this.secretClient = null;
    this.connectionString = null;
  }

  async initialize() {
    if (this.pool) {
      return this.pool;
    }

    try {
      // Get connection string from environment or Key Vault
      this.connectionString = await this.getConnectionString();
      
      // Create connection pool
      this.pool = new Pool({
        connectionString: this.connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('Database pool initialized successfully');
      return this.pool;

    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  async getConnectionString() {
    // First, try to get from environment variable
    if (process.env.AZURE_POSTGRESQL_CONNECTION_STRING) {
      return process.env.AZURE_POSTGRESQL_CONNECTION_STRING;
    }

    // If not in environment, try Key Vault
    try {
      if (!this.secretClient) {
        const keyVaultName = process.env.KEY_VAULT_NAME;
        if (!keyVaultName) {
          throw new Error('KEY_VAULT_NAME environment variable is required');
        }

        const credential = new DefaultAzureCredential();
        const vaultUrl = `https://${keyVaultName}.vault.azure.net/`;
        this.secretClient = new SecretClient(vaultUrl, credential);
      }

      const secret = await this.secretClient.getSecret('postgresql-connection-string');
      return secret.value;

    } catch (error) {
      console.error('Failed to get connection string from Key Vault:', error);
      throw new Error('Could not retrieve database connection string');
    }
  }

  async getClient() {
    if (!this.pool) {
      await this.initialize();
    }
    return await this.pool.connect();
  }

  async query(text, params) {
    if (!this.pool) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async transaction(callback) {
    if (!this.pool) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance
const database = new DatabaseConnection();

module.exports = {
  database,
  DatabaseConnection
};