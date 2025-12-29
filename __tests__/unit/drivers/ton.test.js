const axios = require('axios');
const { validateTON } = require('../../../drivers/ton');

jest.mock('axios');

describe('TON Driver', () => {
  describe('validateTON', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: [{
            transaction_id: { lt: '1000000' },
            address: 'EQabc...',
            utime: 1234567890,
            fee: '100000',
            in_msg: {},
            out_msgs: []
          }]
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateTON('https://ton-api.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.lt).toBe('1000000');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { result: [] }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateTON('https://ton-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateTON('https://ton-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('TonLib error'));

      const result = await validateTON('https://ton-api.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('TonLib error');
    });
  });
});
