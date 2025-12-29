const axios = require('axios');

/**
 * DRIVER MULTIVERSX - MultiversX (EGLD, ex-Elrond)
 * Usa MultiversX API
 */

async function validateMULTIVERSX(apiUrl, hash) {
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
                hash: tx.txHash,
                sender: tx.sender,
                receiver: tx.receiver,
                value: tx.value,
                fee: tx.fee,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                gasUsed: tx.gasUsed,
                nonce: tx.nonce,
                round: tx.round,
                timestamp: tx.timestamp,
                status: tx.status
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateMULTIVERSX };
