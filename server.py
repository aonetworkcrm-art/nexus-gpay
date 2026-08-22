"""
NexusPay Server — Panel web que controla el agente automatico
Ejecuta: python server.py
Abre: http://localhost:5050
"""

import os
import sys
import json
import threading
import time
from pathlib import Path

try:
    from flask import Flask, render_template_string, request, jsonify
except ImportError:
    print("Instala flask: pip install flask")
    sys.exit(1)

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Instala playwright: pip install playwright && playwright install chromium")
    sys.exit(1)

app = Flask(__name__)

# Global state
state = {
    'status': 'idle',  # idle, running, waiting_login, waiting_verify, done, error
    'message': '',
    'result': None,
    'screenshot': None,
}

HTML_PAGE = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NexusPay Agent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:16px}
.box{max-width:480px;width:100%}
.hd{background:#111827;border-radius:12px;padding:20px;margin-bottom:16px;text-align:center}
.hd h1{font-size:22px;color:#4285f4;margin-bottom:4px}
.hd p{font-size:13px;color:#94a3b8}
.fg{margin-bottom:12px}
.fg label{display:block;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:5px}
.fg input{width:100%;background:#1a2035;border:1px solid #1e293b;border-radius:8px;padding:14px;font-size:18px;color:#e2e8f0;outline:none;font-family:monospace}
.fg input:focus{border-color:#4285f4}
.btn{display:block;width:100%;padding:16px;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;color:#fff}
.bp{background:linear-gradient(135deg,#4285f4,#6366f1);margin-top:8px}
.bp:active{transform:scale(.98)}
.bp:disabled{opacity:.5;cursor:not-allowed}
.status{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-top:16px;display:none}
.status.show{display:block}
.status h3{font-size:14px;margin-bottom:8px}
.status p{font-size:12px;color:#94a3b8;line-height:1.6}
.slog{background:#0a0e1a;border-radius:8px;padding:12px;margin-top:12px;max-height:300px;overflow-y:auto;font-family:monospace;font-size:11px;line-height:1.8;color:#94a3b8}
.slog .ok{color:#34d399}
.slog .err{color:#f87171}
.slog .inf{color:#4285f4}
.slog .warn{color:#fbbf24}
.note{background:rgba(66,133,244,.1);border:1px solid rgba(66,133,244,.2);border-radius:8px;padding:12px;margin-top:12px;font-size:12px;color:#94a3b8;line-height:1.6}
</style>
</head>
<body>
<div class="box">
  <div class="hd">
    <h1>⚡ NexusPay Agent</h1>
    <p>Automatiza el proceso de agregar tarjetas a Google Pay</p>
  </div>

  <div class="fg">
    <label>Numero de Tarjeta</label>
    <input type="tel" id="num" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric">
  </div>
  <div class="fg">
    <label>Vencimiento</label>
    <input type="tel" id="exp" placeholder="MM/AA" maxlength="5" inputmode="numeric">
  </div>

  <button class="btn bp" id="btnGo" onclick="startAgent()">⚡ Vincular Automaticamente</button>

  <div class="note">
    <strong>Como funciona:</strong><br>
    1. Ingresa numero y vencimiento<br>
    2. Presiona "Vincular"<br>
    3. Se abre Chrome automaticamente<br>
    4. El agente navega a Google Pay<br>
    5. Llena todos los campos solo<br>
    6. Confirma y verifica<br>
    7. ¡Listo! Tu tarjeta queda vinculada
  </div>

  <div class="status" id="status">
    <h3 id="statusTitle">Estado</h3>
    <p id="statusMsg"></p>
    <div class="slog" id="log"></div>
  </div>
</div>

<script>
var logs = [];
function addLog(msg, cls) {
    logs.push('<div class="'+(cls||'')+'">'+msg+'</div>');
    document.getElementById('log').innerHTML = logs.join('');
    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;
}
function showStatus(title, msg) {
    document.getElementById('status').classList.add('show');
    document.getElementById('statusTitle').textContent = title;
    document.getElementById('statusMsg').textContent = msg;
}
function startAgent() {
    var num = document.getElementById('num').value.replace(/\\s/g,'');
    var exp = document.getElementById('exp').value;
    if (!num || num.length < 13) { alert('Numero invalido'); return; }
    if (!exp || exp.length < 5) { alert('Vencimiento requerido'); return; }
    document.getElementById('btnGo').disabled = true;
    document.getElementById('btnGo').textContent = '🔄 Ejecutando...';
    logs = [];
    showStatus('Ejecutando agente...', 'El navegador se abrira en unos segundos');
    addLog('Iniciando agente...', 'inf');
    fetch('/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({num: num, exp: exp})
    }).then(function(r){return r.json()}).then(function(d){
        addLog(d.message, d.ok ? 'ok' : 'err');
        document.getElementById('btnGo').disabled = false;
        document.getElementById('btnGo').textContent = '⚡ Vincular Automaticamente';
        showStatus(d.ok ? '✅ Completado' : '⚠️ Error', d.message);
    }).catch(function(e){
        addLog('Error: '+e, 'err');
        document.getElementById('btnGo').disabled = false;
        document.getElementById('btnGo').textContent = '⚡ Vincular Automaticamente';
    });
}
// Auto-refresh status
setInterval(function(){
    fetch('/status').then(function(r){return r.json()}).then(function(d){
        if (d.status !== 'idle' && d.message) {
            addLog(d.message, d.status === 'done' ? 'ok' : d.status === 'error' ? 'err' : 'inf');
        }
    });
}, 2000);
</script>
</body>
</html>'''


@app.route('/')
def index():
    return render_template_string(HTML_PAGE)


@app.route('/status')
def status():
    return jsonify(state)


@app.route('/start', methods=['POST'])
def start():
    data = request.json
    num = data.get('num', '').replace(' ', '')
    exp = data.get('exp', '')

    if len(num) < 13 or len(exp) < 5:
        return jsonify({'ok': False, 'message': 'Datos invalidos'})

    # Run agent in background thread
    state['status'] = 'running'
    state['message'] = 'Iniciando agente...'

    t = threading.Thread(target=run_agent, args=(num, exp), daemon=True)
    t.start()

    return jsonify({'ok': True, 'message': 'Agente iniciado — revisa el navegador'})


def run_agent(num, exp):
    """Run the Playwright agent in a background thread"""
    global state

    parts = exp.replace('/', '').strip()
    month = parts[:2]
    year = parts[2:]

    try:
        state['message'] = 'Abriendo Chrome...'
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=False,
                args=['--disable-blink-features=AutomationControlled']
            )

            context = browser.new_context(
                viewport={'width': 412, 'height': 915},
                user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
                locale='en-US',
            )

            page = context.new_page()

            # Step 1: Go to Google Pay
            state['message'] = 'Navegando a Google Pay...'
            page.goto('https://pay.google.com', wait_until='networkidle', timeout=30000)
            time.sleep(3)

            # Check if login needed
            if 'signin' in page.url or 'accounts.google.com' in page.url:
                state['status'] = 'waiting_login'
                state['message'] = 'Esperando que inicies sesion en Google...'
                for i in range(180):
                    time.sleep(1)
                    if 'wallet' in page.url or 'pay.google' in page.url:
                        state['message'] = 'Sesion iniciada!'
                        break
                time.sleep(3)

            # Step 2: Go to payment methods
            state['message'] = 'Abriendo metodos de pago...'
            page.goto('https://wallet.google.com/manage/methods', wait_until='networkidle', timeout=30000)
            time.sleep(3)

            # Re-check login
            if 'signin' in page.url:
                state['message'] = 'Esperando sesion...'
                for i in range(120):
                    time.sleep(1)
                    if 'wallet' in page.url:
                        break
                time.sleep(3)

            # Step 3: Find and click "Add payment method"
            state['message'] = 'Buscando boton de agregar...'
            selectors = [
                'text="Add a payment method"',
                'text="Agregar metodo de pago"',
                'text="Add payment method"',
                'text="Add card"',
                'text="Agregar tarjeta"',
                'button:has-text("Add")',
                'button:has-text("Agregar")',
                '[aria-label="Add payment method"]',
            ]

            clicked = False
            for sel in selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        clicked = True
                        state['message'] = 'Formulario de tarjeta abierto'
                        time.sleep(3)
                        break
                except:
                    continue

            if not clicked:
                state['message'] = 'No se encontro boton — busca manualmente'
                page.screenshot(path='C:/nexus-gpay/debug.png')
                time.sleep(10)
                state['status'] = 'error'
                state['message'] = 'No se pudo encontrar el boton de agregar'
                browser.close()
                return

            # Step 4: Fill card number
            state['message'] = 'Escribiendo numero de tarjeta...'
            num_sels = [
                'input[name="cardNumber"]',
                'input[aria-label*="card"]',
                'input[aria-label*="Card"]',
                'input[placeholder*="1234"]',
                'input[placeholder*="card"]',
                'input[type="tel"]',
            ]
            for sel in num_sels:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        elem.fill(num)
                        state['message'] = 'Numero ingreado'
                        break
                except:
                    continue

            time.sleep(1)

            # Step 5: Fill expiry
            state['message'] = 'Escribiendo vencimiento...'
            exp_sels = [
                'input[name="expiryDate"]',
                'input[aria-label*="expir"]',
                'input[aria-label*="Expir"]',
                'input[placeholder*="MM"]',
                'input[placeholder*="expir"]',
            ]
            for sel in exp_sels:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        elem.fill(f"{month}/{year}")
                        state['message'] = 'Vencimiento ingreado'
                        break
                except:
                    continue

            time.sleep(2)

            # Step 6: Submit
            state['message'] = 'Enviando...'
            submit_sels = [
                'text="Save"',
                'text="Guardar"',
                'text="Add"',
                'text="Agregar"',
                'text="Confirm"',
                'button[type="submit"]',
            ]
            for sel in submit_sels:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        state['message'] = 'Formulario enviado'
                        time.sleep(5)
                        break
                except:
                    continue

            # Step 7: Check for verification
            verify_sels = [
                'text="Verify"',
                'text="Verificar"',
                'text="Enter code"',
                'input[name="verificationCode"]',
            ]
            for sel in verify_sels:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        state['status'] = 'waiting_verify'
                        state['message'] = 'Necesita codigo — ingresa en el navegador'
                        input("Esperando verificacion...")
                        break
                except:
                    continue

            # Done
            page.screenshot(path='C:/nexus-gpay/result.png')
            state['status'] = 'done'
            state['message'] = '✅ Proceso completado — verifica en Google Pay'
            time.sleep(3)
            browser.close()

    except Exception as e:
        state['status'] = 'error'
        state['message'] = f'Error: {str(e)}'


if __name__ == '__main__':
    print("")
    print("⚡ NexusPay Agent — http://localhost:5050")
    print("Abre en tu navegador y usa el agente automatico")
    print("")
    app.run(host='127.0.0.1', port=5050, debug=False)
