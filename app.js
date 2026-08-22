/* NexusPay — Motor Anti-Errores Google Pay */
/* Sin dependencias externas */

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initForm();
    checkEnv();
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

// ==================== ENV CHECK ====================
function checkEnv() {
    var b = el('envBadge');
    var ua = navigator.userAgent;
    var isMob = /Android|iPhone|iPad/i.test(ua);
    var isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
    var isHTTPS = location.protocol === 'https:';

    if (isMob && isChrome && isHTTPS) {
        b.textContent = '✅ Optimo';
        b.style.cssText = 'color:#34d399;border-color:rgba(52,211,153,.3)';
    } else if (isMob && isHTTPS) {
        b.textContent = '⚠️ Usa Chrome';
        b.style.cssText = 'color:#fbbf24;border-color:rgba(251,191,36,.3)';
    } else if (!isMob) {
        b.textContent = '💻 Desktop';
        b.style.cssText = 'color:#fbbf24;border-color:rgba(251,191,36,.3)';
    } else {
        b.textContent = '⚠️ Revisar';
        b.style.cssText = 'color:#f87171;border-color:rgba(248,113,113,.3)';
    }
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

    // Card number: auto-add spaces every 4 digits
    numInput.addEventListener('input', function(e) {
        var raw = this.value.replace(/\s/g, '').replace(/\D/g, '');
        raw = raw.substring(0, 16);
        var formatted = '';
        for (var i = 0; i < raw.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += raw[i];
        }
        this.value = formatted;
        updPreview(raw);
        detBrand(raw);
    });

    // Expiry: auto-add / after 2 digits
    expInput.addEventListener('input', function(e) {
        var raw = this.value.replace(/\//g, '').replace(/\D/g, '');
        raw = raw.substring(0, 4);
        if (raw.length > 2) {
            this.value = raw.substring(0, 2) + '/' + raw.substring(2);
        } else {
            this.value = raw;
        }
        updExpPreview();
    });

    // Prevent non-numeric on both
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
    var formatted = '';
    for (var i = 0; i < raw.length; i++) {
        if (i > 0 && i % 4 === 0) formatted += ' ';
        formatted += raw[i];
    }
    el('cnum').textContent = formatted || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
}

function updExpPreview() {
    el('cexp').textContent = el('iexp').value || 'MM/AA';
}

function getNum() {
    return el('inum').value.replace(/\s/g, '');
}

function getExp() {
    return el('iexp').value;
}

function getBrand() {
    return el('cbrand').textContent;
}

function ok() {
    var n = getNum();
    var e = getExp();
    if (!n || n.length < 13) { msg('Numero invalido (minimo 13 digitos)', 'err'); return false; }
    if (!e || e.length < 5) { msg('Vencimiento requerido (MM/AA)', 'err'); return false; }
    return true;
}

// ==================== METHOD 1: Deep Link ====================
function m1() {
    if (!ok()) return;
    msg('Abriendo Google Pay...', 'inf', 0);

    // Chain of deep links — try each with delay
    window.location.href = 'gpay://upi';

    setTimeout(function() {
        window.location.href = 'intent://pay#Intent;scheme=gpay;package=com.google.android.apps.walletnfcrel;end';
    }, 1500);

    setTimeout(function() {
        window.location.href = 'market://details?id=com.google.android.apps.walletnfcrel';
    }, 3000);

    // Copy data as backup
    cp(getNum() + '\n' + getExp());
    msg('Datos copiados — si Google Pay no abre, usa Copiar', 'ok', 5000);
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
    ns: { t: '🏦 "Banco no compatible"', h: '<h4>Bancos que SI funcionan:</h4><p>Chase, Bank of America, Wells Fargo, Citi, Capital One, Discover, US Bank, PNC, TD Bank, Truist</p><h4>Soluciones:</h4><ol><li><strong>Llama a tu banco</strong> — pregunta Google Pay</li><li><strong>Usa otra tarjeta</strong></li><li><strong>Prueba pay.google.com</strong></li></ol>' },
    vf: { t: '🔐 "Fallo verificacion"', h: '<ol><li><strong>Verifica numero EXACTO</strong> como en la tarjeta</li><li><strong>Verifica vencimiento</strong></li><li><strong>Prueba desde pay.google.com</strong></li><li><strong>Contacta banco</strong> — puede haber bloqueo</li></ol>' },
    rg: { t: '🌍 "Region no soportada"', h: '<ol><li><strong>Cambia region Google Account</strong></li><li><strong>Usa VPN a USA</strong></li><li><strong>Prueba pay.google.com</strong></li><li><strong>Cambia region del telefono</strong></li><li><strong>Reinstala Google Pay</strong></li></ol>' }
};

function esol(k) {
    var s = SOLS[k];
    if (!s) return;
    el('solT').textContent = s.t;
    el('solC').innerHTML = s.h;
    el('solPan').classList.remove('hide');
    el('solPan').scrollIntoView({ behavior: 'smooth' });
}
