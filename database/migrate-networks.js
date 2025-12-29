const db = require('./db');
const { networkRepository } = require('./repositories');
const fs = require('fs');
const path = require('path');

async function migrateNetworks() {
  try {
    console.log('📥 Lendo networks.json...');
    const networksPath = path.join(__dirname, '..', 'networks.json');
    const networksData = JSON.parse(fs.readFileSync(networksPath, 'utf8'));
    
    console.log(`📊 Encontrados ${Object.keys(networksData).length} networks`);
    
    for (const [name, config] of Object.entries(networksData)) {
      const rpcs = Array.isArray(config.rpc) ? config.rpc : [config.rpc];
      
      console.log(`  ➕ ${name}: ${config.type} com ${rpcs.length} RPC(s)`);
      
      // Verificar se já existe
      const existing = await networkRepository.getByName(name);
      if (existing) {
        console.log(`     ⚠️  Já existe - atualizando RPCs`);
        await networkRepository.updateRpcs(name, rpcs);
      } else {
        await networkRepository.create(name, config.type, rpcs);
      }
    }
    
    console.log('\n✅ Migração completa!');
    
    // Mostrar resultado
    const all = await networkRepository.getAll();
    console.log(`\n📋 Total na database: ${all.length} networks`);
    all.forEach(net => {
      console.log(`   - ${net.name}: ${net.type} [${net.rpc.length} RPCs]`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    await db.close();
  }
}

migrateNetworks();
