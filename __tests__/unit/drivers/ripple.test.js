const axios = require('axios');
const { validateRIPPLE } = require('../../../drivers/ripple');

jest.mock('axios');

describe('Ripple Driver', () => {
  describe('validateRIPPLE', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: {
            hash: 'hash123',
            Account: 'rAddr1',
            Destination: 'rAddr2',
            Amount: '1000000',
            Fee: '12',
            validated: true,
            meta: { TransactionResult: 'tesSUCCESS' }
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateRIPPLE('https://ripple-rpc.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.validated).toBe(true);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { error: 'txnNotFound' }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateRIPPLE('https://ripple-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('txnNotFound');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateRIPPLE('https://ripple-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValue(new Error('Server unreachable'));

      const result = await validateRIPPLE('https://ripple-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Server unreachable');
    });
  });
});
