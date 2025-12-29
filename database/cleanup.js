const db = require('./db');
const { networkRepository } = require('./repositories');

async function cleanup() {
  try {
    console.log('🧹 Limpeza da database...\n');
    
    // Desabilitar todas as networks
    const all = await networkRepository.getAll();
    for (const net of all) {
      await networkRepository.disable(net.name);
      console.log(`❌ Removido: ${net.name}`);
    }
    console.log('\n✅ Todas as networks removidas!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.close();
  }
}

async function cleanupNetworks() {
  // Remove redes com nome ou tipo inválido
  await db.query("DELETE FROM blockchain_networks WHERE name IN ('error', 'undefined') OR type IN ('error', 'undefined')");
  // Remove redes desabilitadas
  await db.query("DELETE FROM blockchain_networks WHERE enabled = false");
  // Limpar histórico de validações
  await db.query("DELETE FROM validation_history");
  // Limpar performance de RPCs
  await db.query("DELETE FROM rpc_performance");
  // Limpar logs de API
  await db.query("DELETE FROM api_logs");
  console.log('Limpeza completa da base de dados.');
  await db.close();
}

cleanupNetworks();
cleanup();
