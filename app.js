/* NexusPay v2 — Motor Anti-Errores Google Pay */
/* app.js — Core logic with 5 methods + error solutions */

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCardForm();
    loadSavedCards();
    checkGPayStatus();
});

// ==================== TABS ====================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
            closeSolution();
        });
    });
}

// ==================== STATUS ====================
function showStatus(msg, type = 'info', dur = 3000) {
    const bar = document.getElementById('statusBar');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');
    bar.className = 'status-bar ' + type;
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    text.textContent = msg;
    if (dur > 0) setTimeout(() => bar.classList.add('hidden'), dur);
}

// ==================== GPay STATUS CHECK ====================
function checkGPayStatus() {
    const badge = document.getElementById('gpayStatus');
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    const hasHTTPS = location.protocol === 'https:';

    if (isMobile && isChrome && hasHTTPS) {
        badge.textContent = '✅ Optimo';
        badge.style.background = 'rgba(52,211,153,0.15)';
        badge.style.color = '#34d399';
        badge.style.borderColor = 'rgba(52,211,153,0.3)';
    } else if (!isMobile) {
        badge.textContent = '💻 Desktop';
        badge.style.background = 'rgba(251,191,36,0.15)';
        badge.style.color = '#fbbf24';
        badge.style.borderColor = 'rgba(251,191,36,0.3)';
    } else {
        badge.textContent = '⚠️ Usa Chrome';
        badge.style.background = 'rgba(248,113,113,0.15)';
        badge.style.color = '#f87171';
        badge.style.borderColor = 'rgba(248,113,113,0.3)';
    }
}

// ==================== CARD FORM ====================
function initCardForm() {
    const num = document.getElementById('cardNumber');
    const exp = document.getElementById('cardExpiry');
    const hol = document.getElementById('cardHolder');
    const cvv = document.getElementById('cardCvv');

    num.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').substring(0, 16);
        e.target.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
        updatePreview();
        detectBrand(v);
    });

    exp.addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
        e.target.value = v;
        updatePreview();
    });

    hol.addEventListener('input', () => {
        hol.value = hol.value.toUpperCase();
        updatePreview();
    });

    cvv.addEventListener('input', e => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    });
}

function detectBrand(n) {
    const el = document.getElementById('cardBrand');
    let b = 'VISA';
    if (/^4/.test(n)) b = 'VISA';
    else if (/^5[1-5]/.test(n)) b = 'MASTERCARD';
    else if (/^3[47]/.test(n)) b = 'AMEX';
    else if (/^6(?:011|5)/.test(n)) b = 'DISCOVER';
    else if (/^35/.test(n)) b = 'JCB';
    el.textContent = b;
    el.className = 'card-brand detected';
    return b;
}

function updatePreview() {
    document.getElementById('previewNumber').textContent = document.getElementById('cardNumber').value || '•••• •••• •••• ••••';
    document.getElementById('previewHolder').textContent = document.getElementById('cardHolder').value || 'TU NOMBRE';
    document.getElementById('previewExpiry').textContent = document.getElementById('cardExpiry').value || 'MM/AA';
}

function getCardData() {
    return {
        number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
        holder: document.getElementById('cardHolder').value,
        expiry: document.getElementById('cardExpiry').value,
        cvv: document.getElementById('cardCvv').value,
        brand: document.getElementById('cardBrand').textContent
    };
}

function validate(data) {
    if (!data.number || data.number.length < 13) { showStatus('Numero invalido', 'error'); return false; }
    if (!data.holder || data.holder.length < 2) { showStatus('Nombre requerido', 'error'); return false; }
    if (!data.expiry || data.expiry.length < 5) { showStatus('Vencimiento requerido', 'error'); return false; }
    if (!data.cvv || data.cvv.length < 3) { showStatus('CVV requerido', 'error'); return false; }
    return true;
}

