const axios = require('axios');
const { validateSTELLAR } = require('../../../drivers/stellar');

jest.mock('axios');

describe('Stellar Driver', () => {
  describe('validateSTELLAR', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          hash: 'tx123',
          successful: true,
          ledger: 5000,
          source_account: 'GABC',
          operation_count: 1
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateSTELLAR('https://stellar-api.com', 'tx123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('tx123');
      expect(result.data.successful).toBe(true);
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateSTELLAR('https://stellar-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateSTELLAR('https://stellar-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Horizon unreachable'));

      const result = await validateSTELLAR('https://stellar-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Horizon unreachable');
    });
  });
});
