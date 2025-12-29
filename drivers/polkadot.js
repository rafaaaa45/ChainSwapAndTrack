const axios = require('axios');

/**
 * DRIVER POLKADOT - Polkadot, Kusama, Substrate-based chains
 * Usa Substrate RPC
 */

async function validatePOLKADOT(rpcUrl, hash) {
    try {
        // Obter bloco da transação (hash do extrinsic)
        const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            id: 1,
            method: 'chain_getBlock',
            params: [hash]
        }, { timeout: 10000 });

        if (response.data.error) {
            return { found: false, error: response.data.error.message };
        }

        const block = response.data.result;
        
        if (!block) {
            return { found: false, error: 'Transação não encontrada' };
        }

        return {
            found: true,
            data: {
                blockHash: hash,
                parentHash: block.block.header.parentHash,
                number: block.block.header.number,
                stateRoot: block.block.header.stateRoot,
                extrinsicsRoot: block.block.header.extrinsicsRoot,
                extrinsicsCount: block.block.extrinsics?.length || 0,
                status: 'finalized'
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validatePOLKADOT };
