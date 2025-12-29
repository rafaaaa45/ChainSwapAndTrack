const axios = require('axios');
const { validatePOLKADOT } = require('../../../drivers/polkadot');

jest.mock('axios');

describe('Polkadot Driver', () => {
  describe('validatePOLKADOT', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          result: {
            block: {
              header: {
                parentHash: 'parent123',
                number: '0x3e8',
                stateRoot: 'state123',
                extrinsicsRoot: 'ext123'
              },
              extrinsics: []
            }
          }
        }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validatePOLKADOT('https://polkadot-rpc.com', 'hash123');

      expect(result.found).toBe(true);
      expect(result.data.blockHash).toBe('hash123');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      const mockResponse = {
        data: { error: { message: 'Block not found' } }
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await validatePOLKADOT('https://polkadot-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Block not found');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.post.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validatePOLKADOT('https://polkadot-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.post.mockRejectedValue(new Error('Socket hang up'));

      const result = await validatePOLKADOT('https://polkadot-rpc.com', 'hash123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Socket hang up');
    });
  });
});
