const axios = require('axios');
const fs = require('fs');
const { getChainsData, fetchFromChainlist } = require('../../rpc-fetcher');

jest.mock('axios');
jest.mock('fs');

describe('RPC Fetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getChainsData', () => {
    it('deve retornar null quando tudo falha (sem cache prévio)', async () => {
      // This test must run FIRST before any cache is populated
      fs.existsSync.mockReturnValue(false);
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await getChainsData();

      expect(result).toBeNull();
    });

    it('deve buscar do chainlist.org quando não há cache', async () => {
      const mockChains = [{ chainId: 1, name: 'Ethereum', rpc: ['https://eth.com'] }];
      
      fs.existsSync.mockReturnValue(false);
      axios.get.mockResolvedValue({ data: mockChains });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await getChainsData();

      expect(result).toEqual(mockChains);
      expect(axios.get).toHaveBeenCalledWith('https://chainid.network/chains.json', { timeout: 10000 });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('deve retornar cache de arquivo quando válido', async () => {
      const mockCachedData = {
        data: [{ chainId: 1, name: 'Ethereum', rpc: ['https://eth.com'] }],
        timestamp: Date.now() - (1 * 60 * 60 * 1000) // 1 hour ago (still valid)
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCachedData));

      const result = await getChainsData();

      expect(result).toEqual(mockCachedData.data);
    });

    it('deve retornar cache de arquivo quando chainlist falha', async () => {
      const mockCachedData = {
        data: [{ chainId: 1, name: 'Ethereum', rpc: ['https://eth.com'] }],
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // expired
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockCachedData));
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await getChainsData();

      expect(result).toEqual(mockCachedData.data);
    });
  });

  describe('fetchFromChainlist', () => {
    it('deve encontrar chain por correspondência exata de shortName', async () => {
      const mockChains = [
        { chainId: 1, name: 'Ethereum Mainnet', rpc: ['https://eth.com'], shortName: 'eth' },
        { chainId: 137, name: 'Polygon', rpc: ['https://polygon.com'], shortName: 'matic' }
      ];
      
      fs.existsSync.mockReturnValue(false);
      axios.get.mockResolvedValue({ data: mockChains });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await fetchFromChainlist('eth');

      expect(result).toEqual(['https://eth.com']);
    });

    it('deve encontrar chain por nome (começa com)', async () => {
      const mockChains = [
        { chainId: 1, name: 'Ethereum Mainnet', rpc: ['https://eth.com'], shortName: 'eth' }
      ];
      
      fs.existsSync.mockReturnValue(false);
      axios.get.mockResolvedValue({ data: mockChains });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await fetchFromChainlist('ethereum');

      expect(result).toEqual(['https://eth.com']);
    });

    it('deve filtrar RPCs inválidos', async () => {
      const mockChains = [
        { 
          chainId: 1, 
          name: 'Ethereum', 
          shortName: 'eth',
          rpc: [
            'https://eth.com',
            '${INFURA_API_KEY}',
            'https://eth.INFURA.io',
            'https://ALCHEMY.com/api'
          ] 
        }
      ];
      
      fs.existsSync.mockReturnValue(false);
      axios.get.mockResolvedValue({ data: mockChains });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await fetchFromChainlist('eth');

      expect(result).toEqual(['https://eth.com']);
    });

    it('deve retornar null quando chain não encontrada', async () => {
      const mockChains = [
        { chainId: 1, name: 'Ethereum', rpc: ['https://eth.com'], shortName: 'eth' }
      ];
      
      fs.existsSync.mockReturnValue(false);
      axios.get.mockResolvedValue({ data: mockChains });
      fs.writeFileSync.mockReturnValue(undefined);

      const result = await fetchFromChainlist('unknown-chain-xyz-999');

      expect(result).toBeNull();
    });
  });
});
