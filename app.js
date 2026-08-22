/* NexusPay v2 — Motor Anti-Errores Google Pay */
/* Zero external dependencies — pure vanilla JS */

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initForm();
    loadCards();
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
    var hasGPay = /Google|GPay|wallet/i.test(ua);

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

// ==================== FORM ====================
function initForm() {
    el('inum').addEventListener('input', function() {
        var v = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
        updPrev();
        detBrand(v);
    });
    el('iexp').addEventListener('input', function() {
        var v = this.value.replace(/\D/g, '');
        if (v.length >= 2) v = v.substring(0, 2) + '/' + v.substring(2, 4);
        this.value = v;
        updPrev();
    });
    el('ihold').addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        updPrev();
    });
    el('icvv').addEventListener('input', function() {
        this.value = this.value.replace(/\D/g, '').substring(0, 4);
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

function updPrev() {
    el('cnum').textContent = el('inum').value || '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022';
    el('cholder').textContent = el('ihold').value || 'TU NOMBRE';
    el('cexp').textContent = el('iexp').value || 'MM/AA';
}

function getData() {
    return {
        num: el('inum').value.replace(/\s/g, ''),
        hold: el('ihold').value,
        exp: el('iexp').value,
        cvv: el('icvv').value,
        brand: el('cbrand').textContent
    };
}

function ok(d) {
    if (!d.num || d.num.length < 13) { msg('Numero invalido', 'err'); return false; }
    if (!d.hold || d.hold.length < 2) { msg('Nombre requerido', 'err'); return false; }
    if (!d.exp || d.exp.length < 5) { msg('Vence requerido', 'err'); return false; }
    if (!d.cvv || d.cvv.length < 3) { msg('CVV requerido', 'err'); return false; }
    return true;
}

// ==================== METHOD 1: Deep Link ====================
function m1() {
    var d = getData();
    if (!ok(d)) return;
    msg('Abriendo Google Pay...', 'inf', 0);

    // Strategy 1: Try gpay:// scheme
    window.location.href = 'gpay://upi';

    // Strategy 2: After 2s, try intent://
    setTimeout(function() {
        window.location.href = 'intent://pay#Intent;scheme=gpay;package=com.google.android.apps.walletnfcrel;end';
    }, 1500);

    // Strategy 3: After 4s, try Play Store
    setTimeout(function() {
        window.location.href = 'market://details?id=com.google.android.apps.walletnfcrel';
    }, 3000);

    // Copy data as backup
    cp(d.num + '\n' + d.hold + '\n' + d.exp + '\n' + d.cvv);
    msg('Datos copiados — si Google Pay no abre, usa Metodo 2', 'ok', 5000);
}

// ==================== METHOD 2: Copy ====================
function m2a() {
    var d = getData();
    if (!ok(d)) return;
    var t = 'TARJETA GOOGLE PAY\n' +
        'Numero: ' + d.num + '\n' +
        'Titular: ' + d.hold + '\n' +
        'Vence: ' + d.exp + '\n' +
        'CVV: ' + d.cvv + '\n' +
        'Red: ' + d.brand + '\n\n' +
        'Pasos: Google Pay > + > Tarjeta > Pegar datos';
    cp(t);
    msg('Datos copiados — abre Google Pay y pega', 'ok');
}

function m2b() {
    var d = getData();
    if (!ok(d)) return;
    cp(d.num + '\n' + d.hold + '\n' + d.exp + '\n' + d.cvv);
    msg('Formato copiado — pega campo por campo', 'ok');
}

// ==================== METHOD 3: QR ====================
function m3() {
    var d = getData();
    if (!ok(d)) return;
    var c = el('qrC');
    c.innerHTML = '';

    var txt = JSON.stringify({ t: 'gp', c: d.num, h: d.hold, e: d.exp, v: d.cvv, b: d.brand });

    // Generate QR without external library — use simple canvas
    if (typeof QRCode !== 'undefined') {
        new QRCode(c, { text: txt, width: 200, height: 200, colorDark: '#000', colorLight: '#fff' });
    } else {
        // Fallback: show data as text
        c.innerHTML = '<div style="background:#fff;padding:20px;border-radius:8px;text-align:center;max-width:220px">' +
            '<p style="color:#000;font-size:12px;word-break:break-all">' + txt + '</p>' +
            '<p style="color:#666;font-size:10px;margin-top:8px">Copia estos datos y pegalos en Google Pay</p></div>';
    }
    el('qrBox').classList.remove('hide');
    msg('QR listo', 'ok');
}

// ==================== METHOD 4: Web URLs ====================
function m4a() {
    window.open('https://pay.google.com/gp/m/card/add', '_blank');
    msg('Abriendo Google Pay Web...', 'inf');
}
function m4b() {
    window.open('https://wallet.google.com/manage/methods', '_blank');
    msg('Abriendo Google Wallet...', 'inf');
}

// ==================== METHOD 5: Shareable Link ====================
function m5() {
    var d = getData();
    if (!ok(d)) return;
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tarjeta</title><style>body{font-family:sans-serif;background:#111;color:#fff;padding:20px;text-align:center}.c{background:linear-gradient(135deg,#1a2744,#1e1b4b);border-radius:16px;padding:20px;margin:16px 0;border:1px solid #4285f4}.f{margin:6px 0;text-align:left}.f label{font-size:10px;color:#888;display:block}.f span{font-size:15px;font-family:monospace}.b{display:inline-block;padding:12px 24px;background:#4285f4;color:#fff;border:none;border-radius:8px;font-size:15px;text-decoration:none;margin:8px}</style></head><body><h2>Datos Google Pay</h2><div class="c"><div class="f"><label>NUMERO</label><span>' + d.num + '</span></div><div class="f"><label>TITULAR</label><span>' + d.hold + '</span></div><div class="f"><label>VENCE</label><span>' + d.exp + '</span></div><div class="f"><label>CVV</label><span>' + d.cvv + '</span></div></div><a href="https://pay.google.com/gp/m/card/add" class="b">Abrir Google Pay</a><p style="color:#666;font-size:10px">NexusPay v2</p></body></html>';
    var url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    el('lnkTxt').textContent = url;
    el('lnkBox').classList.remove('hide');
    msg('Link generado — copia y comparte', 'ok');
}

// ==================== ERROR SOLUTIONS ====================
var SOLS = {
    ca: { t: '❌ "Esta tarjeta no se puede agregar"', h: '<h4>Causas:</h4><ul><li>Banco no participa en Google Pay</li><li>Tarjeta prepago sin tokenizacion</li><li>Bloqueo antifraude</li><li>Tarjeta en otro Google Account</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 24 horas</strong></li><li><strong>Llama a tu banco</strong> — pide habilitar "pagos digitales"</li><li><strong>Prueba otro metodo</strong> — Copia Manual siempre funciona</li><li><strong>Cambia Google Account</strong></li><li><strong>Contacta Google Pay</strong></li></ol>' },
    sw: { t: '⚠️ "Algo salio mal" (temporal)', h: '<h4>Causas:</h4><ul><li>Error temporal de Google (error 006)</li><li>Servidor sobrecargado</li><li>Conexion inestable</li></ul><h4>Soluciones:</h4><ol><li><strong>Espera 5-15 minutos</strong></li><li><strong>Cambia WiFi a datos</strong></li><li><strong>Modo avion 10 seg</strong></li><li><strong>Limpia cache Chrome</strong></li><li><strong>Reinicia telefono</strong> — soluciona 70%</li></ol><p><strong>NO intentes mas de 3 veces seguidas</strong> — Google puede bloquear 24-72h</p>' },
    aa: { t: '🔁 "Ya esta agregada"', h: '<h4>Soluciones:</h4><ol><li><strong>Ve a Google Pay > Metodos de pago</strong></li><li><strong>Busca en otros Google Accounts</strong></li><li><strong>Elimina y re-agrega</strong></li><li><strong>Verifica wallet.google.com</strong></li></ol>' },
    ns: { t: '🏦 "Banco no compatible"', h: '<h4>Soluciones:</h4><ol><li><strong>Verifica lista:</strong> Chase, BofA, Wells, Citi, Capital One, Discover, US Bank, PNC, TD Bank, Truist</li><li><strong>Llama al banco</strong> — pregunta soporte Google Pay</li><li><strong>Usa otra tarjeta</strong></li><li><strong>Prueba pay.google.com</strong></li></ol>' },
    vf: { t: '🔐 "Fallo verificacion"', h: '<h4>Soluciones:</h4><ol><li><strong>Verifica cada campo</strong> — datos EXACTOS</li><li><strong>Direccion de facturacion</strong> — misma que en el banco</li><li><strong>CVV correcto</strong> — reverso de la tarjeta</li><li><strong>Prueba desde web</strong> — pay.google.com</li><li><strong>Contacta banco</strong></li></ol>' },
    rg: { t: '🌍 "Region no soportada"', h: '<h4>Soluciones:</h4><ol><li><strong>Cambia region Google</strong> — Account > Country</li><li><strong>VPN a USA</strong></li><li><strong>pay.google.com</strong> — la web puede funcionar</li><li><strong>Cambia region telefono</strong></li><li><strong>Reinstala Google Pay</strong></li></ol>' },
    ct: { t: '💳 "Tipo no soportado"', h: '<h4>NO soportados:</h4><ul><li>❌ Gift cards</li><li>❌ Meal cards</li><li>❌ Prepago sin BIN</li></ul><h4>SI soportados:</h4><ul><li>✅ Visa, MC, Amex, Discover</li><li>✅ Debito/Credito bancario</li></ul>' },
    ou: { t: '📱 "Actualiza app"', h: '<h4>Soluciones:</h4><ol><li><strong>Play Store > Google Pay > Actualizar</strong></li><li><strong>Si no hay update</strong> — desinstala y reinstala</li><li><strong>Desde la web</strong> — pay.google.com siempre actualizado</li><li><strong>Necesitas Android 5.0+</strong></li></ol>' }
};

function esol(k) {
    var s = SOLS[k];
    if (!s) return;
    el('solT').textContent = s.t;
    el('solC').innerHTML = s.h;
    el('solPan').classList.remove('hide');
    el('solPan').scrollIntoView({ behavior: 'smooth' });
}

// ==================== CARDS ====================
function saveCard() {
    var d = getData();
    if (!ok(d)) return;
    var cards = getCards();
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].num === d.num) { msg('Ya guardada', 'inf'); return; }
    }
    cards.push({
        num: d.num, hold: d.hold, exp: d.exp, cvv: d.cvv, brand: d.brand,
        mask: '\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ' + d.num.slice(-4),
        id: Date.now().toString(36), ts: new Date().toISOString()
    });
    localStorage.setItem('nx_cards', JSON.stringify(cards));
    msg('Tarjeta guardada', 'ok');
    loadCards();
}

