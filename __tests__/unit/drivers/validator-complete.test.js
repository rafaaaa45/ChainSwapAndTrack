const { validateTransaction } = require('../../../drivers/validator');

// Mock all drivers
jest.mock('../../../drivers/evm', () => ({ validateEVM: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/utxo', () => ({ validateUTXO: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/solana', () => ({ validateSOLANA: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/cosmos', () => ({ validateCOSMOS: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/cardano', () => ({ validateCARDANO: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/near', () => ({ validateNEAR: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/polkadot', () => ({ validatePOLKADOT: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/algorand', () => ({ validateALGORAND: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/aptos', () => ({ validateAPTOS: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/ripple', () => ({ validateRIPPLE: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/tezos', () => ({ validateTEZOS: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/stellar', () => ({ validateSTELLAR: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/ton', () => ({ validateTON: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/hedera', () => ({ validateHEDERA: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/flow', () => ({ validateFLOW: jest.fn().mockResolvedValue({ found: true }) }));
jest.mock('../../../drivers/multiversx', () => ({ validateMULTIVERSX: jest.fn().mockResolvedValue({ found: true }) }));

describe('Validator - All Drivers Coverage', () => {
  const drivers = [
    'COSMOS', 'CARDANO', 'NEAR', 'POLKADOT', 'ALGORAND', 
    'APTOS', 'RIPPLE', 'TEZOS', 'STELLAR', 'TON', 
    'HEDERA', 'FLOW', 'MULTIVERSX'
  ];

  drivers.forEach(driver => {
    test(`deve rotear para driver ${driver}`, async () => {
      const result = await validateTransaction({ type: driver, rpc: 'https://rpc' }, 'hash');
      expect(result.found).toBe(true);
    });
  });
});
