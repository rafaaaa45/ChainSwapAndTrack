const axios = require('axios');
const { validateFLOW } = require('../../../drivers/flow');

jest.mock('axios');

describe('Flow Driver', () => {
  describe('validateFLOW', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: {
            status: 'SEALED',
            statusCode: 0,
            events: [],
            blockId: 'block123',
            blockHeight: 1000,
            gasUsed: 100
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateFLOW('https://flow-rpc.com', 'tx123');

      expect(result.found).toBe(true);
      expect(result.data.transactionId).toBe('tx123');
      expect(result.data.status).toBe('SEALED');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { error: { message: 'Transaction not found' } }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validateFLOW('https://flow-rpc.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Transaction not found');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateFLOW('https://flow-rpc.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValue(new Error('Access API error'));

      const result = await validateFLOW('https://flow-rpc.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Access API error');
    });
  });
});
