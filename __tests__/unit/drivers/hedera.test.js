const axios = require('axios');
const { validateHEDERA } = require('../../../drivers/hedera');

jest.mock('axios');

describe('Hedera Driver', () => {
  describe('validateHEDERA', () => {
    it('deve retornar transação válida quando encontrada', async () => {
      const mockResponse = {
        data: {
          transactions: [{
            transaction_id: 'tx123',
            consensus_timestamp: '1234567.890',
            result: 'SUCCESS',
            charged_tx_fee: 1000
          }]
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await validateHEDERA('https://hedera-api.com', 'tx123');

      expect(result.found).toBe(true);
      expect(result.data.transactionId).toBe('tx123');
      expect(result.data.result).toBe('SUCCESS');
    });

    it('deve retornar erro quando transação não encontrada', async () => {
      axios.get.mockRejectedValue({ response: { status: 404 } });

      const result = await validateHEDERA('https://hedera-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toContain('não encontrada');
    });

    it('deve tratar erro do RPC corretamente', async () => {
      axios.get.mockRejectedValue(Object.assign(new Error('RPC Server Error'), { response: { status: 500 } }));

      const result = await validateHEDERA('https://hedera-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('deve tratar exceções de rede', async () => {
      axios.get.mockRejectedValue(new Error('Mirror node error'));

      const result = await validateHEDERA('https://hedera-api.com', 'tx123');

      expect(result.found).toBe(false);
      expect(result.error).toBe('Mirror node error');
    });
  });
});
