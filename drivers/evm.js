const axios = require('axios');
const { ethers } = require('ethers');

async function rpcCall(rpcUrl, method, params) {
    const response = await axios.post(rpcUrl, { jsonrpc: '2.0', method, params, id: 1 });
    if (response.data.error) throw new Error(response.data.error.message);
    return response.data.result;
}

// Mapeamento de tokens Ethereum → Polygon (endereços do token na Polygon)
const ETH_TO_POLYGON_TOKEN = {
    // ETH nativo → WETH na Polygon
    'ETH': '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    // USDC
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    // USDT
    '0xdac17f958d2ee523a2206206994597c13d831ec7': '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    // DAI
    '0x6b175474e89094c44da98b954eedeac495271d0f': '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    // WBTC
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    // TEL (Telcoin)
    '0x467bccd9d29f223bce8043b84e8c8b282827790f': '0xdf7837de1f2fa4631d716cf2502f8b230f1dcc32',
    // GHST (Aavegotchi)
    '0x3f382dbd960e3a9bbceae22651e88158d2791550': '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7',
};

// Tokens com 6 decimais (todos os outros assumem 18)
const TOKENS_6_DECIMALS = [
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
];

function getDecimals(tokenAddress) {
    return TOKENS_6_DECIMALS.includes(tokenAddress?.toLowerCase()) ? 6 : 18;
}

/**
 * Verifica se os tokens chegaram realmente na Polygon após uma bridge.
 * A Polygon bridge faz um mint (Transfer do endereço zero) para o receiver.
 */
async function checkPolygonLanding(userAddress, tokenAddressEth) {
    const polygonRpcs = [
        'https://rpc.ankr.com/polygon',
        'https://polygon-bor-rpc.publicnode.com',
    ];

    const tokenKey = typeof tokenAddressEth === 'string' ? tokenAddressEth.toLowerCase() : tokenAddressEth;
    const polygonTokenAddress = ETH_TO_POLYGON_TOKEN[tokenKey];

    if (!polygonTokenAddress) {
        return {
            status: "TOKEN_DESCONHECIDO ⚠️",
            info: `Token ${tokenAddressEth} não tem mapeamento Polygon conhecido. Não foi possível verificar a chegada.`
        };
    }

    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const ZERO_ADDRESS_TOPIC = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const receiverTopic = '0x000000000000000000000000' + userAddress.toLowerCase().replace('0x', '');

    for (const polygonRpc of polygonRpcs) {
        try {
            const latestBlockHex = await rpcCall(polygonRpc, 'eth_blockNumber', []);
            const latestBlock = parseInt(latestBlockHex, 16);

            // 2000 blocos (~33 min na Polygon) — range seguro para RPCs públicos
            const fromBlock = '0x' + Math.max(0, latestBlock - 2000).toString(16);

            const logs = await rpcCall(polygonRpc, 'eth_getLogs', [{
                fromBlock,
                toBlock: 'latest',
                address: polygonTokenAddress,
                topics: [TRANSFER_TOPIC, ZERO_ADDRESS_TOPIC, receiverTopic]
            }]);

            if (logs && logs.length > 0) {
                const mintLog = logs[logs.length - 1];
                const blockNumber = parseInt(mintLog.blockNumber, 16);
                return {
                    status: "CONFIRMADO ✅",
                    info: `Tokens chegaram na Polygon. Mint detetado no bloco ${blockNumber}.`,
                    polygon_token: polygonTokenAddress,
                    mint_tx: mintLog.transactionHash,
                    mint_block: blockNumber
                };
            }

            return {
                status: "PENDENTE ⏳",
                info: `Mint ainda não detetado na Polygon nos últimos 2000 blocos (~33 min). A bridge pode demorar até 30 minutos.`,
                polygon_token: polygonTokenAddress,
                checked_from_block: parseInt(fromBlock, 16),
                checked_to_block: latestBlock
            };

        } catch (e) {
            // Tenta o próximo RPC
            continue;
        }
    }

    return {
        status: "ERRO ❌",
        info: "Não foi possível verificar a Polygon: todos os RPCs falharam."
    };
}

