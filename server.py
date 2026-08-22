"""
NexusPay Server — Funciona desde PC y Android
Ejecuta: python server.py
PC: http://localhost:5050
Celular: http://TU_IP:5050
"""

import os
import sys
import json
import threading
import time
import socket
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

# ==================== STATE ====================
state = {'status': 'idle', 'message': '', 'step': 0, 'total': 7}

# ==================== GET LOCAL IP ====================
def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

# ==================== HTML ====================
HTML = '''<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>NexusPay Agent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh;display:flex;justify-content:center;padding:16px}
.box{max-width:480px;width:100%}
.hd{background:linear-gradient(135deg,#111827,#1a1a2e);border-radius:16px;padding:24px;margin-bottom:16px;text-align:center;border:1px solid #1e293b}
.hd h1{font-size:24px;color:#4285f4;margin-bottom:4px}
.hd p{font-size:13px;color:#94a3b8}
.card{background:linear-gradient(135deg,#1a2744,#1e1b4b);border-radius:16px;padding:24px;margin-bottom:16px;border:1px solid rgba(66,133,244,.2)}
.chip{width:40px;height:28px;background:linear-gradient(135deg,#d4af37,#f0d060);border-radius:6px;margin-bottom:16px}
.brand{font-size:16px;font-weight:700;letter-spacing:2px;color:#4285f4;margin-bottom:16px}
.cnum{font-size:20px;font-weight:600;letter-spacing:3px;font-family:monospace;margin-bottom:16px}
.cexp{text-align:right;font-size:14px;color:#94a3b8}
.fg{margin-bottom:12px}
.fg label{display:block;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;margin-bottom:5px}
.fg input{width:100%;background:#1a2035;border:1px solid #1e293b;border-radius:8px;padding:14px;font-size:18px;color:#e2e8f0;outline:none;font-family:monospace;letter-spacing:1px}
.fg input:focus{border-color:#4285f4;box-shadow:0 0 0 3px rgba(66,133,244,.2)}
.btn{display:block;width:100%;padding:16px;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;color:#fff;margin-top:8px}
.bp{background:linear-gradient(135deg,#4285f4,#6366f1);box-shadow:0 4px 15px rgba(66,133,244,.3)}
.bp:active{transform:scale(.98)}
.bp:disabled{opacity:.5;cursor:not-allowed}
.bs{background:rgba(52,211,153,.15);color:#34d399;border:1px solid rgba(52,211,153,.3)}
.bo{background:transparent;color:#94a3b8;border:1px solid #1e293b}
.mrow{display:flex;gap:8px;margin-top:8px}
.mrow .btn{flex:1}
.progress{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-top:16px;display:none}
.progress.show{display:block}
.pbar{height:4px;background:#1e293b;border-radius:2px;margin:12px 0;overflow:hidden}
.pfill{height:100%;background:linear-gradient(90deg,#4285f4,#34d399);border-radius:2px;transition:width .5s}
.steps{list-style:none;padding:0}
.steps li{padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:8px}
.steps li:last-child{border:none}
.steps li.active{color:#4285f4}
.steps li.done{color:#34d399}
.steps li .ico{width:20px;text-align:center}
.note{background:rgba(66,133,244,.1);border:1px solid rgba(66,133,244,.2);border-radius:8px;padding:12px;margin-top:12px;font-size:11px;color:#94a3b8;line-height:1.6}
.logbox{background:#0a0e1a;border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:11px;line-height:1.8;color:#94a3b8;display:none}
.logbox.show{display:block}
.ok{color:#34d399}.err{color:#f87171}.inf{color:#4285f4}
.ft{text-align:center;padding:16px;font-size:10px;color:#64748b}
</style>
</head>
<body>
<div class="box">
  <div class="hd">
    <h1>⚡ NexusPay Agent</h1>
    <p>Automatiza agregar tarjetas a Google Pay</p>
  </div>

  <div class="card">
    <div class="chip"></div>
    <div class="brand" id="brand">VISA</div>
    <div class="cnum" id="cnum">•••• •••• •••• ••••</div>
    <div class="cexp" id="cexp">MM/AA</div>
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

  <div class="mrow">
    <button class="btn bo" onclick="goToGPay()">🌐 Google Pay Web</button>
    <button class="btn bo" onclick="goToWallet()">📱 Google Wallet</button>
  </div>

  <div class="progress" id="prog">
    <div class="pbar"><div class="pfill" id="pfill" style="width:0%"></div></div>
    <ul class="steps">
      <li id="s1"><span class="ico">1</span> Abriendo Chrome...</li>
      <li id="s2"><span class="ico">2</span> Navegando a Google Pay...</li>
      <li id="s3"><span class="ico">3</span> Iniciando sesion...</li>
      <li id="s4"><span class="ico">4</span> Agregando tarjeta...</li>
      <li id="s5"><span class="ico">5</span> Llenando datos...</li>
      <li id="s6"><span class="ico">6</span> Confirmando...</li>
      <li id="s7"><span class="ico">7</span> Verificando...</li>
    </ul>
  </div>

  <div class="logbox" id="logbox"></div>

  <div class="note">
    <strong>⚡ Como funciona:</strong><br>
    1. Ingresa tu tarjeta<br>
    2. Presiona "Vincular"<br>
    3. Se abre Chrome en la PC<br>
    4. El agente hace TODO solo<br>
    5. Solo necesitas confirmar si te pide SMS<br>
    6. ¡Listo!
  </div>
</div>

<script>
// Auto format
document.getElementById('num').addEventListener('input',function(){
  var r=this.value.replace(/\\s/g,'').replace(/\\D/g,'').substring(0,16);
  var f='';for(var i=0;i<r.length;i++){if(i>0&&i%4==0)f+=' ';f+=r[i];}
  this.value=f;
  document.getElementById('cnum').textContent=f||'\\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022';
  var b='VISA';if(/^4/.test(r))b='VISA';else if(/^5[1-5]/.test(r))b='MASTERCARD';else if(/^3[47]/.test(r))b='AMEX';else if(/^6(?:011|5)/.test(r))b='DISCOVER';
  document.getElementById('brand').textContent=b;
});
document.getElementById('exp').addEventListener('input',function(){
  var r=this.value.replace(/\\//g,'').replace(/\\D/g,'').substring(0,4);
  this.value=r.length>2?r.substring(0,2)+'/'+r.substring(2):r;
  document.getElementById('cexp').textContent=this.value||'MM/AA';
});

function log(msg,cls){
  var lb=document.getElementById('logbox');
  lb.classList.add('show');
  lb.innerHTML+='<div class="'+(cls||'')+'">'+msg+'</div>';
  lb.scrollTop=lb.scrollHeight;
}

function setStep(n,msg){
  for(var i=1;i<=7;i++){
    var li=document.getElementById('s'+i);
    li.className=i<n?'done':i==n?'active':'';
    if(i==n&&msg)li.innerHTML='<span class="ico">'+(i<n?'✓':i==n?'🔄':'')+'</span> '+msg;
  }
  document.getElementById('pfill').style.width=Math.round(n/7*100)+'%';
}

function startAgent(){
  var num=document.getElementById('num').value.replace(/\\s/g,'');
  var exp=document.getElementById('exp').value;
  if(!num||num.length<13){alert('Numero invalido');return;}
  if(!exp||exp.length<5){alert('Vencimiento requerido');return;}
  document.getElementById('btnGo').disabled=true;
  document.getElementById('btnGo').textContent='🔄 Ejecutando agente...';
  document.getElementById('prog').classList.add('show');
  log('Iniciando agente...','inf');
  setStep(1,'Abriendo Chrome...');
  fetch('/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num:num,exp:exp})})
  .then(function(r){return r.json()}).then(function(d){
    log(d.message,d.ok?'ok':'err');
    document.getElementById('btnGo').disabled=false;
    document.getElementById('btnGo').textContent='⚡ Vincular Automaticamente';
  }).catch(function(e){log('Error: '+e,'err');document.getElementById('btnGo').disabled=false;document.getElementById('btnGo').textContent='⚡ Vincular Automaticamente';});
}

// Poll status
setInterval(function(){
  fetch('/status').then(function(r){return r.json()}).then(function(d){
    if(d.step>0)setStep(d.step,d.message);
    if(d.status=='done'){log('✅ '+d.message,'ok');document.getElementById('btnGo').disabled=false;document.getElementById('btnGo').textContent='⚡ Vincular Automaticamente';}
    if(d.status=='error'){log('❌ '+d.message,'err');document.getElementById('btnGo').disabled=false;document.getElementById('btnGo').textContent='⚡ Vincular Automaticamente';}
  });
},1500);

function goToGPay(){window.open('https://pay.google.com','_blank');}
function goToWallet(){window.open('https://wallet.google.com','_blank');}
</script>
</body>
</html>'''


