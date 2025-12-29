const axios = require('axios');
const { validateCARDANO } = require('../../../drivers/cardano');

jest.mock('axios');

describe('Cardano Driver', () => {
  describe('validateCARDANO', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          hash: 'hash123',
          block_height: 5000,
          block: 'block123',
          slot: 1000,
          fees: '170000'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateCARDANO('https://cardano-api.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.blockHeight).toBe(5000);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateCARDANO('https://cardano-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateCARDANO('https://cardano-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await validateCARDANO('https://cardano-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
