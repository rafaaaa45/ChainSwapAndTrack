const axios = require('axios');

/**
 * DRIVER TON - The Open Network (Telegram)
 * Usa TON HTTP API
 */

async function validateTON(apiUrl, hash) {
    try {
        const response = await axios.get(`${apiUrl}/getTransactions?hash=${hash}`, {
            timeout: 10000
        });

        const tx = response.data.result;
        
        if (!tx || tx.length === 0) {
            return { found: false, error: 'Transação não encontrada' };
        }

        const transaction = tx[0];

        return {
            found: true,
            data: {
                hash: hash,
                lt: transaction.transaction_id?.lt,
                account: transaction.address,
                now: transaction.utime,
                fee: transaction.fee,
                storageFee: transaction.storage_fee,
                otherFee: transaction.other_fee,
                inMsg: transaction.in_msg?.source,
                outMsgs: transaction.out_msgs?.length || 0,
                status: 'confirmed'
            }
        };
    } catch (error) {
        if (error.response?.status === 404) {
            return { found: false, error: 'Transação não encontrada' };
        }
        return { found: false, error: error.message };
    }
}

module.exports = { validateTON };
