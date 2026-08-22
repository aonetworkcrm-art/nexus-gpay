/* NexusPay v3 — Google Pay API Integration */
/* Opens native Google Pay sheet to add cards */

var paymentsClient = null;
var gpayReady = false;

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initForm();
});

// ==================== HELPERS ====================
function el(id) { return document.getElementById(id); }

function cp(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t);
    } else {
        var a = document.createElement('textarea');
        a.value = t;
        a.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(a);
        a.select();
        document.execCommand('copy');
        document.body.removeChild(a);
    }
}

function msg(t, c, ms) {
    var b = el('sbar');
    b.className = 'sbar ' + c;
    el('sicon').textContent = c === 'ok' ? '✓' : c === 'err' ? '✕' : 'ℹ';
    el('stxt').textContent = t;
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
// This is the REAL way to add cards to Google Pay from a web page
// It opens the native Google Pay sheet where user can add/confirm cards

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
        transactionInfo: {
            totalPriceStatus: 'NOT_CURRENTLY_KNOWN',
            currencyCode: 'USD'
        },
        merchantInfo: {
            merchantName: 'NexusPay'
        }
    });
}

// Called when Google Pay script loads
function onGooglePayLoad() {
    console.log('[NexusPay] Google Pay API script loaded');
    try {
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: 'TEST'  // Use 'PRODUCTION' when you have a merchant ID
        });

        var paymentDataRequest = getPaymentDataRequest();

        paymentsClient.isReadyToPay(paymentDataRequest).then(function(response) {
            console.log('[NexusPay] isReadyToPay:', response.result);
            if (response.result) {
                gpayReady = true;
                createGPayButton();
                updateBadge('ok');
            } else {
                showFallback('Google Pay no disponible en este dispositivo');
                updateBadge('no');
            }
        }).catch(function(err) {
            console.error('[NexusPay] isReadyToPay error:', err);
            showFallback('Error verificando Google Pay');
            updateBadge('no');
        });
    } catch (e) {
        console.error('[NexusPay] Init error:', e);
        showFallback('Error inicializando Google Pay');
        updateBadge('no');
    }
}

function onGooglePayError() {
    console.log('[NexusPay] Google Pay script failed to load');
    showFallback('No se pudo cargar Google Pay API');
    updateBadge('no');
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
        console.log('[NexusPay] Google Pay button created');
    } catch (e) {
        console.error('[NexusPay] Button creation error:', e);
        showFallback('Error creando boton');
    }
}

function showFallback(reason) {
    el('gpayBtnContainer').innerHTML = '';
    el('gpayFallback').classList.remove('hide');
    el('gpayNote').textContent = reason + ' — usa el boton o Copiar Datos';
}

function updateBadge(status) {
    var b = el('gpayBadge');
    if (status === 'ok') {
        b.textContent = '✅ Google Pay Listo';
        b.style.cssText = 'color:#34d399;border-color:rgba(52,211,153,.3)';
    } else {
        b.textContent = '❌ Google Pay No Disponible';
        b.style.cssText = 'color:#f87171;border-color:rgba(248,113,113,.3)';
    }
}

// ==================== GPay Click — Opens Native Sheet ====================
function onGPayClick() {
    if (!ok()) return;

    var paymentDataRequest = getPaymentDataRequest();

    paymentsClient.loadPaymentData(paymentDataRequest).then(function(paymentData) {
        console.log('[NexusPay] Payment data received:', paymentData);
        msg('✅ Tarjeta vinculada con exito a Google Pay!', 'ok', 5000);
    }).catch(function(err) {
        console.error('[NexusPay] loadPaymentData error:', err);
        if (err.statusCode === 'CANCELED') {
            msg('Cancelado por el usuario', 'inf');
        } else {
            msg('Error: ' + (err.message || 'Intenta otro metodo'), 'err', 5000);
        }
    });
}

