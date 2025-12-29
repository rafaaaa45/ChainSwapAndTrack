const axios = require('axios');
const { validateUTXO } = require('../../../drivers/utxo');

jest.mock('axios');

describe('UTXO Driver', () => {
  describe('validateUTXO', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          hash: '0x123',
          confirmations: 6,
          total: 150000,
          inputs: [],
          outputs: []
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateUTXO('https://btc-api.com', '0x123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('0x123');
      expect(result.data.confirmations).toBe(6);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('Request failed with status code 404'), { response: { status: 404 } }));

      const result = await validateUTXO('https://btc-api.com', '0x123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('Request failed with status code 500'), { response: { status: 500, data: { message: 'Internal error' } } }));

      const result = await validateUTXO('https://btc-api.com', '0x123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Network timeout'));

      const result = await validateUTXO('https://btc-api.com', '0x123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });
});
