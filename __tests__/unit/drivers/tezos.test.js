const axios = require('axios');
const { validateTEZOS } = require('../../../drivers/tezos');

jest.mock('axios');

describe('Tezos Driver', () => {
  describe('validateTEZOS', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: [
          [{
            hash: 'hash123',
            branch: 'branch123',
            protocol: 'proto',
            signature: 'sig123',
            contents: []
          }]
        ]
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateTEZOS('https://tezos-rpc.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.hash).toBe('hash123');
      expect(result.data.branch).toBe('branch123');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = { data: [[]] };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateTEZOS('https://tezos-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateTEZOS('https://tezos-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Connection lost'));

      const result = await validateTEZOS('https://tezos-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Connection lost');
    });
  });
});
