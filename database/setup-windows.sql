-- Configuração inicial para PostgreSQL Windows

-- Criar utilizador chainguard
CREATE USER chainguard WITH PASSWORD 'chainguard' CREATEDB;

-- Criar database
CREATE DATABASE chainguard_db OWNER chainguard;