// ==================== METHOD 1: GPay Native Deep Link ====================
function method1_GPayNative() {
    const data = getCardData();
    if (!validate(data)) return;

    showStatus('Preparando enlace a Google Pay...', 'info', 0);

    // Multiple deep link formats for Google Pay
    const deepLinks = [
        'gpay://upi',
        'intent://pay#Intent;scheme=gpay;package=com.google.android.apps.walletnfcrel;end',
        'https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel',
        'https://pay.google.com/gp/m/card/add'
    ];

    // Try native app first
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = deepLinks[0];
    document.body.appendChild(iframe);

    setTimeout(() => {
        document.body.removeChild(iframe);
        // If still on page, try fallback
        showStatus('Si Google Pay no abrio, usa los otros metodos', 'info', 5000);
    }, 2000);

    // Also copy data as backup
    copyToClipboard(formatCardData(data));
    showStatus('Datos copiados + intentando abrir Google Pay', 'success', 5000);
}

// ==================== METHOD 2: Copy Data ====================
function method2_CopyForManual() {
    const data = getCardData();
    if (!validate(data)) return;

    const text = `TARJETA PARA GOOGLE PAY\n` +
        `========================\n` +
        `Numero: ${data.number}\n` +
        `Titular: ${data.holder}\n` +
        `Vence: ${data.expiry}\n` +
        `CVV: ${data.cvv}\n` +
        `Red: ${data.brand}\n` +
        `========================\n` +
        `Pasos:\n` +
        `1. Abre Google Pay\n` +
        `2. Presiona + (Agregar)\n` +
        `3. Selecciona "Tarjeta de credito/debito"\n` +
        `4. Ingresa los datos de arriba\n` +
        `5. Confirma`;

    copyToClipboard(text);
    showStatus('Datos copiados — abre Google Pay y pega', 'success');
}

function method2_CopyFormatted() {
    const data = getCardData();
    if (!validate(data)) return;

    // Copy each field separately for easy pasting
    const text = `${data.number}\n${data.holder}\n${data.expiry}\n${data.cvv}`;
    copyToClipboard(text);
    showStatus('Datos formateados copiados — pegalos campo por campo', 'success');
}

// ==================== METHOD 3: QR Code ====================
let currentQR = null;
function method3_QR() {
    const data = getCardData();
    if (!validate(data)) return;

    const section = document.getElementById('qrSection');
    const canvas = document.getElementById('qrCanvas');
    canvas.innerHTML = '';

    currentQR = new QRCode(canvas, {
        text: JSON.stringify({
            type: 'nexuspay_v2',
            card: data.number,
            holder: data.holder,
            expiry: data.expiry,
            cvv: data.cvv,
            brand: data.brand,
            ts: Date.now()
        }),
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });

    section.classList.remove('hidden');
    showStatus('QR listo — escanea desde tu celular', 'success');
}

function closeQR() {
    document.getElementById('qrSection').classList.add('hidden');
}

// ==================== METHOD 4: Open Google Pay Web ====================
function method4_OpenGPayWeb() {
    window.open('https://pay.google.com/gp/m/card/add', '_blank');
    showStatus('Abriendo Google Pay Web...', 'info');
}

function method4_OpenGPayWallet() {
    window.open('https://wallet.google.com/manage/methods', '_blank');
    showStatus('Abriendo Google Wallet...', 'info');
}

