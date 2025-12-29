const request = require('supertest');
const express = require('express');
const cors = require('cors');
const { validateTransaction } = require('../../drivers/validator');

jest.mock('../../drivers/validator');

// Setup mini app para testes
const app = express();
app.use(cors());
app.use(express.json());

let BLOCKCHAIN_CONFIG = {
  'ETH': { type: 'EVM', rpc: 'https://eth.llamarpc.com' },
  'BTC': { type: 'UTXO', rpc: 'https://api.blockcypher.com/v1/btc/main' }
};

app.get('/api/networks', (req, res) => {
  res.json(BLOCKCHAIN_CONFIG);
});

app.post('/api/validate', async (req, res) => {
  const { chain, hash } = req.body;
  
  if (!chain || !hash) {
    return res.json({ valid: false, error: "Chain e hash são obrigatórios" });
  }

  if (!BLOCKCHAIN_CONFIG[chain]) {
    return res.json({ valid: false, error: `Rede ${chain} desconhecida` });
  }

  try {
    const result = await validateTransaction(BLOCKCHAIN_CONFIG[chain], hash);
    res.json(result.found 
      ? { valid: true, data: result.data }
      : { valid: false, error: result.error || "Transação não encontrada" }
    );
  } catch (e) {
    res.json({ valid: false, error: e.message });
  }
});

describe('API Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/networks', () => {
    test('deve retornar lista de redes configuradas', async () => {
      const response = await request(app)
        .get('/api/networks')
        .expect(200);

      expect(response.body).toHaveProperty('ETH');
      expect(response.body).toHaveProperty('BTC');
      expect(response.body.ETH.type).toBe('EVM');
    });
  });

  describe('POST /api/validate', () => {
    test('deve validar transação com sucesso', async () => {
      const mockData = { hash: '0x123', from: '0xabc', to: '0xdef' };
      validateTransaction.mockResolvedValue({ found: true, data: mockData });

      const response = await request(app)
        .post('/api/validate')
        .send({ chain: 'ETH', hash: '0x123' })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.data).toEqual(mockData);
    });

    test('deve retornar erro quando chain faltando', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({ hash: '0x123' })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Chain e hash são obrigatórios');
    });

    test('deve retornar erro quando hash faltando', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({ chain: 'ETH' })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Chain e hash são obrigatórios');
    });

    test('deve retornar erro para rede desconhecida', async () => {
      const response = await request(app)
        .post('/api/validate')
        .send({ chain: 'UNKNOWN', hash: '0x123' })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toContain('desconhecida');
    });

    test('deve retornar erro quando transação não encontrada', async () => {
      validateTransaction.mockResolvedValue({ 
        found: false, 
        error: 'Transação não encontrada' 
      });

      const response = await request(app)
        .post('/api/validate')
        .send({ chain: 'ETH', hash: '0xinvalid' })
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.error).toBe('Transação não encontrada');
    });
  });
});
