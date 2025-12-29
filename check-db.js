const db = require('./database/db');
const { 
  validationRepository, 
  rpcPerformanceRepository,
  apiLogRepository 
} = require('./database/repositories');

async function checkDatabase() {
  try {
    console.log('📊 Verificando estado da database...\n');
    
    // API Logs
    console.log('1️⃣ API Logs');
    const apiLogs = await apiLogRepository.getRecent(10);
    console.log(`   ${apiLogs.length} requests logados`);
    apiLogs.forEach(log => {
      console.log(`   - ${log.method} ${log.endpoint}: ${log.status_code} (${log.response_time_ms}ms)`);
    });
    
    // Validation History
    console.log('\n2️⃣ Validation History');
    const validations = await validationRepository.getRecent(10);
    console.log(`   ${validations.length} validações logadas`);
    validations.forEach(val => {
      console.log(`   - ${val.chain}: ${val.tx_hash.substring(0, 16)}... [${val.found ? '✅' : '❌'}] (${val.response_time_ms}ms)`);
    });
    
    // RPC Performance
    console.log('\n3️⃣ RPC Performance');
    const rpcHealth = await rpcPerformanceRepository.getHealthScores();
    console.log(`   ${rpcHealth.length} RPCs tracked`);
    rpcHealth.slice(0, 5).forEach(rpc => {
      console.log(`   - ${rpc.chain}/${rpc.rpc_url.substring(0, 30)}...: ${rpc.success_rate}% success, ${rpc.avg_response_time_ms}ms avg`);
    });
    
    console.log('\n✅ Database check completo!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.close();
  }
}

checkDatabase();
