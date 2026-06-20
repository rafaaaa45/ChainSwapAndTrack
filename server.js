const express = require('express');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const cors = require('cors');
const path = require('path');
const { validateTransaction } = require('./drivers/validator');
const { getRPCsForChain } = require('./rpc-fetcher');
const db = require('./database/db');
const { 
    networkRepository, 
    validationRepository, 
    rpcPerformanceRepository,
    apiLogRepository 
} = require('./database/repositories');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const batchValidateRoute = require('./batch-validate-route');
app.use(batchValidateRoute);

// Swagger/OpenAPI config (Limpo para não dar erros de YAML)
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: { title: 'ChainGuard API', version: '1.0.0' },
    },
    apis: [], // Removemos a leitura do ficheiro para evitar crashes
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'app.log' })
    ]
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        apiLogRepository.log(req.path, req.method, res.statusCode, req.ip || req.connection.remoteAddress, req.get('user-agent'), req.body, Date.now() - start).catch(() => {});
        logger.info(`${req.method} ${req.path} ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

// --- ROTAS ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/api/networks', async (req, res) => {
    try {
        const networks = await networkRepository.getAll();
        const formatted = Object.fromEntries(networks.map(net => [net.name.toUpperCase(), { type: net.type, rpc: net.rpc[0], rpcs: net.rpc }]));
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/validate', async (req, res) => {
    const { chain, hash } = req.body;
    if (!chain || !hash) return res.json({ valid: false, error: 'Chain e hash são obrigatórios' });
    
    try {
        const cached = await validationRepository.findRecent(hash, 60);
        if (cached) return res.json(cached.found ? { valid: true, data: cached.data, cached: true } : { valid: false, error: cached.error, cached: true });
        
        const network = await networkRepository.getByName(chain.toLowerCase());
        if (!network) return res.json({ valid: false, error: `Rede ${chain} desconhecida` });
        
        const bestRpcs = await rpcPerformanceRepository.getBestRpcs(chain.toLowerCase(), 3);
        let rpcToUse = network.rpc[0]; 
        
        if (bestRpcs && bestRpcs.length > 0 && bestRpcs[0]) {
            rpcToUse = typeof bestRpcs[0] === 'string' ? bestRpcs[0] : bestRpcs[0].rpc_url;
        }

        console.log(`[DEBUG] Rede: ${chain} | RPC Selecionado: ${rpcToUse}`); 
        const finalRpc = rpcToUse || 'rpc_desconhecido_fallback';

        const networkConfig = { type: network.type, rpc: finalRpc };
        const startTime = Date.now();
        const result = await validateTransaction(networkConfig, hash);
        const responseTime = Date.now() - startTime;
        
        await validationRepository.logValidation(chain.toLowerCase(), hash, result, finalRpc, responseTime);
        
        if (result.found) await rpcPerformanceRepository.recordSuccess(chain.toLowerCase(), finalRpc, responseTime);
        else if (result.error) await rpcPerformanceRepository.recordError(chain.toLowerCase(), finalRpc);
        
        res.json(result.found ? { valid: true, data: result.data } : { valid: false, error: result.error || 'Transação não encontrada' });
    } catch (e) {
        await validationRepository.logValidation(chain.toLowerCase(), hash, { found: false, error: e.message }, 'unknown', 0).catch(() => {});
        res.json({ valid: false, error: e.message });
    }
});

app.post('/api/add-network', async (req, res) => {
    const { symbol, type, rpc } = req.body;
    if (!symbol || !type) return res.status(400).json({ success: false, error: 'Symbol e type obrigatórios' });
    
    const networkName = symbol.toLowerCase();
    let finalRpc = rpc;
    try {
        const existing = await networkRepository.getByName(networkName);
        if (existing) return res.status(400).json({ success: false, error: `Rede ${symbol} já existe` });
        
        if (!finalRpc) {
            const rpcs = await getRPCsForChain(symbol);
            if (!rpcs || rpcs.length === 0) return res.status(400).json({ success: false, error: 'RPC não encontrado automaticamente. Forneça um RPC manual.' });
            finalRpc = rpcs[0];
        }
        
        const rpcs = Array.isArray(finalRpc) ? finalRpc : [finalRpc];
        const network = await networkRepository.create(networkName, type, rpcs);
        res.json({ success: true, network });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/rpcs/:chain', async (req, res) => {
    try {
        const rpcs = await getRPCsForChain(req.params.chain);
        res.json({ chain: req.params.chain, rpcs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, async () => {
    logger.info(`🚀 ChainGuard Server a rodar na porta ${PORT}`);
    try {
        const networks = await networkRepository.getAll();
        logger.info(`📡 Redes disponíveis: ${networks.map(n => n.name).join(', ') || 'Nenhuma'}`);
    } catch (e) {
        logger.warn('Não foi possível obter redes:', e);
    }
});

process.on('SIGINT', async () => {
    logger.info('🛑 Encerrando servidor...');
    try { await db.close(); } catch (e) {}
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Encerrando servidor...');
    try { await db.close(); } catch (e) {}
    process.exit(0);
});