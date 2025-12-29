/* global document, alert, fetch */
const API_URL = 'http://localhost:3000/api';

// Alternar entre tabs
function switchTab(event, tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Carregar redes disponíveis
async function loadNetworks() {
    try {
        const res = await fetch(`${API_URL}/networks`);
        const config = await res.json();
        const select = document.getElementById('chain');
        select.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.innerText = '-- Selecione uma rede --';
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        select.appendChild(defaultOpt);

        Object.keys(config).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.innerText = `${key} (${config[key].type})`;
            select.appendChild(opt);
        });
    } catch (e) { 
        console.error("Erro ao carregar redes:", e); 
    }
}

// Adicionar nova rede
async function addNetwork() {
    const output = document.getElementById('add-result');
    const symbol = document.getElementById('man-symbol').value.trim();
    const type = document.getElementById('man-type').value;
    const rpc = document.getElementById('man-rpc').value.trim();

    if (!symbol) {
        alert("Por favor insira o símbolo da rede!");
        return;
    }

    showLoading(output, 'A adicionar rede...');

    try {
        const res = await fetch(`${API_URL}/add-network`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol, type, rpc: rpc || undefined })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showSuccess(output, `✅ Rede ${symbol.toUpperCase()} adicionada!<br>RPC: ${data.network.rpc}`);
            loadNetworks();
            clearForm(['man-symbol', 'man-rpc']);
        } else {
            showError(output, data.error);
        }
    } catch (e) {
        showError(output, 'Erro ao conectar com o servidor');
    }
}

// Validar transação
async function validate() {
    const btn = document.getElementById('btn-val');
    const output = document.getElementById('result');
    const chain = document.getElementById('chain').value;
    const hash = document.getElementById('val-hash').value.trim();

    if (!chain || !hash) {
        alert("Por favor preencha todos os campos!");
        return;
    }

    btn.disabled = true;
    btn.innerText = "🔍 A validar...";
    showLoading(output, 'A verificar transação na blockchain...');

    try {
        const res = await fetch(`${API_URL}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chain, hash })
        });
        
        const data = await res.json();
        
        if (data.valid) {
            showSuccess(output, `
                <div class="result-title">✅ TRANSAÇÃO VÁLIDA</div>
                <div class="result-data">
                    ${formatTransactionData(data.data, chain)}
                </div>
            `);
        } else {
            showError(output, data.error);
        }
    } catch (e) {
        showError(output, 'Erro ao conectar com o servidor');
    }

    btn.disabled = false;
    btn.innerText = "Validar Transação";
}

// Funções helper
function showLoading(element, message) {
    element.style.display = 'block';
    element.className = 'result';
    element.innerHTML = `<div class="loading">⏳ ${message}</div>`;
}

function showSuccess(element, message) {
    element.style.display = 'block';
    element.className = 'result success';
    element.innerHTML = message;
}

function showError(element, message) {
    element.style.display = 'block';
    element.className = 'result error';
    element.innerHTML = `<div class="result-title">❌ ERRO</div><div class="result-data">${message}</div>`;
}

function clearForm(fieldIds) {
    fieldIds.forEach(id => document.getElementById(id).value = '');
}

function formatTransactionData(data, chain) {
    return Object.entries(data)
        .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
        .join('');
}

// Carregar redes ao iniciar
document.addEventListener('DOMContentLoaded', loadNetworks);
