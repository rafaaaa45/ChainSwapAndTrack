const axios = require('axios');
const { validateMULTIVERSX } = require('../../../drivers/multiversx');

jest.mock('axios');

describe('MultiversX Driver', () => {
  describe('validateMULTIVERSX', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          txHash: 'hash123',
          status: 'success',
          round: 5000,
          sender: 'erd1abc',
          receiver: 'erd1xyz',
          value: '1000000'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateMULTIVERSX('https://multiversx-api.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.status).toBe('success');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateMULTIVERSX('https://multiversx-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateMULTIVERSX('https://multiversx-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Gateway timeout'));

      const result = await validateMULTIVERSX('https://multiversx-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Gateway timeout');
    });
  });
});
