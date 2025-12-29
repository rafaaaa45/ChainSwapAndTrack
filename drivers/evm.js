const axios = require('axios');

/**
 * DRIVER EVM - Ethereum, Polygon, BSC, Arbitrum, etc.
 */

async function rpcCall(rpcUrl, method, params) {
    const response = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        method,
        params,
        id: 1
    });

    if (response.data.error) {
        throw new Error(response.data.error.message);
    }

    return response.data.result;
}

async function validateEVM(rpcUrl, hash) {
    try {
        const tx = await rpcCall(rpcUrl, 'eth_getTransactionByHash', [hash]);
        
        if (!tx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        const receipt = await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [hash]);

        return {
            found: true,
            data: {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                blockNumber: tx.blockNumber,
                blockHash: tx.blockHash,
                gasPrice: tx.gasPrice,
                gas: tx.gas,
                nonce: tx.nonce,
                status: receipt?.status,
                gasUsed: receipt?.gasUsed,
                confirmations: receipt ? 'confirmado' : 'pendente'
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateEVM };
