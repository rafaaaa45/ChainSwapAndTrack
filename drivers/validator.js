/**
 * TRANSACTION VALIDATOR
 * Ponto de entrada principal para validação de transações
 * Roteia para o driver correto baseado no tipo de blockchain
 */

const { validateEVM } = require('./evm');
const { validateUTXO } = require('./utxo');
const { validateSOLANA } = require('./solana');
const { validateCOSMOS } = require('./cosmos');
const { validateCARDANO } = require('./cardano');
const { validateNEAR } = require('./near');
const { validatePOLKADOT } = require('./polkadot');
const { validateALGORAND } = require('./algorand');
const { validateAPTOS } = require('./aptos');
const { validateRIPPLE } = require('./ripple');
const { validateTEZOS } = require('./tezos');
const { validateSTELLAR } = require('./stellar');
const { validateTON } = require('./ton');
const { validateHEDERA } = require('./hedera');
const { validateFLOW } = require('./flow');
const { validateMULTIVERSX } = require('./multiversx');

/**
 * Função principal que roteia para o driver correto
 */
async function validateTransaction(networkConfig, hash) {
  const { type, rpc } = networkConfig;

  switch (type) {
    case 'EVM':
      return await validateEVM(rpc, hash);
    case 'UTXO':
      return await validateUTXO(rpc, hash);
    case 'SOLANA':
      return await validateSOLANA(rpc, hash);
    case 'COSMOS':
      return await validateCOSMOS(rpc, hash);
    case 'CARDANO':
      return await validateCARDANO(rpc, hash);
    case 'NEAR':
      return await validateNEAR(rpc, hash);
    case 'POLKADOT':
      return await validatePOLKADOT(rpc, hash);
    case 'ALGORAND':
      return await validateALGORAND(rpc, hash);
    case 'APTOS':
      return await validateAPTOS(rpc, hash);
    case 'RIPPLE':
      return await validateRIPPLE(rpc, hash);
    case 'TEZOS':
      return await validateTEZOS(rpc, hash);
    case 'STELLAR':
      return await validateSTELLAR(rpc, hash);
    case 'TON':
      return await validateTON(rpc, hash);
    case 'HEDERA':
      return await validateHEDERA(rpc, hash);
    case 'FLOW':
      return await validateFLOW(rpc, hash);
    case 'MULTIVERSX':
      return await validateMULTIVERSX(rpc, hash);
    default:
      return { found: false, error: 'Tipo de rede não suportado' };
  }
}

module.exports = { validateTransaction };
