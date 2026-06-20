/* global document, alert, fetch */
const API_URL = 'http://localhost:3000/api';

// Alternar entre tabs
function switchTab(event, tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.currentTarget.classList.add('active');
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

async function loadNetworks() {
    try {
        const res = await fetch(`${API_URL}/networks`);
        const networks = await res.json(); 
        
        const select = document.getElementById('chain');
        if (!select) return;

        // 1. Limpa tudo e deixa apenas o placeholder
        select.innerHTML = '<option value="" disabled selected>-- Selecione uma rede --</option>';

        // 2. Verifica se recebemos um Array (formato do Postgres)
        if (Array.isArray(networks)) {
            networks.forEach(net => {
                const opt = document.createElement('option');
                // IMPORTANTE: usamos net.name porque é o que o validateEVM espera
                opt.value = net.name; 
                opt.innerText = `${net.name.toUpperCase()} (${net.type})`;
                select.appendChild(opt);
            });
            console.log("✅ Redes carregadas:", networks.length);
        } else {
            // Caso a API ainda envie o formato antigo (Objeto)
            Object.keys(networks).forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = `${key.toUpperCase()} (${networks[key].type})`;
                select.appendChild(opt);
            });
        }
    } catch (e) { 
        console.error("❌ Erro ao carregar redes para o dropdown:", e); 
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

function formatTransactionData(data, chainName) {
    // 1. ISTO É O MAIS IMPORTANTE: Vai imprimir no teu browser tudo o que o Node.js descobriu
    console.log("=== DADOS REAIS RECEBIDOS DO NODE.JS ===", data);

    const events = data.events || [];
    const bridgeEvent = events.length > 0 ? events[0] : null;

    // 2. Extração crua: Só pega no que existe. Sem valores inventados.
    let tokenAmount = 'Valor não extraído dos logs';
    let destinationAddress = 'Endereço não extraído dos logs';

    if (bridgeEvent) {
        // Tenta apanhar os nomes mais comuns que o teu Node.js possa estar a usar
        tokenAmount = bridgeEvent.value || bridgeEvent.amount || bridgeEvent.tokens || 'Valor não detetado pelo Node.js';
        destinationAddress = bridgeEvent.to_polygon_user || bridgeEvent.receiver || bridgeEvent.to || bridgeEvent.destination || 'Endereço não detetado pelo Node.js';
    }

    // 3. Status Real da Ponte
    const destCheck = data.bridge_destination_check || {};
    const statusDestino = destCheck.status || 'SEM ESTADO';
    const isConfirmed = statusDestino.toUpperCase().includes('CONFIRMADO') || statusDestino.toUpperCase() === 'SUCESSO';
    const detalhesDestino = destCheck.details || 'O backend não retornou detalhes do destino.';

    const mintTx = destCheck.mint_tx || null;
    const mintBlock = destCheck.mint_block || null;
    const polygonToken = destCheck.polygon_token || null;

    // 4. Desenha a UI com base única e exclusivamente no que veio da API
    return `
        <div class="timeline-container">
            <h3 class="timeline-title">STATUS CROSS-CHAIN REAL</h3>
            <div class="timeline">
                
                <div class="timeline-step completed">
                    <div class="step-icon">✓</div>
                    <div class="step-content">
                        <h4>1. Bloqueio na Origem (${chainName ? chainName.toUpperCase() : 'ETHEREUM'})</h4>
                        <p>Hash: <code>${data.hash}</code></p>
                        <p>De: <code>${data.from}</code></p>
                        <p>Tokens bloqueados: <strong style="color: #00ffcc;">${tokenAmount}</strong></p>
                        <p>Bloco: <strong>${data.block}</strong> &nbsp;|&nbsp; Gas usado: <strong>${data.gas_used}</strong></p>
                        <span class="status-badge success">Concluído</span>
                    </div>
                </div>

                <div class="timeline-step completed">
                    <div class="step-icon">✓</div>
                    <div class="step-content">
                        <h4>2. Eventos Detetados na Transação</h4>
                        <p>Total de eventos: <strong>${events.length}</strong></p>
                        ${events.map(e => `<p style="font-size:0.85em; color:#aaa;">• ${e.type}${e.value ? ' — ' + e.value : ''}</p>`).join('')}
                        <span class="status-badge success">Processado</span>
                    </div>
                </div>

                <div class="timeline-step ${isConfirmed ? 'completed' : 'processing'}">
                    <div class="step-icon">${isConfirmed ? '✓' : '⚙'}</div>
                    <div class="step-content">
                        <h4>3. Chegada no Destino (Polygon)</h4>
                        <p>Destinatário: <code>${destinationAddress}</code></p>
                        ${polygonToken ? `<p>Token na Polygon: <code>${polygonToken}</code></p>` : ''}
                        ${mintTx ? `<p>Hash do mint: <code>${mintTx}</code></p>` : ''}
                        ${mintBlock ? `<p>Bloco do mint: <strong>${mintBlock}</strong></p>` : ''}
                        <p style="margin-top: 5px; color: ${isConfirmed ? '#00ffcc' : '#ffcc00'};">
                            ${detalhesDestino}
                        </p>
                        <span class="status-badge ${isConfirmed ? 'success' : 'pending'}">
                            ${statusDestino}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    `;
}

// Carregar redes ao iniciar
document.addEventListener('DOMContentLoaded', loadNetworks);