const axios = require('axios');

/**
 * DRIVER HEDERA - Hedera Hashgraph (HBAR)
 * Usa Hedera Mirror Node REST API
 */

async function validateHEDERA(apiUrl, hash) {
    try {
        const response = await axios.get(`${apiUrl}/api/v1/transactions/${hash}`, {
            timeout: 10000
        });

        const tx = response.data.transactions?.[0];
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                transactionId: tx.transaction_id,
                consensusTimestamp: tx.consensus_timestamp,
                transactionHash: tx.transaction_hash,
                validStartTimestamp: tx.valid_start_timestamp,
                chargedTxFee: tx.charged_tx_fee,
                maxFee: tx.max_fee,
                result: tx.result,
                name: tx.name,
                node: tx.node,
                status: tx.result === 'SUCCESS' ? 'success' : 'failed'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateHEDERA };
