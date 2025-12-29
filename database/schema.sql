-- ChainGuard Database Schema
-- PostgreSQL 12+

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- BLOCKCHAIN NETWORKS
-- Migrated from networks.json
-- =====================================================
CREATE TABLE blockchain_networks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    rpc TEXT[] NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_networks_name ON blockchain_networks(name);
CREATE INDEX idx_networks_type ON blockchain_networks(type);
CREATE INDEX idx_networks_enabled ON blockchain_networks(enabled);

-- =====================================================
-- RPC CACHE
-- Migrated from chains-cache.json
-- =====================================================
CREATE TABLE rpc_cache (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER,
    chain_name VARCHAR(100),
    short_name VARCHAR(50),
    rpc_urls JSONB NOT NULL,
    cached_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_rpc_cache_chain_id ON rpc_cache(chain_id);
CREATE INDEX idx_rpc_cache_chain_name ON rpc_cache(chain_name);
CREATE INDEX idx_rpc_cache_expires ON rpc_cache(expires_at);

-- =====================================================
-- VALIDATION HISTORY
-- Store all transaction validations
-- =====================================================
CREATE TABLE validation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chain VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(255) NOT NULL,
    found BOOLEAN NOT NULL,
    data JSONB,
    error TEXT,
    rpc_used TEXT,
    response_time_ms INTEGER,
    validated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validations_chain ON validation_history(chain);
CREATE INDEX idx_validations_tx_hash ON validation_history(tx_hash);
CREATE INDEX idx_validations_validated_at ON validation_history(validated_at);
CREATE INDEX idx_validations_found ON validation_history(found);

-- =====================================================
-- RPC PERFORMANCE TRACKING
-- Monitor RPC reliability and speed
-- =====================================================
CREATE TABLE rpc_performance (
    id SERIAL PRIMARY KEY,
    chain VARCHAR(50) NOT NULL,
    rpc_url TEXT NOT NULL,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    last_success_at TIMESTAMP,
    last_error_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(chain, rpc_url)
);

CREATE INDEX idx_rpc_perf_chain ON rpc_performance(chain);
CREATE INDEX idx_rpc_perf_updated ON rpc_performance(updated_at);

-- =====================================================
-- API REQUEST LOGS
-- Audit trail for API usage
-- =====================================================
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at);
CREATE INDEX idx_api_logs_ip ON api_logs(ip_address);

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Validation statistics by chain
CREATE VIEW validation_stats AS
SELECT 
    chain,
    COUNT(*) as total_validations,
    SUM(CASE WHEN found THEN 1 ELSE 0 END) as successful_validations,
    ROUND(AVG(response_time_ms)::numeric, 2) as avg_response_time_ms,
    DATE_TRUNC('day', validated_at) as validation_date
FROM validation_history
GROUP BY chain, DATE_TRUNC('day', validated_at);

-- RPC health score
CREATE VIEW rpc_health AS
SELECT 
    chain,
    rpc_url,
    success_count,
    error_count,
    CASE 
        WHEN (success_count + error_count) = 0 THEN 0
        ELSE ROUND((success_count::FLOAT / (success_count + error_count))::numeric * 100, 2)
    END as success_rate,
    CASE
        WHEN success_count = 0 THEN 0
        ELSE ROUND((total_response_time_ms::FLOAT / success_count)::numeric, 2)
    END as avg_response_time_ms
FROM rpc_performance
ORDER BY success_rate DESC;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_networks_updated_at
    BEFORE UPDATE ON blockchain_networks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rpc_performance_updated_at
    BEFORE UPDATE ON rpc_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA (default networks)
-- =====================================================
INSERT INTO blockchain_networks (name, type, rpc) VALUES
    ('ethereum', 'EVM', ARRAY['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth']),
    ('polygon', 'EVM', ARRAY['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon']),
    ('bitcoin', 'UTXO', ARRAY['https://api.blockcypher.com/v1/btc/main']),
    ('solana', 'SOLANA', ARRAY['https://api.mainnet-beta.solana.com'])
ON CONFLICT (name) DO NOTHING;
