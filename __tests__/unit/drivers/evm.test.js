const axios = require('axios');
const { validateEVM } = require('../../../drivers/evm');

jest.mock('axios');

describe('EVM Driver', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEVM', () => {
    test('deve retornar transação válida quando encontrada', async () => {
      const mockTx = {
        hash: '0x123',
        from: '0xabc',
        to: '0xdef',
        value: '1000000000000000000',
        blockNumber: '0x1',
        blockHash: '0xblock123',
        gasPrice: '0x10',
        gas: '0x5208',
        nonce: '0x0'
      };

      const mockReceipt = {
        status: '0x1',
        gasUsed: '0x5208'
      };

      axios.post
        .mockResolvedValueOnce({ data: { result: mockTx } })
        .mockResolvedValueOnce({ data: { result: mockReceipt } });

      const result = await validateEVM('https://eth-rpc.com', '0x123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('0x123');
      expect(result.data.from).toBe('0xabc');
      expect(result.data.status).toBe('0x1');
      expect(axios.post).toHaveBeenCalledTimes(2);
    });

    test('deve retornar erro quando transação não encontrada', async () => {
      axios.post.mockResolvedValueOnce({ data: { result: null } });

      const result = await validateEVM('https://eth-rpc.com', '0xinvalid');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Transação não encontrada');
    });

    test('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockResolvedValueOnce({
        data: { error: { message: 'RPC Error' } }
      });

      const result = await validateEVM('https://eth-rpc.com', '0x123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('RPC Error');
    });

    test('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValueOnce(new Error('Network timeout'));

      const result = await validateEVM('https://eth-rpc.com', '0x123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });
});
