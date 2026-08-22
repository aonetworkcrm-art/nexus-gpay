/* NexusPay v3.1 — Buttons that ACTUALLY work */
var paymentsClient = null;
var gpayReady = false;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initForm();
    console.log('[NexusPay] DOM ready, waiting for Google Pay script...');
});

// ==================== HELPERS ====================
function el(id) { return document.getElementById(id); }

function cp(t) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t).then(function() {
                console.log('[NexusPay] Copied via clipboard API');
            }).catch(function() {
                fallbackCopy(t);
            });
        } else {
            fallbackCopy(t);
        }
    } catch(e) {
        fallbackCopy(t);
    }
}

function fallbackCopy(t) {
    var a = document.createElement('textarea');
    a.value = t;
    a.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
    document.body.appendChild(a);
    a.focus();
    a.select();
    try {
        document.execCommand('copy');
        console.log('[NexusPay] Copied via execCommand');
    } catch(e) {
        console.error('[NexusPay] Copy failed:', e);
    }
    document.body.removeChild(a);
}

function msg(t, c, ms) {
    var b = el('sbar');
    b.className = 'sbar ' + c;
    el('sicon').textContent = c === 'ok' ? '✓' : c === 'err' ? '✕' : 'ℹ';
    el('stxt').textContent = t;
    b.classList.remove('hide');
    if (ms !== 0) setTimeout(function() { b.classList.add('hide'); }, ms || 3000);
}

// ==================== TABS ====================
function initTabs() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            var allTabs = document.querySelectorAll('.tab');
            var allPans = document.querySelectorAll('.pan');
            for (var j = 0; j < allTabs.length; j++) allTabs[j].classList.remove('on');
            for (var j = 0; j < allPans.length; j++) allPans[j].classList.remove('on');
            this.classList.add('on');
            el('t-' + this.getAttribute('data-t')).classList.add('on');
            el('solPan').classList.add('hide');
        });
    }
}

// ==================== FORM — AUTO FORMAT ====================
function initForm() {
    var numInput = el('inum');
    var expInput = el('iexp');

    numInput.addEventListener('input', function() {
        var raw = this.value.replace(/\s/g, '').replace(/\D/g, '').substring(0, 16);
        var formatted = '';
        for (var i = 0; i < raw.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += raw[i];
        }
        this.value = formatted;
        updPreview(raw);
        detBrand(raw);
    });

    expInput.addEventListener('input', function() {
        var raw = this.value.replace(/\//g, '').replace(/\D/g, '').substring(0, 4);
        if (raw.length > 2) {
            this.value = raw.substring(0, 2) + '/' + raw.substring(2);
        } else {
            this.value = raw;
        }
        updExp();
    });

    numInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(String.fromCharCode(e.which))) e.preventDefault();
    });
    expInput.addEventListener('keypress', function(e) {
        if (!/[0-9]/.test(String.fromCharCode(e.which))) e.preventDefault();
    });
}

function detBrand(n) {
    var b = 'VISA';
    if (/^4/.test(n)) b = 'VISA';
    else if (/^5[1-5]/.test(n)) b = 'MASTERCARD';
    else if (/^3[47]/.test(n)) b = 'AMEX';
    else if (/^6(?:011|5)/.test(n)) b = 'DISCOVER';
    else if (/^35/.test(n)) b = 'JCB';
    el('cbrand').textContent = b;
    el('cbrand').style.color = '#34d399';
    return b;
}

function updPreview(raw) {
    var f = '';
    for (var i = 0; i < raw.length; i++) {
        if (i > 0 && i % 4 === 0) f += ' ';
        f += raw[i];
    }
    el('cnum').textContent = f || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
}

function updExp() { el('cexp').textContent = el('iexp').value || 'MM/AA'; }
function getNum() { return el('inum').value.replace(/\s/g, ''); }
function getExp() { return el('iexp').value; }
function getBrand() { return el('cbrand').textContent; }

function ok() {
    var n = getNum(), e = getExp();
    if (!n || n.length < 13) { msg('Numero invalido (minimo 13 digitos)', 'err'); return false; }
    if (!e || e.length < 5) { msg('Vencimiento requerido (MM/AA)', 'err'); return false; }
    return true;
}

// ==================== GOOGLE PAY API ====================
var baseRequest = { apiVersion: 2, apiVersionMinor: 0 };
var allowedCardNetworks = ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER', 'JCB'];
var allowedAuthMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];

var cardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedAuthMethods,
        allowedCardNetworks: allowedCardNetworks
    },
    tokenizationSpecification: {
        type: 'TEST',
        parameters: { 'protocol': 'prototest' }
    }
};

function getPaymentDataRequest() {
    return Object.assign({}, baseRequest, {
        allowedPaymentMethods: [cardPaymentMethod],
        transactionInfo: { totalPriceStatus: 'NOT_CURRENTLY_KNOWN', currencyCode: 'USD' },
        merchantInfo: { merchantName: 'NexusPay' }
    });
}

// Called when Google Pay script loads
function onGooglePayLoad() {
    console.log('[NexusPay] Google Pay script loaded');
    try {
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'TEST'
        });

        paymentsClient.isReadyToPay(getPaymentDataRequest()).then(function(response) {
            console.log('[NexusPay] isReadyToPay:', response.result);
            if (response.result) {
                gpayReady = true;
                createGPayButton();
                el('gpayBadge').textContent = '✅ Google Pay Listo';
                el('gpayBadge').style.cssText = 'color:#34d399;border-color:rgba(52,211,153,.3)';
            } else {
                console.log('[NexusPay] Google Pay not ready, showing fallback');
                showManualButton();
            }
        }).catch(function(err) {
            console.error('[NexusPay] isReadyToPay error:', err);
            showManualButton();
        });
    } catch (e) {
        console.error('[NexusPay] Init error:', e);
        showManualButton();
    }
}

