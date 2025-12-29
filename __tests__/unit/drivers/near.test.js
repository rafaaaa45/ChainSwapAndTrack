const axios = require('axios');
const { validateNEAR } = require('../../../drivers/near');

jest.mock('axios');

describe('NEAR Driver', () => {
  describe('validateNEAR', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: {
            transaction: { hash: 'hash123', signer_id: 'alice.near', receiver_id: 'bob.near' },
            transaction_outcome: { block_hash: 'block123', outcome: { gas_burnt: 1000, tokens_burnt: '100' } },
            status: { SuccessValue: 'success' }
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateNEAR('https://near-rpc.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { error: { message: 'Not found' } }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateNEAR('https://near-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Not found');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateNEAR('https://near-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await validateNEAR('https://near-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });
  });
});
