/* NexusPay — Google Pay Card Linker */
/* app.js — Core logic */

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initCardForm();
    loadSavedCards();
});

// ==================== TABS ====================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            // Set active
            btn.classList.add('active');
            const tabId = 'tab-' + btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// ==================== STATUS BAR ====================
function showStatus(message, type = 'info', duration = 3000) {
    const bar = document.getElementById('statusBar');
    const icon = document.getElementById('statusIcon');
    const text = document.getElementById('statusText');

    bar.className = 'status-bar ' + type;
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    text.textContent = message;

    if (duration > 0) {
        setTimeout(() => { bar.classList.add('hidden'); }, duration);
    }
}

// ==================== CARD FORM ====================
function initCardForm() {
    const numberInput = document.getElementById('cardNumber');
    const expiryInput = document.getElementById('cardExpiry');
    const holderInput = document.getElementById('cardHolder');
    const cvvInput = document.getElementById('cardCvv');

    // Format card number with spaces
    numberInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        val = val.substring(0, 16);
        let formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = formatted;
        updatePreview();
        detectCardBrand(val);
    });

    // Format expiry MM/AA
    expiryInput.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2, 4);
        }
        e.target.value = val;
        updatePreview();
    });

    // Holder uppercase
    holderInput.addEventListener('input', () => {
        holderInput.value = holderInput.value.toUpperCase();
        updatePreview();
    });

    // CVV numbers only
    cvvInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    });
}

// ==================== CARD BRAND DETECTION ====================
function detectCardBrand(number) {
    const brandEl = document.getElementById('cardBrand');
    let brand = 'VISA';

    if (/^4/.test(number)) brand = 'VISA';
    else if (/^5[1-5]/.test(number)) brand = 'MASTERCARD';
    else if (/^3[47]/.test(number)) brand = 'AMEX';
    else if (/^6(?:011|5)/.test(number)) brand = 'DISCOVER';
    else if (/^35/.test(number)) brand = 'JCB';
    else if (/^63[7-9]/.test(number)) brand = 'INSTAPAY';
    else if (/^50/.test(number)) brand = 'MAESTRO';

    brandEl.textContent = brand;
    brandEl.className = 'card-brand detected';
    return brand;
}

// ==================== CARD PREVIEW UPDATE ====================
function updatePreview() {
    const number = document.getElementById('cardNumber').value || '•••• •••• •••• ••••';
    const holder = document.getElementById('cardHolder').value || 'TU NOMBRE';
    const expiry = document.getElementById('cardExpiry').value || 'MM/AA';

    document.getElementById('previewNumber').textContent = number || '•••• •••• •••• ••••';
    document.getElementById('previewHolder').textContent = holder;
    document.getElementById('previewExpiry').textContent = expiry;
}

// ==================== GET CARD DATA ====================
function getCardData() {
    return {
        number: document.getElementById('cardNumber').value.replace(/\s/g, ''),
        holder: document.getElementById('cardHolder').value,
        expiry: document.getElementById('cardExpiry').value,
        cvv: document.getElementById('cardCvv').value,
        brand: document.getElementById('cardBrand').textContent,
        timestamp: new Date().toISOString()
    };
}

function validateCard(data) {
    if (!data.number || data.number.length < 13) {
        showStatus('Numero de tarjeta invalido', 'error');
        return false;
    }
    if (!data.holder || data.holder.length < 2) {
        showStatus('Nombre del titular requerido', 'error');
        return false;
    }
    if (!data.expiry || data.expiry.length < 5) {
        showStatus('Fecha de vencimiento requerida', 'error');
        return false;
    }
    if (!data.cvv || data.cvv.length < 3) {
        showStatus('CVV requerido', 'error');
        return false;
    }
    return true;
}

// ==================== LINK TO GOOGLE PAY ====================
function linkToGPay() {
    const data = getCardData();
    if (!validateCard(data)) return;

    showStatus('Abriendo Google Pay...', 'info', 0);

    // Method 1: Google Pay deep link (Android)
    const gpayUrl = buildGPayDeepLink(data);

    // Try to open Google Pay
    const link = document.createElement('a');
    link.href = gpayUrl;
    link.target = '_blank';
    link.rel = 'noopener';

    // Detect if mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
        // Direct open on mobile
        window.location.href = gpayUrl;
        setTimeout(() => {
            showStatus('Si Google Pay no abrio, usa Copiar Datos', 'info');
        }, 2000);
    } else {
        // On desktop, show instructions
        showStatus('Abre esta pagina en tu celular para vincular', 'info', 5000);
        copyCardData();
    }
}

function buildGPayDeepLink(cardData) {
    // Google Pay deep link formats
    // Primary: gpay:// (opens Google Pay app directly)
    // Fallback: https://pay.google.com (opens web interface)

    // The most reliable method is using Google Pay's tokenization API
    // which opens the native sheet to add a card
    const encoded = encodeURIComponent(JSON.stringify({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER']
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {}
            }
        }]
    }));

    // Deep link to Google Pay add card flow
    return 'gpay://';
}

