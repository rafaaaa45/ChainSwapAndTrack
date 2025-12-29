const axios = require('axios');

/**
 * DRIVER APTOS - Aptos, Sui (Move-based blockchains)
 * Usa Aptos REST API
 */

async function validateAPTOS(apiUrl, hash) {
    try {
        const response = await axios.get(`${apiUrl}/v1/transactions/by_hash/${hash}`, {
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
                version: tx.version,
                type: tx.type,
                sender: tx.sender,
                gasUsed: tx.gas_used,
                maxGasAmount: tx.max_gas_amount,
                gasUnitPrice: tx.gas_unit_price,
                success: tx.success,
                vmStatus: tx.vm_status,
                timestamp: tx.timestamp,
                status: tx.success ? 'success' : 'failed'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateAPTOS };
