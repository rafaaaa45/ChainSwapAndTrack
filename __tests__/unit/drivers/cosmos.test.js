const axios = require('axios');
const { validateCOSMOS } = require('../../../drivers/cosmos');

jest.mock('axios');

describe('Cosmos Driver', () => {
  describe('validateCOSMOS', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          tx_response: {
            txhash: 'hash123',
            height: '1000',
            code: 0,
            timestamp: '2024-01-01',
            gas_wanted: '100000',
            gas_used: '50000',
            events: []
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateCOSMOS('https://cosmos-api.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.height).toBe('1000');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateCOSMOS('https://cosmos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateCOSMOS('https://cosmos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Timeout'));

      const result = await validateCOSMOS('https://cosmos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Timeout');
    });
  });
});
