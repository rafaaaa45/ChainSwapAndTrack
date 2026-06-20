const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { validateTransaction } = require('./drivers/validator');
const { networkRepository, rpcPerformanceRepository } = require('./database/repositories');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/api/validate-batch-json', async (req, res) => {
  try {
    const data = req.body; // O body já será o array de objetos
    const results = [];

    for (const item of data) {
      const network = await networkRepository.getByName(item.chain.toLowerCase());
      if (!network) {
        results.push({ ...item, error: `Rede ${item.chain} desconhecida` });
        continue;
      }
      const bestRpcs = await rpcPerformanceRepository.getBestRpcs(item.chain.toLowerCase(), 3);
      let rpcToUse = network.rpc[0];
      if (bestRpcs && bestRpcs.length > 0 && bestRpcs[0]) {
        rpcToUse = typeof bestRpcs[0] === 'string' ? bestRpcs[0] : bestRpcs[0].rpc_url;
      }
      const finalRpc = rpcToUse || 'rpc_desconhecido_fallback';
      const networkConfig = { type: network.type, rpc: finalRpc };

      const result = await validateTransaction(networkConfig, item.hash);
      results.push({ ...item, result });
    }

    res.json(results);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao processar o JSON.' });
  }
});

router.post('/api/validate-batch', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const results = [];

    for (const item of data) {
      // Busca a configuração da rede
      const network = await networkRepository.getByName(item.chain.toLowerCase());
      if (!network) {
        results.push({ ...item, error: `Rede ${item.chain} desconhecida` });
        continue;
      }

      const bestRpcs = await rpcPerformanceRepository.getBestRpcs(item.chain.toLowerCase(), 3);
      let rpcToUse = network.rpc[0];
      if (bestRpcs && bestRpcs.length > 0 && bestRpcs[0]) {
        rpcToUse = typeof bestRpcs[0] === 'string' ? bestRpcs[0] : bestRpcs[0].rpc_url;
      }
      const finalRpc = rpcToUse || 'rpc_desconhecido_fallback';
      const networkConfig = { type: network.type, rpc: finalRpc };

      // Valida a transação
      const result = await validateTransaction(networkConfig, item.hash);
      results.push({ ...item, result });
    }

    fs.unlinkSync(filePath);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao processar o arquivo.' });
  }
});

module.exports = router;