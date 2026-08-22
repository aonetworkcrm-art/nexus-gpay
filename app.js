/* NexusPay v3.2 — Button ALWAYS works */
var paymentsClient = null;
var gpayReady = false;

function el(id) { return document.getElementById(id); }

function cp(t) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(t);
        } else {
            var a = document.createElement('textarea');
            a.value = t;
            a.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0';
            document.body.appendChild(a);
            a.focus();
            a.select();
            document.execCommand('copy');
            document.body.removeChild(a);
        }
    } catch(e) {}
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
document.addEventListener('DOMContentLoaded', function() {
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
    initForm();
});

// ==================== FORM AUTO FORMAT ====================
function initForm() {
    el('inum').addEventListener('input', function() {
        var raw = this.value.replace(/\s/g, '').replace(/\D/g, '').substring(0, 16);
        var f = '';
        for (var i = 0; i < raw.length; i++) {
            if (i > 0 && i % 4 === 0) f += ' ';
            f += raw[i];
        }
        this.value = f;
        updPrev(raw);
        detBrand(raw);
    });
    el('iexp').addEventListener('input', function() {
        var raw = this.value.replace(/\//g, '').replace(/\D/g, '').substring(0, 4);
        this.value = raw.length > 2 ? raw.substring(0, 2) + '/' + raw.substring(2) : raw;
        el('cexp').textContent = this.value || 'MM/AA';
    });
    el('inum').addEventListener('keypress', function(e) { if (!/[0-9]/.test(String.fromCharCode(e.which))) e.preventDefault(); });
    el('iexp').addEventListener('keypress', function(e) { if (!/[0-9]/.test(String.fromCharCode(e.which))) e.preventDefault(); });
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
}

function updPrev(raw) {
    var f = '';
    for (var i = 0; i < raw.length; i++) {
        if (i > 0 && i % 4 === 0) f += ' ';
        f += raw[i];
    }
    el('cnum').textContent = f || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
}

function getNum() { return el('inum').value.replace(/\s/g, ''); }
function getExp() { return el('iexp').value; }
function getBrand() { return el('cbrand').textContent; }

function ok() {
    if (!getNum() || getNum().length < 13) { msg('Numero invalido', 'err'); return false; }
    if (!getExp() || getExp().length < 5) { msg('Vencimiento requerido', 'err'); return false; }
    return true;
}

// ==================== MAIN BUTTON — ALWAYS WORKS ====================
function vincular() {
    if (!ok()) return;
    // If Google Pay API is ready, use it
    if (gpayReady && paymentsClient) {
        var req = {
            apiVersion: 2, apiVersionMinor: 0,
            allowedPaymentMethods: [{
                type: 'CARD',
                parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER', 'JCB'] },
                tokenizationSpecification: { type: 'TEST', parameters: { 'protocol': 'prototest' } }
            }],
            transactionInfo: { totalPriceStatus: 'NOT_CURRENTLY_KNOWN', currencyCode: 'USD' },
            merchantInfo: { merchantName: 'NexusPay' }
        };
        paymentsClient.loadPaymentData(req).then(function(d) {
            msg('✅ Tarjeta vinculada a Google Pay!', 'ok', 5000);
        }).catch(function(e) {
            if (e.statusCode === 'CANCELED') msg('Cancelado', 'inf');
            else msg('Error — intenta pay.google.com', 'err', 5000);
        });
    } else {
        // Fallback: open pay.google.com directly
        msg('Abriendo Google Pay...', 'inf');
        window.location.href = 'https://pay.google.com/gp/m/card/add';
    }
}

// ==================== GOOGLE PAY API (non-blocking) ====================
function onGooglePayLoad() {
    try {
        paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST' });
        paymentsClient.isReadyToPay({
            apiVersion: 2, apiVersionMinor: 0,
            allowedPaymentMethods: [{
                type: 'CARD',
                parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER'] },
                tokenizationSpecification: { type: 'TEST', parameters: { 'protocol': 'prototest' } }
            }]
        }).then(function(r) {
            if (r.result) {
                gpayReady = true;
                // Show native GPay button, hide fallback
                var btn = paymentsClient.createButton({ onClick: vincular, buttonType: 'pay', buttonSizeMode: 'fill' });
                el('gpayBtnContainer').appendChild(btn);
                el('btnVincular').style.display = 'none';
                el('gpayBadge').textContent = '✅ Google Pay';
                el('gpayBadge').style.cssText = 'color:#34d399;border-color:rgba(52,211,153,.3)';
            }
        });
    } catch(e) { /* keep fallback visible */ }
}

function onGooglePayError() { /* keep fallback visible */ }

// ==================== COPY ====================
function m2a() {
    if (!ok()) return;
    cp('TARJETA GOOGLE PAY\nNumero: ' + getNum() + '\nVence: ' + getExp() + '\nRed: ' + getBrand());
    msg('Datos copiados', 'ok');
}

function m2b() {
    if (!ok()) return;
    cp(getNum() + '\n' + getExp());
    msg('Copiado', 'ok');
}

// ==================== WEB URLs ====================
function m4a() { window.location.href = 'https://pay.google.com/gp/m/card/add'; }
function m4b() { window.location.href = 'https://wallet.google.com/manage/methods'; }

// ==================== ERROR SOLUTIONS ====================
var SOLS = {
    ca: { t: '❌ "No se puede agregar"', h: '<h4>Causas:</h4><ul><li>Banco no participa en Google Pay</li><li>Bloqueo antifraude temporal</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 24 horas</strong></li><li><strong>Llama al banco</strong> — pide habilitar "pagos digitales"</li><li><strong>Prueba Copiar</strong></li><li><strong>Cambia Google Account</strong></li></ol>' },
    sw: { t: '⚠️ "Algo salio mal"', h: '<ol><li><strong>Espera 5-15 minutos</strong></li><li><strong>Cambia WiFi a datos</strong></li><li><strong>Modo avion 10 seg</strong></li><li><strong>Reinicia telefono</strong></li></ol>' },
    aa: { t: '🔁 "Ya esta agregada"', h: '<ol><li><strong>Google Pay > Metodos de pago</strong></li><li><strong>Revisa otros Accounts</strong></li><li><strong>Elimina y re-agrega</strong></li></ol>' },
    ns: { t: '🏦 "Banco no compatible"', h: '<p>Chase, BofA, Wells, Citi, Capital One, Discover, US Bank, PNC, TD, Truist</p>' },
    vf: { t: '🔐 "Fallo verificacion"', h: '<ol><li><strong>Verifica datos EXACTOS</strong></li><li><strong>Prueba pay.google.com</strong></li><li><strong>Contacta banco</strong></li></ol>' },
    rg: { t: '🌍 "Region no soportada"', h: '<ol><li><strong>Cambia region Google</strong></li><li><strong>VPN a USA</strong></li><li><strong>pay.google.com</strong></li></ol>' }
};

function esol(k) {
    var s = SOLS[k];
    if (!s) return;
    el('solT').textContent = s.t;
    el('solC').innerHTML = s.h;
    el('solPan').classList.remove('hide');
    el('solPan').scrollIntoView({ behavior: 'smooth' });
}
