const axios = require('axios');

/**
 * DRIVER ALGORAND - Algorand
 * Usa Algorand REST API
 */

async function validateALGORAND(apiUrl, hash) {
    try {
        const response = await axios.get(`${apiUrl}/v2/transactions/${hash}`, {
            timeout: 10000
        });

        const tx = response.data;
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                id: tx.id,
                confirmedRound: tx['confirmed-round'],
                fee: tx.fee,
                firstValid: tx['first-valid'],
                lastValid: tx['last-valid'],
                sender: tx.sender,
                txType: tx['tx-type'],
                roundTime: tx['round-time'],
                status: tx['confirmed-round'] ? 'confirmed' : 'pending'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateALGORAND };
