const axios = require('axios');
const { validateALGORAND } = require('../../../drivers/algorand');

jest.mock('axios');

describe('Algorand Driver', () => {
  describe('validateALGORAND', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          id: 'tx123',
          'confirmed-round': 5000,
          fee: 1000,
          sender: 'ADDR123',
          'tx-type': 'pay'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateALGORAND('https://algorand-api.com', 'tx123');

      expect(result.found).toBe(true);
      expect(result.data.id).toBe('tx123');
      expect(result.data.confirmedRound).toBe(5000);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateALGORAND('https://algorand-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateALGORAND('https://algorand-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('DNS lookup failed'));

      const result = await validateALGORAND('https://algorand-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('DNS lookup failed');
    });
  });
});
