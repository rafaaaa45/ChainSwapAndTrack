const axios = require('axios');

/**
 * DRIVER TEZOS - Tezos (XTZ)
 * Usa Tezos RPC
 */

async function validateTEZOS(rpcUrl, hash) {
    try {
        const response = await axios.get(`${rpcUrl}/chains/main/blocks/head/operations`, {
            timeout: 10000
        });

        // Buscar transação em todos os blocos recentes
        let foundTx = null;
        for (const group of response.data) {
            for (const op of group) {
                if (op.hash === hash) {
                    foundTx = op;
                    break;
                }
            }
            if (foundTx) break;
        }

        if (!foundTx) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                hash: foundTx.hash,
                branch: foundTx.branch,
                protocol: foundTx.protocol,
                chainId: foundTx.chain_id,
                contents: foundTx.contents?.length || 0,
                signature: foundTx.signature,
                status: 'applied'
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateTEZOS };
