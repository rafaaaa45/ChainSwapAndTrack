const axios = require('axios');
const { validateAPTOS } = require('../../../drivers/aptos');

jest.mock('axios');

describe('Aptos Driver', () => {
  describe('validateAPTOS', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          hash: 'hash123',
          version: '1000',
          success: true,
          sender: '0xabc',
          gas_used: '100'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateAPTOS('https://aptos-api.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.version).toBe('1000');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateAPTOS('https://aptos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateAPTOS('https://aptos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Request timeout'));

      const result = await validateAPTOS('https://aptos-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
  });
});
