const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testServer() {
  console.log('🧪 Testando servidor com PostgreSQL...\n');
  
  try {
    // Teste 1: Listar networks
    console.log('1️⃣ GET /api/networks');
    const networksRes = await axios.get(`${BASE_URL}/networks`);
    console.log(`✅ ${Object.keys(networksRes.data).length} networks encontradas`);
    console.log(`   Redes: ${Object.keys(networksRes.data).join(', ')}\n`);
    
    // Teste 2: Validação (esperado falhar - hash fake)
    console.log('2️⃣ POST /api/validate (hash fake)');
    const validateRes = await axios.post(`${BASE_URL}/validate`, {
      chain: 'ETH',
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    });
    console.log(`✅ Response: valid=${validateRes.data.valid}`);
    if (!validateRes.data.valid) {
      console.log(`   Error: ${validateRes.data.error}\n`);
    }
    
    // Teste 3: Validação real Ethereum
    console.log('3️⃣ POST /api/validate (hash real Ethereum)');
    const ethHash = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';
    const ethValidate = await axios.post(`${BASE_URL}/validate`, {
      chain: 'ethereum',
      hash: ethHash
    });
    console.log(`✅ Response: valid=${ethValidate.data.valid}`);
    if (ethValidate.data.cached) {
      console.log('   📦 Cache hit!');
    }
    
    // Aguardar para ver logs no terminal
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n✅ Todos os testes completados!');
    console.log('\n📊 Verifica o terminal do servidor para ver:');
    console.log('   - Queries PostgreSQL executadas');
    console.log('   - Logging de validações');
    console.log('   - RPC performance tracking');
    console.log('   - API request logging');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }
}

testServer();