// ==================== METHOD 5: Data URI / Shareable Link ====================
function method5_DataURI() {
    const data = getCardData();
    if (!validate(data)) return;

    // Create a mini HTML page as data URI
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Datos de Tarjeta - NexusPay</title>
<style>body{font-family:sans-serif;background:#111;color:#fff;padding:20px;max-width:400px;margin:0 auto;text-align:center}
.card{background:linear-gradient(135deg,#1a2744,#1e1b4b);border-radius:16px;padding:24px;margin:20px 0;border:1px solid #4285f4}
.field{margin:8px 0;text-align:left}
.field label{font-size:11px;color:#888;display:block}
.field span{font-size:16px;font-family:monospace}
.btn{display:inline-block;padding:12px 24px;background:#4285f4;color:#fff;border:none;border-radius:8px;font-size:16px;margin:10px;cursor:pointer;text-decoration:none}
</style></head><body>
<h2>💳 Datos para Google Pay</h2>
<div class="card">
<div class="field"><label>NUMERO</label><span>${data.number}</span></div>
<div class="field"><label>TITULAR</label><span>${data.holder}</span></div>
<div class="field"><label>VENCE</label><span>${data.expiry}</span></div>
<div class="field"><label>CVV</label><span>${data.cvv}</span></div>
<div class="field"><label>RED</label><span>${data.brand}</span></div>
</div>
<a href="https://pay.google.com/gp/m/card/add" class="btn">🔗 Abrir Google Pay</a>
<p style="color:#888;font-size:12px;margin-top:20px">Generado por NexusPay v2</p>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    document.getElementById('generatedLink').textContent = url;
    document.getElementById('linkSection').classList.remove('hidden');
    showStatus('Link generado — copia o comparte', 'success');
}

function copyGeneratedLink() {
    const link = document.getElementById('generatedLink').textContent;
    copyToClipboard(link);
    showStatus('Link copiado', 'success');
}

function closeLink() {
    document.getElementById('linkSection').classList.add('hidden');
}

// ==================== ERROR SOLUTIONS ENGINE ====================
const SOLUTIONS = {
    'cant-add': {
        title: '❌ "Esta tarjeta no se puede agregar"',
        content: `
<h4>Causas Comunes:</h4>
<ul>
<li>El banco emisor no participa en Google Pay</li>
<li>La tarjeta es prepago sin soporte para tokenizacion</li>
<li>La tarjeta fue rechazada por el sistema antifraude</li>
<li>La tarjeta ya esta en otro Google Account</li>
</ul>
<h4>Soluciones (en orden):</h4>
<ol>
<li><strong>Espera 24 horas</strong> — A veces es un bloqueo temporal del emisor</li>
<li><strong>Llama a tu banco</strong> — Pide que habilite la tarjeta para "pagos digitales" o "tokenización"</li>
<li><strong>Usa otro metodo</strong> — Prueba Copia Manual (Metodo 2) en vez del deep link</li>
<li><strong>Cambia de Google Account</strong> — Prueba con otro correo de Google</li>
<li><strong>Contacta soporte de Google Pay</strong> — pay.google.com/support</li>
<li><strong>Prueba otro navegador</strong> — Firefox o Edge pueden funcionar diferente</li>
</ol>
<h4>Mientras tanto:</h4>
<p>Guarda los datos con NexusPay y reintenta cuando tu banco confirme que la tarjeta esta habilitada.</p>`
    },
    'something-wrong': {
        title: '⚠️ "Algo salio mal"',
        content: `
<h4>Causas:</h4>
<ul>
<li>Error temporal de Google (muy comun)</li>
<li>Servidor de Google Pay sobrecargado</li>
<li>Conexion inestable</li>
<li>Cuota de intentos alcanzada</li>
</ul>
<h4>Soluciones:</h4>
<ol>
<li><strong>Espera 5-15 minutos</strong> — El error 006 es casi siempre temporal</li>
<li><strong>Cambia de red</strong> — De WiFi a datos moviles o viceversa</li>
<li><strong>Activa modo avion 10 segundos</strong> — Resetea la conexion</li>
<li><strong>Limpia cache de Chrome</strong> — Configuracion > Privacidad > Borrar datos de navegacion > Cache</li>
<li><strong>Prueba otro metodo</strong> — Copia Manual (Metodo 2) siempre funciona</li>
<li><strong>Reinicia el telefono</strong> — Soluciona el 70% de errores temporales</li>
</ol>
<h4>Importante:</h4>
<p>NO intentes mas de 3 veces seguidas. Google puede bloquear temporalmente tu cuenta por 24-72 horas.</p>`
    },
    'already-added': {
        title: '🔁 "Esta tarjeta ya esta agregada"',
        content: `
<h4>Causa:</h4>
<p>La tarjeta ya esta vinculada a tu cuenta de Google (o a otra).</p>
<h4>Soluciones:</h4>
<ol>
<li><strong>Ve a Google Pay > Metodos de pago</strong> — Revisa si ya aparece ahi</li>
<li><strong>Busca en otros Google Accounts</strong> — Puede estar en otro correo</li>
<li><strong>Elimina y re-agrega</strong> — Borra la tarjeta existente y vuelve a vincular con NexusPay</li>
<li><strong>Verifica en wallet.google.com</strong> — Revisa desde la web</li>
</ol>
<h4>Si la tarjeta NO aparece pero dice que ya esta:</h4>
<ul>
<li>Puede ser un "fantasma" — la tarjeta se vinculo parcialmente</li>
<li>Espera 24 horas y vuelve a intentar</li>
<li>Contacta a Google Pay soporte</li>
</ul>`
    },
    'not-supported': {
        title: '🏦 "Tu banco no es compatible"',
        content: `
<h4>Soluciones:</h4>
<ol>
<li><strong>Verifica tu banco</strong> — Ve a https://pay.google.com/intl/en_us/about/compatibilidad/ para ver bancos compatibles</li>
<li><strong>Pide a tu banco</strong> — Llama y pregunta si soportan "Google Pay" o "pagos contactless digitales"</li>
<li><strong>Usa otra tarjeta</strong> — Si tienes otra tarjeta de otro banco, pruebala</li>
<li><strong>Abre Google Pay Web</strong> — A veces funciona desde pay.google.com aunque no desde la app</li>
</ol>
<h4>Bancos que SÍ soportan Google Pay (USA):</h4>
<p>Chase, Bank of America, Wells Fargo, Citi, Capital One, Discover, US Bank, PNC, TD Bank, Truist, y muchos mas.</p>`
    },
    'verify-fail': {
        title: '🔐 "Fallo la verificacion"',
        content: `
<h4>Causas:</h4>
<ul>
<li>Datos incorrectos en el formulario</li>
<li>Direccion de facturacion no coincide con la del banco</li>
<li>CVV incorrecto</li>
<li>Fecha de vencimiento equivocada</li>
</ul>
<h4>Soluciones:</h4>
<ol>
<li><strong>Verifica cada campo</strong> — Numero, nombre, fecha, CVV deben ser EXACTOS como en la tarjeta</li>
<li><strong>Usa la direccion exacta</strong> — La que registroste en tu banco</li>
<li><strong>Prueba desde la web</strong> — pay.google.com/gp/m/card/add</li>
<li><strong>Contacta al banco</strong> — Puede haber un bloqueo temporal en verificaciones</li>
<li><strong>Usa el CVV del reverso</strong> — Asegurate de leer el CVV correcto</li>
</ol>`
    },
    'region-block': {
        title: '🌍 "Google Pay no esta disponible en tu region"',
        content: `
<h4>Soluciones:</h4>
<ol>
<li><strong>Cambia tu region de Google</strong> — Google Account > Personal info > Country</li>
<li><strong>Usa una VPN a USA</strong> — Conectate a un servidor en Estados Unidos</li>
<li><strong>Abre desde pay.google.com</strong> — La web puede funcionar aunque la app no</li>
<li><strong>Cambia region del telefono</strong> — Settings > System > Languages > Region</li>
<li><strong>Reinstala Google Pay</strong> — Despues de cambiar la region</li>
</ol>
<h4>Paises con Google Pay completo:</h4>
<p>USA, UK, Canada, Australia, Singapore, Japan, y 40+ paises mas.</p>`
    },
    'card-type': {
        title: '💳 "Tipo de tarjeta no soportado"',
        content: `
<h4>Causa:</h4>
<p>Algunos tipos de tarjeta no son compatibles con Google Pay.</p>
<h4>Tipos NO soportados:</h4>
<ul>
<li>❌ Tarjetas de regalo / Gift cards</li>
<li>❌ Tarjetas de cafeteria / meal cards</li>
<li>❌ Tarjetas de salud / HSA (algunas)</li>
<li>❌ Tarjetas prepago sin BIN compatible</li>
<li>❌ Tarjetas de beneficios gubernamentales</li>
</ul>
<h4>Tipos SÍ soportados:</h4>
<ul>
<li>✅ Visa, Mastercard, Amex, Discover</li>
<li>✅ Debito de bancos grandes</li>
<li>✅ Credito de bancos participantes</li>
</ul>
<h4>Solucion:</h4>
<p>Si tu tarjeta es de un tipo no soportado, no hay workaround. Necesitas otra tarjeta.</p>`
    },
    'outdated': {
        title: '📱 "Actualiza tu app de Google Pay"',
        content: `
<h4>Soluciones:</h4>
<ol>
<li><strong>Ve a Play Store</strong> — Busca "Google Pay" y presiona "Actualizar"</li>
<li><strong>Si no hay actualizacion</strong> — Desinstala y vuelve a instalar</li>
<li><strong>Desde la web</strong> — Abre pay.google.com que siempre esta actualizado</li>
<li><strong>Verifica Android</strong> — Necesitas Android 5.0 o superior</li>
</ol>
<p><strong>Tip:</strong> Siempre usa el metodo web (pay.google.com) como alternativa cuando la app tiene problemas.</p>`
    }
};

function showErrorSolution(errorId) {
    const sol = SOLUTIONS[errorId];
    if (!sol) return;

    document.getElementById('solutionTitle').textContent = sol.title;
    document.getElementById('solutionContent').innerHTML = sol.content;
    document.getElementById('solutionPanel').classList.remove('hidden');
    document.getElementById('solutionPanel').scrollIntoView({ behavior: 'smooth' });
}

function closeSolution() {
    const panel = document.getElementById('solutionPanel');
    if (panel) panel.classList.add('hidden');
}

// ==================== CARD MANAGEMENT ====================
function saveCard() {
    const data = getCardData();
    if (!validate(data)) return;

    const cards = getStoredCards();
    if (cards.find(c => c.number === data.number)) {
        showStatus('Esta tarjeta ya esta guardada', 'info');
        return;
    }

    cards.push({
        ...data,
        numberMasked: '•••• •••• •••• ' + data.number.slice(-4),
        id: Date.now().toString(36),
        saved: new Date().toISOString()
    });

    localStorage.setItem('nexuspay_cards', JSON.stringify(cards));
    showStatus('Tarjeta guardada', 'success');
    loadSavedCards();
}

function getStoredCards() {
    try { return JSON.parse(localStorage.getItem('nexuspay_cards') || '[]'); } catch { return []; }
}

function loadSavedCards() {
    const cards = getStoredCards();
    const list = document.getElementById('cardsList');

    if (cards.length === 0) {
        list.innerHTML = '<div class="empty-state"><span class="empty-icon">💳</span><p>No tienes tarjetas guardadas</p></div>';
        return;
    }

    list.innerHTML = cards.map(c => `
        <div class="card-item">
            <div class="card-item-info">
                <div class="card-item-number">${c.numberMasked}</div>
                <div class="card-item-meta">${c.brand} — ${c.holder} — Exp: ${c.expiry}</div>
            </div>
            <div class="card-item-actions">
                <button class="card-item-btn" title="Vincular" onclick="reuseCard('${c.id}')">🔗</button>
                <button class="card-item-btn" title="Copiar" onclick="copyCard('${c.id}')">📋</button>
                <button class="card-item-btn" title="Eliminar" onclick="deleteCard('${c.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function reuseCard(id) {
    const card = getStoredCards().find(c => c.id === id);
    if (!card) return;
    document.getElementById('cardNumber').value = card.number.replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('cardHolder').value = card.holder;
    document.getElementById('cardExpiry').value = card.expiry;
    document.getElementById('cardCvv').value = '';
    detectBrand(card.number);
    updatePreview();
    document.querySelector('[data-tab="add"]').click();
    showStatus('Tarjeta cargada — ingresa CVV y vincula', 'info', 4000);
}

function copyCard(id) {
    const card = getStoredCards().find(c => c.id === id);
    if (!card) return;
    copyToClipboard(`${card.number}\n${card.holder}\n${card.expiry}\n${card.cvv}`);
    showStatus('Datos copiados', 'success');
}

function deleteCard(id) {
    if (!confirm('Eliminar esta tarjeta?')) return;
    const cards = getStoredCards().filter(c => c.id !== id);
    localStorage.setItem('nexuspay_cards', JSON.stringify(cards));
    loadSavedCards();
    showStatus('Eliminada', 'info');
}

function clearAllCards() {
    if (!confirm('Eliminar TODAS las tarjetas?')) return;
    localStorage.removeItem('nexuspay_cards');
    loadSavedCards();
    showStatus('Todas eliminadas', 'info');
}

// ==================== HELPERS ====================
function formatCardData(d) {
    return `Tarjeta: ${d.number}\nTitular: ${d.holder}\nVence: ${d.expiry}\nCVV: ${d.cvv}\nRed: ${d.brand}`;
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}