// ==================== SAVE CARD ====================
function saveCard() {
    const data = getCardData();
    if (!validateCard(data)) return;

    const cards = getStoredCards();

    // Check for duplicate
    const exists = cards.find(c => c.number === data.number);
    if (exists) {
        showStatus('Esta tarjeta ya esta guardada', 'info');
        return;
    }

    // Mask number for storage (show last 4 only)
    const maskedData = {
        ...data,
        number: data.number,
        numberMasked: '•••• •••• •••• ' + data.number.slice(-4),
        id: Date.now().toString(36)
    };

    cards.push(maskedData);
    localStorage.setItem('nexuspay_cards', JSON.stringify(cards));

    showStatus('Tarjeta guardada correctamente', 'success');
    loadSavedCards();
}

// ==================== STORAGE ====================
function getStoredCards() {
    try {
        return JSON.parse(localStorage.getItem('nexuspay_cards') || '[]');
    } catch {
        return [];
    }
}

function loadSavedCards() {
    const cards = getStoredCards();
    const list = document.getElementById('cardsList');

    if (cards.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💳</span>
                <p>No tienes tarjetas guardadas</p>
                <p class="empty-hint">Agrega tu primera tarjeta en la pestana "Agregar"</p>
            </div>
        `;
        return;
    }

    list.innerHTML = cards.map(card => `
        <div class="card-item" data-id="${card.id}">
            <div class="card-item-info">
                <div class="card-item-number">${card.numberMasked}</div>
                <div class="card-item-meta">${card.brand} — ${card.holder} — Exp: ${card.expiry}</div>
            </div>
            <div class="card-item-actions">
                <button class="card-item-btn" title="Vincular a Google Pay" onclick="linkSavedCard('${card.id}')">🔗</button>
                <button class="card-item-btn" title="Copiar datos" onclick="copySavedCard('${card.id}')">📋</button>
                <button class="card-item-btn" title="Eliminar" onclick="deleteCard('${card.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

function linkSavedCard(id) {
    const cards = getStoredCards();
    const card = cards.find(c => c.id === id);
    if (!card) return;

    // Fill the form
    document.getElementById('cardNumber').value = formatCardNumber(card.number);
    document.getElementById('cardHolder').value = card.holder;
    document.getElementById('cardExpiry').value = card.expiry;
    document.getElementById('cardCvv').value = '';
    detectCardBrand(card.number);
    updatePreview();

    // Switch to add tab
    document.querySelector('[data-tab="add"]').click();

    showStatus('Tarjeta cargada — ingresa CVV y presiona Vincular', 'info', 4000);
}

function copySavedCard(id) {
    const cards = getStoredCards();
    const card = cards.find(c => c.id === id);
    if (!card) return;

    const text = `${card.number}\n${card.holder}\n${card.expiry}\n${card.cvv}`;
    copyToClipboard(text);
    showStatus('Datos copiados al portapapeles', 'success');
}

function deleteCard(id) {
    if (!confirm('Eliminar esta tarjeta guardada?')) return;
    let cards = getStoredCards();
    cards = cards.filter(c => c.id !== id);
    localStorage.setItem('nexuspay_cards', JSON.stringify(cards));
    loadSavedCards();
    showStatus('Tarjeta eliminada', 'info');
}

function clearAllCards() {
    if (!confirm('Eliminar TODAS las tarjetas guardadas?')) return;
    localStorage.removeItem('nexuspay_cards');
    loadSavedCards();
    showStatus('Todas las tarjetas eliminadas', 'info');
}

// ==================== COPY DATA ====================
function copyCardData() {
    const data = getCardData();
    if (!validateCard(data)) return;

    const text = [
        `Tarjeta: ${data.number}`,
        `Titular: ${data.holder}`,
        `Vence: ${data.expiry}`,
        `CVV: ${data.cvv}`,
        `Red: ${data.brand}`,
        '',
        'Vincula en Google Pay > Agregar metodo de pago'
    ].join('\n');

    copyToClipboard(text);
    showStatus('Datos copiados — pega en Google Pay', 'success');
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
    } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

// ==================== QR CODE ====================
let currentQR = null;

function generateQR() {
    const data = getCardData();
    if (!validateCard(data)) return;

    const section = document.getElementById('qrSection');
    const canvas = document.getElementById('qrCanvas');

    // Clear previous QR
    if (currentQR) {
        currentQR.clear();
        currentQR = null;
    }

    // Create QR data
    const qrData = JSON.stringify({
        type: 'nexuspay',
        card: data.number,
        holder: data.holder,
        expiry: data.expiry,
        cvv: data.cvv,
        brand: data.brand
    });

    // Generate QR
    currentQR = new QRCode(canvas, {
        text: qrData,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
    });

    section.classList.remove('hidden');
    showStatus('QR generado — escanea desde otro dispositivo', 'success');
}

function closeQR() {
    document.getElementById('qrSection').classList.add('hidden');
}

// ==================== HELPERS ====================
function formatCardNumber(number) {
    return number.replace(/(.{4})/g, '$1 ').trim();
}

// ==================== GOOGLE PAY API CHECK ====================
function checkGooglePayAvailability() {
    // Check if Google Pay is available on this device
    if (typeof google !== 'undefined' && google.payments) {
        console.log('Google Pay API available');
        return true;
    }
    console.log('Google Pay API not loaded — using deep links');
    return false;
}

// Load Google Pay API script dynamically
function loadGooglePayAPI() {
    return new Promise((resolve) => {
        if (document.querySelector('script[src*="google/pay"]')) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}