@app.route('/')
def index():
    return render_template_string(HTML)


@app.route('/status')
def status():
    return jsonify(state)


@app.route('/start', methods=['POST'])
def start():
    data = request.json
    num = data.get('num', '').replace(' ', '').replace('-', '')
    exp = data.get('exp', '')

    if len(num) < 13 or len(exp) < 5:
        return jsonify({'ok': False, 'message': 'Datos invalidos'})

    state['status'] = 'running'
    state['message'] = 'Iniciando...'
    state['step'] = 1

    t = threading.Thread(target=run_agent, args=(num, exp), daemon=True)
    t.start()

    return jsonify({'ok': True, 'message': 'Agente iniciado — Chrome se abrira'})


def run_agent(num, exp):
    global state
    parts = exp.replace('/', '').strip()
    month, year = parts[:2], parts[2:]

    try:
        state['message'] = 'Abriendo Chrome...'
        state['step'] = 1

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=False,
                args=['--disable-blink-features=AutomationControlled', '--no-first-run']
            )
            context = browser.new_context(
                viewport={'width': 412, 'height': 915},
                user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
                locale='en-US',
            )
            page = context.new_page()

            # Step 1: Go to Google Pay
            state['message'] = 'Navegando a Google Pay...'
            state['step'] = 2
            page.goto('https://pay.google.com', wait_until='networkidle', timeout=30000)
            time.sleep(3)

            # Step 2: Check login
            if 'signin' in page.url or 'accounts.google.com' in page.url:
                state['message'] = 'Inicia sesion en Google...'
                state['step'] = 3
                for i in range(180):
                    time.sleep(1)
                    if 'wallet' in page.url or 'pay.google' in page.url:
                        state['message'] = 'Sesion OK'
                        break
                    if i % 15 == 0 and i > 0:
                        state['message'] = f'Esperando sesion ({i}s)...'
                time.sleep(3)

            # Step 3: Go to wallet
            state['message'] = 'Abriendo metodos de pago...'
            state['step'] = 4
            page.goto('https://wallet.google.com/manage/methods', wait_until='networkidle', timeout=30000)
            time.sleep(3)

            if 'signin' in page.url:
                state['message'] = 'Esperando sesion...'
                for i in range(120):
                    time.sleep(1)
                    if 'wallet' in page.url:
                        break
                time.sleep(3)

            # Step 4: Find add button
            state['message'] = 'Buscando agregar tarjeta...'
            state['step'] = 4

            found = False
            for sel in ['text="Add a payment method"', 'text="Agregar metodo de pago"',
                        'text="Add payment method"', 'text="Add card"', 'text="Agregar tarjeta"',
                        'button:has-text("Add")', 'button:has-text("Agregar")',
                        '[aria-label="Add payment method"]']:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=2000):
                        el.click()
                        found = True
                        time.sleep(3)
                        break
                except:
                    continue

            if not found:
                page.screenshot(path='C:/nexus-gpay/debug.png')
                state['status'] = 'error'
                state['message'] = 'No encontre boton de agregar. Screenshot guardado.'
                browser.close()
                return

            # Step 5: Fill card number
            state['message'] = 'Escribiendo numero...'
            state['step'] = 5
            for sel in ['input[name="cardNumber"]', 'input[aria-label*="card"]',
                        'input[aria-label*="Card"]', 'input[placeholder*="1234"]',
                        'input[placeholder*="card"]', 'input[type="tel"]']:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=2000):
                        el.click()
                        el.fill(num)
                        break
                except:
                    continue

            time.sleep(1)

            # Fill expiry
            state['message'] = 'Escribiendo vencimiento...'
            for sel in ['input[name="expiryDate"]', 'input[aria-label*="expir"]',
                        'input[aria-label*="Expir"]', 'input[placeholder*="MM"]']:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=2000):
                        el.click()
                        el.fill(f"{month}/{year}")
                        break
                except:
                    continue

            time.sleep(2)

            # Step 6: Submit
            state['message'] = 'Confirmando...'
            state['step'] = 6
            for sel in ['text="Save"', 'text="Guardar"', 'text="Add"', 'text="Agregar"',
                        'text="Confirm"', 'button[type="submit"]']:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=2000):
                        el.click()
                        time.sleep(5)
                        break
                except:
                    continue

            # Step 7: Verification
            state['message'] = 'Verificando...'
            state['step'] = 7
            for sel in ['text="Verify"', 'text="Verificar"', 'text="Enter code"',
                        'input[name="verificationCode"]']:
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=2000):
                        state['message'] = 'Ingresa codigo en el navegador'
                        time.sleep(10)
                        break
                except:
                    continue

            # Done
            page.screenshot(path='C:/nexus-gpay/result.png')
            state['status'] = 'done'
            state['message'] = '✅ Tarjeta agregada — verifica en Google Pay'
            time.sleep(3)
            browser.close()

    except Exception as e:
        state['status'] = 'error'
        state['message'] = f'Error: {str(e)}'


if __name__ == '__main__':
    local_ip = get_local_ip()
    print("")
    print("⚡ NexusPay Agent v1.0")
    print("")
    print(f"  PC:     http://localhost:5050")
    print(f"  Celular: http://{local_ip}:5050")
    print("")
    print("  Desde el celular, abre la URL de arriba")
    print("  en la misma red WiFi que la PC")
    print("")
    app.run(host='0.0.0.0', port=5050, debug=False)