function onGooglePayError() {
    console.log('[NexusPay] Google Pay script FAILED to load');
    showManualButton();
}

function createGPayButton() {
    try {
        var btn = paymentsClient.createButton({
            onClick: onGPayClick,
            buttonType: 'pay',
            buttonSizeMode: 'fill'
        });
        el('gpayBtnContainer').innerHTML = '';
        el('gpayBtnContainer').appendChild(btn);
        el('gpayFallback').classList.add('hide');
        console.log('[NexusPay] Native GPay button rendered');
    } catch (e) {
        console.error('[NexusPay] Button error:', e);
        showManualButton();
    }
}

function showManualButton() {
    el('gpayBtnContainer').innerHTML = '';
    el('gpayFallback').classList.remove('hide');
    el('gpayNote').textContent = 'Google Pay API no disponible — usa el boton o Copiar Datos';
    el('gpayBadge').textContent = '⚠️ Modo Alternativo';
    el('gpayBadge').style.cssText = 'color:#fbbf24;border-color:rgba(251,191,36,.3)';
}

// GPay button click — opens native sheet
function onGPayClick() {
    if (!ok()) return;
    console.log('[NexusPay] Opening Google Pay sheet...');
    paymentsClient.loadPaymentData(getPaymentDataRequest()).then(function(paymentData) {
        console.log('[NexusPay] Success!', paymentData);
        msg('✅ Tarjeta vinculada a Google Pay!', 'ok', 5000);
    }).catch(function(err) {
        console.error('[NexusPay] Error:', err);
        if (err.statusCode === 'CANCELED') {
            msg('Cancelado', 'inf');
        } else {
            msg('Error: ' + (err.message || 'Intenta Copiar Datos'), 'err', 5000);
        }
    });
}

// Manual fallback — ALWAYS opens pay.google.com
function gpayManual() {
    if (!ok()) return;
    console.log('[NexusPay] Opening pay.google.com...');
    window.location.href = 'https://pay.google.com/gp/m/card/add';
}

// ==================== METHOD 2: Copy ====================
function m2a() {
    if (!ok()) return;
    var t = 'TARJETA GOOGLE PAY\nNumero: ' + getNum() + '\nVence: ' + getExp() + '\nRed: ' + getBrand() + '\n\nGoogle Pay > + > Tarjeta > Pegar datos';
    cp(t);
    msg('Datos copiados — abre Google Pay y pega', 'ok');
}

function m2b() {
    if (!ok()) return;
    cp(getNum() + '\n' + getExp());
    msg('Copiado', 'ok');
}

// ==================== METHOD 3 & 4: Web URLs ====================
function m4a() {
    console.log('[NexusPay] Opening pay.google.com');
    window.location.href = 'https://pay.google.com/gp/m/card/add';
    msg('Abriendo Google Pay Web...', 'inf');
}

function m4b() {
    console.log('[NexusPay] Opening wallet.google.com');
    window.location.href = 'https://wallet.google.com/manage/methods';
    msg('Abriendo Google Wallet...', 'inf');
}

// ==================== ERROR SOLUTIONS ====================
var SOLS = {
    ca: { t: '❌ "No se puede agregar"', h: '<h4>Causas:</h4><ul><li>Banco no participa en Google Pay</li><li>Tarjeta prepago sin tokenizacion</li><li>Bloqueo antifraude temporal</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 24 horas</strong></li><li><strong>Llama al banco</strong> — pide habilitar "pagos digitales"</li><li><strong>Prueba Copiar</strong> — siempre funciona</li><li><strong>Cambia Google Account</strong></li></ol>' },
    sw: { t: '⚠️ "Algo salio mal" (error 006)', h: '<h4>Soluciones:</h4><ol><li><strong>Espera 5-15 minutos</strong></li><li><strong>Cambia WiFi a datos</strong></li><li><strong>Modo avion 10 seg</strong></li><li><strong>Reinicia telefono</strong></li></ol><p><strong>NO intentes mas de 3 veces</strong></p>' },
    aa: { t: '🔁 "Ya esta agregada"', h: '<ol><li><strong>Ve a Google Pay > Metodos de pago</strong></li><li><strong>Revisa otros Accounts</strong></li><li><strong>Elimina y re-agrega</strong></li></ol>' },
    ns: { t: '🏦 "Banco no compatible"', h: '<h4>Bancos compatibles:</h4><p>Chase, BofA, Wells, Citi, Capital One, Discover, US Bank, PNC, TD, Truist</p>' },
    vf: { t: '🔐 "Fallo verificacion"', h: '<ol><li><strong>Verifica numero EXACTO</strong></li><li><strong>Prueba pay.google.com</strong></li><li><strong>Contacta banco</strong></li></ol>' },
    rg: { t: '🌍 "Region no soportada"', h: '<ol><li><strong>Cambia region Google</strong></li><li><strong>Usa VPN a USA</strong></li><li><strong>Prueba pay.google.com</strong></li></ol>' }
};

function esol(k) {
    var s = SOLS[k];
    if (!s) return;
    el('solT').textContent = s.t;
    el('solC').innerHTML = s.h;
    el('solPan').classList.remove('hide');
    el('solPan').scrollIntoView({ behavior: 'smooth' });
}

console.log('[NexusPay] app.js loaded successfully');
