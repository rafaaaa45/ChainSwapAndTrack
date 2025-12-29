const axios = require('axios');
const { validateSOLANA } = require('../../../drivers/solana');

jest.mock('axios');

describe('Solana Driver', () => {
  describe('validateSOLANA', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: {
            transaction: { message: { accountKeys: [], instructions: [] } },
            meta: { err: null, fee: 5000, preBalances: [], postBalances: [] },
            slot: 123456,
            blockTime: 1640000000
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateSOLANA('https://solana-rpc.com', 'signature123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('signature123');
      expect(result.data.slot).toBe(123456);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { result: null }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateSOLANA('https://solana-rpc.com', 'signature123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateSOLANA('https://solana-rpc.com', 'signature123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValue(new Error('Connection refused'));

      const result = await validateSOLANA('https://solana-rpc.com', 'signature123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });
});
