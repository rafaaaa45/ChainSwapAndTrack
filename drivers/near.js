const axios = require('axios');

/**
 * DRIVER NEAR - NEAR Protocol
 * Usa NEAR JSON-RPC
 */

async function validateNEAR(rpcUrl, hash) {
    try {
        const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            id: 'dontcare',
            method: 'tx',
            params: [hash, 'account.near'] // Requer account_id, usar placeholder
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
                hash: tx.transaction.hash,
                signerId: tx.transaction.signer_id,
                receiverId: tx.transaction.receiver_id,
                blockHash: tx.transaction_outcome.block_hash,
                status: tx.status?.SuccessValue ? 'success' : 'failed',
                gasUsed: tx.transaction_outcome.outcome.gas_burnt,
                tokensUsed: tx.transaction_outcome.outcome.tokens_burnt
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateNEAR };
