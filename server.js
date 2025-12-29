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


// Swagger/OpenAPI config
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ChainGuard API',
            version: '1.0.0',
            description: 'API para validação de transações blockchain',
        },
    },
    apis: ['./server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rate limiting global (100 requests por 15 minutos por IP)
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Configuração do logger
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

// API logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        apiLogRepository.log(
            req.path,
            req.method,
            res.statusCode,
            req.ip || req.connection.remoteAddress,
            req.get('user-agent'),
            req.body,
            Date.now() - start
        ).catch(() => {});
        logger.info(`${req.method} ${req.path} ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

// --- ROTAS ---

// Página inicial
/**
 * @swagger
 * /api/networks:
 *   get:
 *     summary: Listar redes blockchain
 *     responses:
 *       200:
 *         description: Lista de redes
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Listar redes
app.get('/api/networks', async (req, res) => {
    /**
     * @swagger
     * /api/validate:
     *   post:
     *     summary: Validar transação
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               chain:
     *                 type: string
     *               hash:
     *                 type: string
     *     responses:
     *       200:
     *         description: Resultado da validação
     */
    try {
        const networks = await networkRepository.getAll();
        const formatted = Object.fromEntries(
            networks.map(net => [
                net.name.toUpperCase(),
                { type: net.type, rpc: net.rpc[0], rpcs: net.rpc }
            ])
        );
        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Validar transação
app.post('/api/validate', async (req, res) => {
    const { chain, hash } = req.body;
    if (!chain || !hash) {
        return res.json({ valid: false, error: 'Chain e hash são obrigatórios' });
    }
    try {
        const cached = await validationRepository.findRecent(hash, 60);
        if (cached) {
            return res.json(cached.found
                ? { valid: true, data: cached.data, cached: true }
                : { valid: false, error: cached.error, cached: true }
            );
        }
        const network = await networkRepository.getByName(chain.toLowerCase());
        if (!network) {
            return res.json({ valid: false, error: `Rede ${chain} desconhecida` });
        }
        const bestRpcs = await rpcPerformanceRepository.getBestRpcs(chain.toLowerCase(), 3);
        const rpcToUse = bestRpcs.length > 0 ? bestRpcs[0].rpc_url : network.rpc[0];
        const networkConfig = { type: network.type, rpc: rpcToUse };
        const startTime = Date.now();
        const result = await validateTransaction(networkConfig, hash);
        const responseTime = Date.now() - startTime;
        await validationRepository.logValidation(chain.toLowerCase(), hash, result, rpcToUse, responseTime);
        if (result.found) {
            await rpcPerformanceRepository.recordSuccess(chain.toLowerCase(), rpcToUse, responseTime);
        } else if (result.error) {
            await rpcPerformanceRepository.recordError(chain.toLowerCase(), rpcToUse);
        }
        res.json(result.found
            ? { valid: true, data: result.data }
            : { valid: false, error: result.error || 'Transação não encontrada' }
        );
    } catch (e) {
        await validationRepository.logValidation(chain.toLowerCase(), hash, { found: false, error: e.message }, 'unknown', 0).catch(() => {});
        res.json({ valid: false, error: e.message });
    }
});

// Adicionar rede
app.post('/api/add-network', async (req, res) => {
    /**
     * @swagger
     * /api/add-network:
     *   post:
     *     summary: Adicionar nova rede
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               symbol:
     *                 type: string
     *               type:
     *                 type: string
     *               rpc:
     *                 type: string
     *     responses:
     *       200:
     *         description: Rede adicionada
     */
    const { symbol, type, rpc } = req.body;
    if (!symbol || !type) {
        return res.status(400).json({ success: false, error: 'Symbol e type obrigatórios' });
    }
    const networkName = symbol.toLowerCase();
    let finalRpc = rpc;
    try {
        const existing = await networkRepository.getByName(networkName);
        if (existing) {
            return res.status(400).json({ success: false, error: `Rede ${symbol} já existe` });
        }
        if (!finalRpc) {
            const rpcs = await getRPCsForChain(symbol);
            if (!rpcs || rpcs.length === 0) {
                return res.status(400).json({ success: false, error: 'RPC não encontrado automaticamente. Forneça um RPC manual.' });
            }
            finalRpc = rpcs[0];
        }
        const rpcs = Array.isArray(finalRpc) ? finalRpc : [finalRpc];
        const network = await networkRepository.create(networkName, type, rpcs);
        res.json({ success: true, network });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Obter RPCs disponíveis
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
    try {
        await db.close();
    } catch (e) {
        logger.error('Erro ao fechar DB:', e);
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Encerrando servidor...');
    try {
        await db.close();
    } catch (e) {
        logger.error('Erro ao fechar DB:', e);
    }
    process.exit(0);
});
