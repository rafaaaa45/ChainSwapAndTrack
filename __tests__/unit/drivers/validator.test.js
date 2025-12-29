const { validateTransaction } = require('../../../drivers/validator');
const { validateEVM } = require('../../../drivers/evm');
const { validateUTXO } = require('../../../drivers/utxo');
const { validateSOLANA } = require('../../../drivers/solana');

jest.mock('../../../drivers/evm');
jest.mock('../../../drivers/utxo');
jest.mock('../../../drivers/solana');

describe('Validator', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('deve rotear para driver EVM', async () => {
    const mockResult = { found: true, data: { hash: '0x123' } };
    validateEVM.mockResolvedValue(mockResult);

    const config = { type: 'EVM', rpc: 'https://eth-rpc.com' };
    const result = await validateTransaction(config, '0x123');

    expect(validateEVM).toHaveBeenCalledWith('https://eth-rpc.com', '0x123');
    expect(result).toEqual(mockResult);
  });

  test('deve rotear para driver UTXO', async () => {
    const mockResult = { found: true, data: { txid: 'abc123' } };
    validateUTXO.mockResolvedValue(mockResult);

    const config = { type: 'UTXO', rpc: 'https://btc-api.com' };
    const result = await validateTransaction(config, 'abc123');

    expect(validateUTXO).toHaveBeenCalledWith('https://btc-api.com', 'abc123');
    expect(result).toEqual(mockResult);
  });

  test('deve rotear para driver SOLANA', async () => {
    const mockResult = { found: true, data: { signature: 'sol123' } };
    validateSOLANA.mockResolvedValue(mockResult);

    const config = { type: 'SOLANA', rpc: 'https://solana-rpc.com' };
    const result = await validateTransaction(config, 'sol123');

    expect(validateSOLANA).toHaveBeenCalledWith('https://solana-rpc.com', 'sol123');
    expect(result).toEqual(mockResult);
  });

  test('deve retornar erro para tipo não suportado', async () => {
    const config = { type: 'UNKNOWN', rpc: 'https://test.com' };
    const result = await validateTransaction(config, 'hash123');

    expect(result.found).toBe(false);
    expect(result.error).toBe('Tipo de rede não suportado');
  });
});