async function validateEVM(rpcUrl, hash) {
    try {
        const tx = await rpcCall(rpcUrl, 'eth_getTransactionByHash', [hash]);
        if (!tx) return { found: false, error: 'Transação não encontrada' };

        const receipt = await rpcCall(rpcUrl, 'eth_getTransactionReceipt', [hash]);
        const logs = receipt?.logs || [];

        const abi = [
            "event Transfer(address indexed from, address indexed to, uint256 value)",
            "event LockedERC20(address indexed depositor, address indexed depositReceiver, address indexed rootToken, uint256 amount)",
            "event LockedEther(address indexed depositor, address indexed depositReceiver, uint256 amount)"
        ];

        const iface = new ethers.utils.Interface(abi);
        let destinationStatus = null;

        const decodedLogs = await Promise.all(logs.map(async (log) => {
            try {
                const parsed = iface.parseLog({ topics: log.topics, data: log.data });
                if (!parsed) return null;

                const contractAddress = log.address.toLowerCase();

                if (parsed.name === "Transfer") {
                    // contractAddress aqui É o token
                    const decimals = getDecimals(contractAddress);
                    return {
                        type: "ERC-20 Transfer",
                        from: parsed.args[0],
                        to: parsed.args[1],
                        value: ethers.utils.formatUnits(parsed.args[2], decimals)
                    };
                }

                if (parsed.name === "LockedERC20") {
                    // parsed.args[2] é o endereço do token root (Ethereum)
                    const rootToken = parsed.args[2].toLowerCase();
                    const decimals = getDecimals(rootToken);
                    const receiver = parsed.args[1];
                    const val = ethers.utils.formatUnits(parsed.args[3], decimals);

                    const polygonCheck = await checkPolygonLanding(receiver, rootToken);

                    destinationStatus = {
                        network: "Polygon",
                        receiver,
                        expected_value: val,
                        status: polygonCheck.status,
                        details: polygonCheck.info,
                        ...(polygonCheck.mint_tx && { mint_tx: polygonCheck.mint_tx }),
                        ...(polygonCheck.mint_block && { mint_block: polygonCheck.mint_block }),
                        ...(polygonCheck.polygon_token && { polygon_token: polygonCheck.polygon_token })
                    };

                    return {
                        type: "Cross-Chain: Polygon Bridge (ERC-20)",
                        action: "Tokens Locked on Ethereum",
                        to_polygon_user: receiver,
                        value: val
                    };
                }

                if (parsed.name === "LockedEther") {
                    const receiver = parsed.args[1];
                    const val = ethers.utils.formatUnits(parsed.args[2], 18);

                    const polygonCheck = await checkPolygonLanding(receiver, 'ETH');

                    destinationStatus = {
                        network: "Polygon",
                        receiver,
                        expected_value: val + " ETH",
                        status: polygonCheck.status,
                        details: polygonCheck.info,
                        ...(polygonCheck.mint_tx && { mint_tx: polygonCheck.mint_tx }),
                        ...(polygonCheck.mint_block && { mint_block: polygonCheck.mint_block }),
                        ...(polygonCheck.polygon_token && { polygon_token: polygonCheck.polygon_token })
                    };

                    return {
                        type: "Cross-Chain: Polygon Bridge (Native ETH)",
                        action: "ETH Locked on Ethereum",
                        to_polygon_user: receiver,
                        value: val + " ETH"
                    };
                }
            } catch (e) { return null; }
        }));

        const cleanLogs = decodedLogs.filter(e => e !== null);
        const valueEth = ethers.utils.formatUnits(tx.value || '0x0', 18);

        return {
            found: true,
            data: {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value_eth: valueEth,
                status: receipt?.status === "0x1" ? "Success" : receipt ? "Failed" : "Pending",
                block: tx.blockNumber ? parseInt(tx.blockNumber, 16) : null,
                gas_used: receipt?.gasUsed ? parseInt(receipt.gasUsed, 16) : null,
                events: cleanLogs,
                ...(destinationStatus && { bridge_destination_check: destinationStatus })
            }
        };
    } catch (error) {
        return { found: false, error: error.message };
    }
}

module.exports = { validateEVM };