const axios = require('axios');

/**
 * DRIVER SOLANA
 * Usa JSON-RPC Solana
 */

async function validateSOLANA(rpcUrl, hash) {
  try {
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [
        hash,
        {
          encoding: 'json',
          maxSupportedTransactionVersion: 0
        }
      ]
    });

    if (response.data.error) {
      throw new Error(response.data.error.message);
    }

    const tx = response.data.result;
    if (!tx) {
      return { found: false, error: 'Transação não encontrada' };
    }

    return {
      found: true,
      data: {
        hash: hash,
        slot: tx.slot,
        blockTime: tx.blockTime,
        fee: tx.meta?.fee,
        status: tx.meta?.err ? 'failed' : 'success',
        accounts: tx.transaction?.message?.accountKeys?.length,
        instructions: tx.transaction?.message?.instructions?.length,
        preBalances: tx.meta?.preBalances,
        postBalances: tx.meta?.postBalances
      }
    };
  } catch (error) {
    return { found: false, error: error.message };
  }
}

module.exports = { validateSOLANA };
