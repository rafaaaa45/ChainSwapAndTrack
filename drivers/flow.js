const axios = require('axios');

/**
 * DRIVER FLOW - Flow Blockchain
 * Usa Flow Access API
 */

async function validateFLOW(rpcUrl, hash) {
    try {
        const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            method: 'flow_getTransactionResult',
            params: [hash],
            id: 1
        }, { timeout: 10000 });

        if (response.data.error) {
            return { found: false, error: response.data.error.message };
        }

        const tx = response.data.result;
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                transactionId: hash,
                status: tx.status,
                statusCode: tx.statusCode,
                errorMessage: tx.errorMessage || 'none',
                events: tx.events?.length || 0,
                blockId: tx.blockId,
                blockHeight: tx.blockHeight,
                gasUsed: tx.gasUsed,
                computationUsed: tx.computationUsed
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateFLOW };
