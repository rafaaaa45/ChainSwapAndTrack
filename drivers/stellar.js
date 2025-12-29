const axios = require('axios');

/**
 * DRIVER STELLAR - Stellar (XLM)
 * Usa Horizon API
 */

async function validateSTELLAR(apiUrl, hash) {
    try {
        const response = await axios.get(`${apiUrl}/transactions/${hash}`, {
            timeout: 10000
        });

        const tx = response.data;
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                hash: tx.hash,
                ledger: tx.ledger,
                createdAt: tx.created_at,
                sourceAccount: tx.source_account,
                feeCharged: tx.fee_charged,
                maxFee: tx.max_fee,
                operationCount: tx.operation_count,
                successful: tx.successful,
                status: tx.successful ? 'success' : 'failed'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateSTELLAR };
