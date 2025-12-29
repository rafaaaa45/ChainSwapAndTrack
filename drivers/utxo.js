const axios = require('axios');

/**
 * DRIVER UTXO - Bitcoin, Litecoin, Dogecoin, etc.
 * Usa BlockCypher API (público e gratuito)
 */

async function validateUTXO(apiUrl, hash) {
  try {
    // Usar BlockCypher API (público e gratuito)
    const response = await axios.get(`${apiUrl}/txs/${hash}`);
    const tx = response.data;

    if (!tx || tx.error) {
      return { found: false, error: tx?.error || 'Transação não encontrada' };
    }

    // Extrair endereços de inputs e outputs
    const fromAddresses = tx.inputs?.flatMap(i => i.addresses || []) || [];
    const toAddresses = tx.outputs?.flatMap(o => o.addresses || []) || [];

    return {
      found: true,
      data: {
        hash: tx.hash,
        from: fromAddresses,
        to: toAddresses,
        value: tx.total,
        fees: tx.fees,
        blockHeight: tx.block_height,
        confirmations: tx.confirmations,
        size: tx.size,
        inputs: tx.inputs?.length,
        outputs: tx.outputs?.length
      }
    };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

module.exports = { validateUTXO };
