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

function formatTransactionData(data) {
    let html = `
        <div style="margin-bottom: 20px; border-bottom: 1px dashed #333; padding-bottom: 15px;">
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">TRANSACÇÃO ANALISADA</div>
            <code style="color: var(--secondary); font-size: 0.9rem; word-break: break-all;">${data.hash}</code>
        </div>
        
        <div class="timeline">
    `;

    // 1. Renderizar os Eventos Detetados
    data.events.forEach(event => {
        const isBridge = event.type.includes('CROSS-CHAIN');
        const icon = isBridge ? '🔒' : '💸';
        
        html += `
            <div class="timeline-item ${isBridge ? 'event-bridge' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <strong style="color: ${isBridge ? '#f1c40f' : 'var(--text)'};">
                        ${icon} ${event.type}
                    </strong>
                    <span class="badge-network">ETHEREUM</span>
                </div>
                <div style="margin-top: 8px; font-size: 1rem; color: #fff;">
                    ${event.value} <small style="color: #666;">tokens</small>
                </div>
                <div style="margin-top: 5px; font-size: 0.8rem; color: #888;">
                    ${isBridge ? `Recetor na Polygon: <code>${event.to_polygon_user.substring(0,15)}...</code>` : 
                                 `Destinatário: <code>${event.to.substring(0,15)}...</code>`}
                </div>
            </div>
        `;
    });

    // 2. Renderizar o Passo 2 (Verificação Cruzada de Destino)
    if (data.bridge_destination_check) {
        const isConfirmed = data.bridge_destination_check.status.includes('CONFIRMADO');
        html += `
            <div class="timeline-item dest-poly" style="border-left-color: ${isConfirmed ? '#00ff88' : '#8247e5'};">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <strong style="color: ${isConfirmed ? '#00ff88' : '#8247e5'};">🛰️ RASTREADOR DE DESTINO</strong>
                    <span class="badge-network" style="background: #8247e5;">POLYGON</span>
                </div>
                <div style="margin-top: 10px;">
                    <span class="${isConfirmed ? '' : 'status-blink'}" style="color: ${isConfirmed ? '#00ff88' : '#f1c40f'};">
                        ${data.bridge_destination_check.status}
                    </span>
                </div>
                <div style="margin-top: 5px; font-size: 0.8rem; color: #888;">
                    ${data.bridge_destination_check.details}
                </div>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

// Carregar redes ao iniciar
document.addEventListener('DOMContentLoaded', loadNetworks);