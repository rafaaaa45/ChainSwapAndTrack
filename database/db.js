const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Connection Pool
 * Singleton pattern - reutiliza conexões
 */
class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // máximo de conexões simultâneas
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Event handlers para debugging
    this.pool.on('connect', () => {
      console.log('✅ Nova conexão PostgreSQL estabelecida');
    });

    this.pool.on('error', (err) => {
      console.error('❌ Erro inesperado no pool PostgreSQL:', err);
    });
  }

  /**
   * Executar query simples
   */
  async query(text, params) {
    return await this.pool.query(text, params);
  }

  /**
   * Obter cliente para transações
   */
  async getClient() {
    return await this.pool.connect();
  }

  /**
   * Executar transação
   */
  async transaction(callback) {
    const client = await this.getClient();
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

  /**
   * Fechar pool (para testes ou shutdown)
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT NOW() as now, version() as version');
      return {
        healthy: true,
        timestamp: result.rows[0].now,
        version: result.rows[0].version
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
const db = new Database();

module.exports = db;
