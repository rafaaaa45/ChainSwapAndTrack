const axios = require('axios');

/**
 * DRIVER RIPPLE - XRP Ledger
 * Usa Ripple JSON-RPC
 */

async function validateRIPPLE(rpcUrl, hash) {
    try {
        const response = await axios.post(rpcUrl, {
            method: 'tx',
            params: [{
                transaction: hash,
                binary: false
            }]
        }, { timeout: 10000 });

        if (response.data.error) {
            return { found: false, error: response.data.error };
        }

        const tx = response.data.result;
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                hash: tx.hash,
                account: tx.Account,
                destination: tx.Destination,
                amount: tx.Amount,
                fee: tx.Fee,
                sequence: tx.Sequence,
                ledgerIndex: tx.ledger_index,
                validated: tx.validated,
                status: tx.meta?.TransactionResult || 'unknown'
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateRIPPLE };
