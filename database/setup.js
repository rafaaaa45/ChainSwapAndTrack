const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  console.log('🚀 Iniciando setup FORÇADO do PostgreSQL...\n');

  const dbName = process.env.DATABASE_URL?.split('/').pop() || 'chainguard_db';
  const baseUrl = process.env.DATABASE_URL?.replace(`/${dbName}`, '/postgres');

  const adminClient = new Client({ connectionString: baseUrl });

  try {
    await adminClient.connect();
    const dbCheck = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbCheck.rowCount === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database criada`);
    }
    await adminClient.end();

    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    // 1. GARANTIR QUE A TABELA EXISTE
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await client.query(schema);
        console.log('✅ Schema aplicado');
    } else {
        // Fallback caso o ficheiro schema não esteja acessível
        await client.query(`
            CREATE TABLE IF NOT EXISTS blockchain_networks (
                id SERIAL PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                type TEXT NOT NULL,
                rpc TEXT NOT NULL,
                enabled BOOLEAN DEFAULT true,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    }

    // 2. INSERIR ALCHEMY COMO DEFAULT (Com Correção de Array para o Postgres)
    const ethRpc = process.env.ALCHEMY_ETH_RPC || "https://eth.drpc.org";
    
    console.log(`🛡️  Configurando Ethereum Default...`);
    
    // O Postgres espera {valor} se a coluna for um array
    const rpcValue = `{${ethRpc}}`; 

    await client.query(
        `INSERT INTO blockchain_networks (name, type, rpc, enabled) 
         VALUES ($1, $2, $3, true) 
         ON CONFLICT (name) DO UPDATE SET rpc = $3, enabled = true`,
        ['ethereum', 'evm', rpcValue]
    );

    // 3. VERIFICAR SE ESTÁ LÁ
    const check = await client.query('SELECT name FROM blockchain_networks');
    console.log(`📊 Total de redes na BD: ${check.rowCount}`);
    check.rows.forEach(r => console.log(`   - ${r.name}`));

    await client.end();
    console.log('\n🎉 Setup concluído!');
    
  } catch (error) {
    console.error('\n❌ Erro no setup:', error.message);
    process.exit(1);
  }
}

setup();