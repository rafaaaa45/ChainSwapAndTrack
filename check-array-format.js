const { networkRepository } = require('./database/repositories');
const db = require('./database/db');

async function checkArrays() {
  try {
    console.log('🔍 Verificando formato dos arrays...\n');
    
    const networks = await networkRepository.getAll();
    
    networks.forEach(net => {
      console.log(`📡 ${net.name.toUpperCase()}`);
      console.log(`   Type: ${net.type}`);
      console.log(`   RPC array: ${Array.isArray(net.rpc) ? '✅ É array JavaScript' : '❌ NÃO é array'}`);
      console.log(`   RPC[0]: ${net.rpc[0]}`);
      console.log(`   Total RPCs: ${net.rpc.length}`);
      
      if (net.rpc.length > 1) {
        net.rpc.forEach((rpc, i) => {
          console.log(`   RPC[${i}]: ${rpc}`);
        });
      }
      console.log();
    });
    
    console.log('✅ PostgreSQL TEXT[] → JavaScript Array automático!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.close();
  }
}

checkArrays();
