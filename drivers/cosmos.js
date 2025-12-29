const axios = require('axios');

/**
 * DRIVER COSMOS - Cosmos, Osmosis, Juno, Terra, etc.
 * Usa Cosmos SDK REST API
 */

async function validateCOSMOS(rpcUrl, hash) {
    try {
        // Cosmos usa REST API, não RPC tradicional
        const apiUrl = rpcUrl.replace('/rpc', ''); // Normalizar URL
        const response = await axios.get(`${apiUrl}/cosmos/tx/v1beta1/txs/${hash}`, {
            timeout: 10000
        });

        const tx = response.data.tx_response;
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                hash: tx.txhash,
                height: tx.height,
                timestamp: tx.timestamp,
                gasWanted: tx.gas_wanted,
                gasUsed: tx.gas_used,
                status: tx.code === 0 ? 'success' : 'failed',
                memo: tx.tx?.body?.memo,
                events: tx.events?.length || 0
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateCOSMOS };
