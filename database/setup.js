const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Script de Setup do PostgreSQL
 * 1. Cria database se não existir
 * 2. Executa schema.sql
 * 3. Migra dados de JSON para PostgreSQL
 */

async function setup() {
  console.log('🚀 Iniciando setup do PostgreSQL...\n');

  // Conectar ao postgres (database padrão) para criar nossa database
  const dbName = process.env.DATABASE_URL?.split('/').pop() || 'chainguard_db';
  const baseUrl = process.env.DATABASE_URL?.replace(`/${dbName}`, '/postgres');

  const adminClient = new Client({ connectionString: baseUrl });

  try {
    await adminClient.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Criar database se não existir
    const dbCheck = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheck.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' criada`);
    } else {
      console.log(`ℹ️  Database '${dbName}' já existe`);
    }

    await adminClient.end();

    // Conectar à nossa database
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log(`✅ Conectado à database '${dbName}'`);

    // Executar schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('\n📋 Executando schema.sql...');
    await client.query(schema);
    console.log('✅ Schema criado com sucesso');

    // Migrar dados de networks.json
    await migrateNetworks(client);

    await client.end();
    console.log('\n🎉 Setup concluído com sucesso!');
    
  } catch (error) {
    console.error('\n❌ Erro no setup:', error.message);
    throw error;
  }
}

/**
 * Migrar networks.json para PostgreSQL
 */
async function migrateNetworks(client) {
  const networksPath = path.join(__dirname, '..', 'networks.json');
  
  if (!fs.existsSync(networksPath)) {
    console.log('ℹ️  networks.json não encontrado, usando dados padrão do schema');
    return;
  }

  try {
    const networksData = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
    const networks = Object.entries(networksData);

    if (networks.length === 0) {
      console.log('ℹ️  networks.json vazio');
      return;
    }

    console.log(`\n📦 Migrando ${networks.length} redes de networks.json...`);

    for (const [name, config] of networks) {
      try {
        await client.query(
          `INSERT INTO blockchain_networks (name, type, rpc, enabled) 
           VALUES ($1, $2, $3, true) 
           ON CONFLICT (name) DO UPDATE 
           SET type = $2, rpc = $3, enabled = true, updated_at = NOW()`,
          [name.toLowerCase(), config.type, config.rpc]
        );
        console.log(`  ✅ ${name}`);
      } catch (err) {
        console.log(`  ❌ ${name}: ${err.message}`);
      }
    }

    console.log('✅ Migração de networks.json concluída');
  } catch (error) {
    console.error('❌ Erro na migração de networks.json:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  setup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setup };
