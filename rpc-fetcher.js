const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * RPC FETCHER - Obter RPCs públicos de chainlist.org
 * 
 * Sistema de cache em 3 camadas:
 * 1. Memory cache (super rápido)
 * 2. File cache (persiste entre restarts)
 * 3. Fallback hardcoded (garantia absoluta)
 */

// Cache em memória
let chainsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas
const CACHE_FILE = path.join(__dirname, 'chains-cache.json');

// RPCs públicos conhecidos (fallback)
// Fallback RPCs hardcoded (garantia absoluta)
const FALLBACK_RPCS = {
  // Exemplo: 'ethereum': ['https://mainnet.infura.io/v3/xxx', ...]
  ethereum: [
    'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    'https://rpc.ankr.com/eth',
    'https://cloudflare-eth.com'
  ],
  polygon: [
    'https://polygon-rpc.com',
    'https://rpc-mainnet.maticvigil.com'
  ],
  // Adicione outros chains conforme necessário
};

/**
 * Obter dados do chainlist com sistema de cache
 */
async function getChainsData() {
  // 1. MEMORY CACHE (mais rápido)
  if (chainsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    console.log('📦 Usando cache em memória');
    return chainsCache;
  }

  let cachedData = null;
  let cacheExpired = false;

  // 2. FILE CACHE (persiste entre restarts)
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const fileContent = fs.readFileSync(CACHE_FILE, 'utf8');
      const cached = JSON.parse(fileContent);
      
      if (cached.timestamp && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('📁 Usando cache de ficheiro válido');
        chainsCache = cached.data;
        cacheTimestamp = cached.timestamp;
        return chainsCache;
      } else {
        console.log('⏰ Cache expirado, a tentar atualizar...');
        cachedData = cached.data; // Guarda para usar se falhar
        cacheExpired = true;
      }
    } catch (e) {
      console.log('⚠️ Erro ao ler cache:', e.message);
    }
  }

  // 3. FETCH DO CHAINLIST (atualização)
  try {
    console.log('🌐 A buscar dados atualizados do chainlist.org...');
    const url = 'https://chainid.network/chains.json';
    const response = await axios.get(url, { timeout: 10000 });
    
    // Guardar em memória
    chainsCache = response.data;
    cacheTimestamp = Date.now();
    
    // Guardar em ficheiro
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      data: chainsCache,
      timestamp: cacheTimestamp
    }));
    
    console.log(`✅ Cache atualizado: ${chainsCache.length} chains`);
    return chainsCache;
  } catch (error) {
    console.log(`❌ Erro ao buscar chainlist: ${error.message}`);
    
    // Se tinha cache antigo (mesmo expirado), usa-o!
    if (cachedData) {
      console.log('♻️ Usando cache desatualizado (melhor que nada)');
      chainsCache = cachedData;
      cacheTimestamp = Date.now() - CACHE_DURATION; // Marca como expirado
      return chainsCache;
    }
    
    return null;
  }
}

/**
 * Tenta obter RPCs do chainlist.org via sistema de cache
 * Busca inteligente com prioridades (evita falsos positivos)
 */
async function fetchFromChainlist(chainName) {
  try {
    const chains = await getChainsData();
    if (!chains) {
      return null;
    }
    
    const searchName = chainName.toUpperCase();
    let chain = null;
    
    // 1. MATCH EXATO: shortName ou symbol (prioridade máxima)
    chain = chains.find(c => 
      c.shortName?.toUpperCase() === searchName ||
      c.nativeCurrency?.symbol?.toUpperCase() === searchName
    );
    
    // 2. MATCH EXATO: nome completo
    if (!chain) {
      chain = chains.find(c => 
        c.name?.toUpperCase() === searchName
      );
    }
    
    // 3. COMEÇA COM: nome começa com o termo
    if (!chain) {
      chain = chains.find(c => 
        c.name?.toUpperCase().startsWith(searchName) ||
        c.shortName?.toUpperCase().startsWith(searchName)
      );
    }
    
    // 4. CONTÉM: busca parcial (só se termo > 3 caracteres)
    if (!chain && searchName.length > 3) {
      chain = chains.find(c => 
        c.name?.toUpperCase().includes(searchName)
      );
    }
    
    if (chain && chain.rpc && chain.rpc.length > 0) {
      // Filtrar RPCs públicos (sem ${...} variables)
      const publicRpcs = chain.rpc.filter(rpc => 
        !rpc.includes('${') && 
        !rpc.includes('INFURA') && 
        !rpc.includes('ALCHEMY')
      );
      
      if (publicRpcs.length > 0) {
        console.log(`✅ ${publicRpcs.length} RPCs para ${chainName} → ${chain.name} (chainId: ${chain.chainId})`);
        return publicRpcs;
      }
    }
  } catch (error) {
    console.log(`⚠️ Erro ao obter RPCs do chainlist: ${error.message}`);
  }
  return null;
}

/**
 * Obter RPCs para uma blockchain específica
 * Sistema de 3 camadas: Cache → Chainlist → Fallback
 */
async function getRPCsForChain(chainName) {
  const normalized = chainName.toUpperCase();
  
  // 1. Tentar cache/chainlist primeiro
  const chainlistRpcs = await fetchFromChainlist(chainName);
  if (chainlistRpcs && chainlistRpcs.length > 0) {
    return chainlistRpcs;
  }
  
  // 2. Fallback para lista hardcoded (segurança absoluta)
  if (FALLBACK_RPCS[normalized]) {
    console.log(`🔒 Usando RPCs fallback para ${chainName}`);
    return FALLBACK_RPCS[normalized];
  }
  
  console.log(`❌ Nenhum RPC encontrado para ${chainName}`);
  return [];
}

module.exports = {
  getRPCsForChain,
  getChainsData,
  fetchFromChainlist
};