function getCards() {
    try { return JSON.parse(localStorage.getItem('nx_cards') || '[]'); } catch(e) { return []; }
}

function loadCards() {
    var cards = getCards();
    var l = el('cardsL');
    if (cards.length === 0) {
        l.innerHTML = '<div class="empty"><span>\ud83d\udcb3</span><p>No tienes tarjetas guardadas</p></div>';
        return;
    }
    var h = '';
    for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        h += '<div class="citem"><div><div class="citem-n">' + c.mask + '</div><div class="citem-m">' + c.brand + ' \u2014 ' + c.hold + ' \u2014 ' + c.exp + '</div></div><div class="citem-a">' +
            '<button class="citem-b" onclick="reuse(\'' + c.id + '\')">\ud83d\udd17</button>' +
            '<button class="citem-b" onclick="copyCard(\'' + c.id + '\')">\ud83d\udccb</button>' +
            '<button class="citem-b" onclick="delCard(\'' + c.id + '\')">\ud83d\uddd1\ufe0f</button></div></div>';
    }
    l.innerHTML = h;
}

function reuse(id) {
    var cards = getCards();
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].id === id) {
            var c = cards[i];
            el('inum').value = c.num.replace(/(.{4})/g, '$1 ').trim();
            el('ihold').value = c.hold;
            el('iexp').value = c.exp;
            el('icvv').value = '';
            detBrand(c.num);
            updPrev();
            document.querySelector('[data-t="add"]').click();
            msg('Cargada \u2014 ingresa CVV y vincula', 'inf', 4000);
            return;
        }
    }
}

function copyCard(id) {
    var cards = getCards();
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].id === id) {
            var c = cards[i];
            cp(c.num + '\n' + c.hold + '\n' + c.exp + '\n' + c.cvv);
            msg('Copiados', 'ok');
            return;
        }
    }
}

function delCard(id) {
    if (!confirm('Eliminar?')) return;
    var cards = getCards();
    var n = [];
    for (var i = 0; i < cards.length; i++) {
        if (cards[i].id !== id) n.push(cards[i]);
    }
    localStorage.setItem('nx_cards', JSON.stringify(n));
    loadCards();
    msg('Eliminada', 'inf');
}

function clearCards() {
    if (!confirm('Eliminar todas?')) return;
    localStorage.removeItem('nx_cards');
    loadCards();
    msg('Todas eliminadas', 'inf');
}