// Manual fallback — same as clicking the GPay button
function gpayManual() {
    if (!gpayReady || !paymentsClient) {
        msg('Google Pay no esta disponible — usa Copiar Datos', 'err', 5000);
        return;
    }
    onGPayClick();
}

// ==================== METHOD 2: Copy ====================
function m2a() {
    if (!ok()) return;
    var t = 'TARJETA GOOGLE PAY\n' +
        'Numero: ' + getNum() + '\n' +
        'Vence: ' + getExp() + '\n' +
        'Red: ' + getBrand() + '\n\n' +
        'Google Pay > + > Tarjeta > Pegar datos';
    cp(t);
    msg('Datos copiados — abre Google Pay y pega', 'ok');
}

function m2b() {
    if (!ok()) return;
    cp(getNum() + '\n' + getExp());
    msg('Copiado — pega en Google Pay', 'ok');
}

// ==================== METHOD 3 & 4: Web URLs ====================
function m4a() {
    window.open('https://pay.google.com/gp/m/card/add', '_blank');
    msg('Abriendo Google Pay Web...', 'inf');
}

function m4b() {
    window.open('https://wallet.google.com/manage/methods', '_blank');
    msg('Abriendo Google Wallet...', 'inf');
}

// ==================== ERROR SOLUTIONS ====================
var SOLS = {
    ca: { t: '❌ "No se puede agregar"', h: '<h4>Causas:</h4><ul><li>Banco no participa en Google Pay</li><li>Tarjeta prepago sin tokenizacion</li><li>Bloqueo antifraude temporal</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 24 horas</strong> — bloqueo temporal</li><li><strong>Llama al banco</strong> — pide habilitar "pagos digitales"</li><li><strong>Prueba Copiar</strong> — Metodo 2 siempre funciona</li><li><strong>Cambia Google Account</strong></li></ol>' },
    sw: { t: '⚠️ "Algo salio mal" (error 006)', h: '<h4>Causas:</h4><ul><li>Error temporal de Google</li><li>Servidor sobrecargado</li><li>Conexion inestable</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 5-15 minutos</strong></li><li><strong>Cambia WiFi a datos moviles</strong></li><li><strong>Modo avion 10 segundos</strong></li><li><strong>Limpia cache Chrome</strong></li><li><strong>Reinicia el telefono</strong></li></ol><p><strong>NO intentes mas de 3 veces</strong> — Google bloquea 24-72h</p>' },
    aa: { t: '🔁 "Ya esta agregada"', h: '<ol><li><strong>Ve a Google Pay > Metodos de pago</strong></li><li><strong>Revisa otros Google Accounts</strong></li><li><strong>Elimina y vuelve a agregar</strong></li><li><strong>Verifica wallet.google.com</strong></li></ol>' },
    ns: { t: '🏦 "Banco no compatible"', h: '<h4>Bancos que SI funcionan:</h4><p>Chase, Bank of America, Wells Fargo, Citi, Capital One, Discover, US Bank, PNC, TD Bank, Truist</p><h4>Soluciones:</h4><ol><li><strong>Llama a tu banco</strong></li><li><strong>Usa otra tarjeta</strong></li><li><strong>Prueba pay.google.com</strong></li></ol>' },
    vf: { t: '🔐 "Fallo verificacion"', h: '<ol><li><strong>Verifica numero EXACTO</strong></li><li><strong>Verifica vencimiento</strong></li><li><strong>Prueba desde pay.google.com</strong></li><li><strong>Contacta banco</strong></li></ol>' },
    rg: { t: '🌍 "Region no soportada"', h: '<ol><li><strong>Cambia region Google Account</strong></li><li><strong>Usa VPN a USA</strong></li><li><strong>Prueba pay.google.com</strong></li><li><strong>Cambia region del telefono</strong></li></ol>' }
};

function esol(k) {
    var s = SOLS[k];
    if (!s) return;
    el('solT').textContent = s.t;
    el('solC').innerHTML = s.h;
    el('solPan').classList.remove('hide');
    el('solPan').scrollIntoView({ behavior: 'smooth' });
}
