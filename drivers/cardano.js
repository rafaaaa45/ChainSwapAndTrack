const axios = require('axios');

/**
 * DRIVER CARDANO - Cardano (ADA)
 * Usa Blockfrost API
 */

async function validateCARDANO(apiUrl, hash) {
    try {
        // Blockfrost API necessita de API key no header, mas endpoints públicos existem
        const response = await axios.get(`${apiUrl}/txs/${hash}`, {
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
                block: tx.block,
                blockHeight: tx.block_height,
                slot: tx.slot,
                index: tx.index,
                fees: tx.fees,
                deposit: tx.deposit,
                size: tx.size,
                invalidBefore: tx.invalid_before,
                invalidHereafter: tx.invalid_hereafter,
                status: tx.invalid_hereafter ? 'confirmed' : 'pending'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateCARDANO };
