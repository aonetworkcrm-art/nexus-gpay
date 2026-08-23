"""
⚡ NexusPay v6 — Vincula tarjetas a Google Pay automaticamente
Ejecuta: python server.py
Abre: http://localhost:5050
"""

import os, sys, json, threading, time, socket, subprocess

try:
    from flask import Flask, render_template_string, request, jsonify
except ImportError:
    os.system('pip install flask -q')
    from flask import Flask, render_template_string, request, jsonify

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    os.system('pip install playwright -q')
    os.system('playwright install chromium')
    from playwright.sync_api import sync_playwright

app = Flask(__name__)
state = {'status': 'idle', 'msg': '', 'step': 0}

PROFILE = os.path.expanduser(r'~\nexuspay_profile')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

def get_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def kill_chrome():
    os.system('taskkill /F /IM chrome.exe /T >nul 2>&1')
    time.sleep(2)

def open_chrome(url=""):
    try:
        if url:
            subprocess.Popen([CHROME, url])
        else:
            subprocess.Popen([CHROME])
    except:
        pass

HTML = '''<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>NexusPay</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh;display:flex;justify-content:center;padding:16px}
.box{max-width:480px;width:100%}
.hd{background:linear-gradient(135deg,#111827,#1a1a2e);border-radius:16px;padding:24px;margin-bottom:16px;text-align:center;border:1px solid #1e293b}
.hd h1{font-size:24px;color:#4285f4}.hd p{font-size:13px;color:#94a3b8;margin-top:4px}
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
.bp:active{transform:scale(.98)}.bp:disabled{opacity:.5;cursor:not-allowed}
.prog{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-top:16px;display:none}
.prog.show{display:block}
.pbar{height:4px;background:#1e293b;border-radius:2px;margin:12px 0;overflow:hidden}
.pfill{height:100%;background:linear-gradient(90deg,#4285f4,#34d399);border-radius:2px;transition:width .5s}
.steps{list-style:none;padding:0}
.steps li{padding:6px 0;font-size:12px;color:#64748b;display:flex;align-items:center;gap:8px}
.steps li.act{color:#4285f4;font-weight:600}.steps li.done{color:#34d399}
.log{background:#0a0e1a;border-radius:8px;padding:12px;margin-top:12px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:11px;line-height:1.8;color:#94a3b8;display:none}
.log.show{display:block}
.ok{color:#34d399}.err{color:#f87171}.inf{color:#4285f4}
.note{background:rgba(66,133,244,.1);border:1px solid rgba(66,133,244,.2);border-radius:8px;padding:12px;margin-top:12px;font-size:11px;color:#94a3b8;line-height:1.6}
</style></head><body><div class="box">
<div class="hd"><h1>⚡ NexusPay</h1><p>Vincula tarjetas a Google Pay</p></div>
<div class="card"><div class="chip"></div><div class="brand" id="brand">VISA</div>
<div class="cnum" id="cnum">&bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;</div>
<div class="cexp" id="cexp">MM/AA</div></div>
<div class="fg"><label>Numero de Tarjeta</label>
<input type="tel" id="num" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric"></div>
<div class="fg"><label>Vencimiento</label>
<input type="tel" id="exp" placeholder="MM/AA" maxlength="5" inputmode="numeric"></div>
<button class="btn bp" id="btn" onclick="go()">⚡ Vincular a Google Pay</button>
<div class="prog" id="prog"><div class="pbar"><div class="pfill" id="pf" style="width:0%"></div></div>
<ul class="steps"><li id="s1">1. Cerrando Chrome</li><li id="s2">2. Abriendo Google Pay</li>
<li id="s3">3. Click en Add payment method</li><li id="s4">4. Llenando tarjeta</li><li id="s5">5. Guardando</li></ul></div>
<div class="log" id="log"></div>
<div class="note"><strong>Flujo automatico:</strong> Cierra Chrome → Abre Google Pay → Click Add → Llena datos → Guarda → Reabre Chrome</div>
</div>
<script>
document.getElementById('num').addEventListener('input',function(){
var r=this.value.replace(/\\s/g,'').replace(/\\D/g,'').substring(0,16);
var f='';for(var i=0;i<r.length;i++){if(i>0&&i%4==0)f+=' ';f+=r[i];}
this.value=f;document.getElementById('cnum').textContent=f||'\\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022 \\u2022\\u2022\\u2022\\u2022';
var b='VISA';if(/^4/.test(r))b='VISA';else if(/^5[1-5]/.test(r))b='MASTERCARD';else if(/^3[47]/.test(r))b='AMEX';else if(/^6(?:011|5)/.test(r))b='DISCOVER';
document.getElementById('brand').textContent=b;});
document.getElementById('exp').addEventListener('input',function(){
var r=this.value.replace(/\\//g,'').replace(/\\D/g,'').substring(0,4);
this.value=r.length>2?r.substring(0,2)+'/'+r.substring(2):r;
document.getElementById('cexp').textContent=this.value||'MM/AA';});
function L(m,c){var l=document.getElementById('log');l.classList.add('show');
l.innerHTML+='<div class="'+(c||'')+'">'+m+'</div>';l.scrollTop=l.scrollHeight;}
function S(n){for(var i=1;i<=5;i++)document.getElementById('s'+i).className=i<n?'done':i==n?'act':'';
document.getElementById('pf').style.width=Math.round(n/5*100)+'%';}
function go(){
var n=document.getElementById('num').value.replace(/\\s/g,'');
var e=document.getElementById('exp').value;
if(!n||n.length<13){alert('Numero invalido');return;}
if(!e||e.length<5){alert('Vencimiento requerido');return;}
document.getElementById('btn').disabled=true;document.getElementById('btn').textContent='🔄 Ejecutando...';
document.getElementById('prog').classList.add('show');L('Iniciando...','inf');S(1);
fetch('/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({num:n,exp:e})})
.then(function(r){return r.json()}).then(function(d){L(d.msg,d.ok?'ok':'err');
document.getElementById('btn').disabled=false;document.getElementById('btn').textContent='⚡ Vincular a Google Pay';
});}
setInterval(function(){fetch('/status').then(function(r){return r.json()}).then(function(d){
if(d.step>0)S(d.step);if(d.msg&&d.status!='idle')L(d.msg,d.status=='done'?'ok':d.status=='error'?'err':'inf');
if(d.status=='done'||d.status=='error'){document.getElementById('btn').disabled=false;
document.getElementById('btn').textContent='⚡ Vincular a Google Pay';}});},1500);
</script></body></html>'''

@app.route('/')
def index(): return render_template_string(HTML)

@app.route('/status')
def status(): return jsonify(state)

@app.route('/start', methods=['POST'])
def start():
    data = request.json
    num = data.get('num', '').replace(' ', '').replace('-', '')
    exp = data.get('exp', '')
    if len(num) < 13 or len(exp) < 5:
        return jsonify({'ok': False, 'msg': 'Datos invalidos'})
    state.update({'status': 'running', 'msg': 'Iniciando...', 'step': 1})
    threading.Thread(target=run_agent, args=(num, exp), daemon=True).start()
    return jsonify({'ok': True, 'msg': 'Agente iniciado'})


def run_agent(num, exp):
    def S(step, msg):
        state.update({'step': step, 'msg': msg})

    month, year = exp.replace('/', '')[:2], exp.replace('/', '')[2:]

    try:
        # Step 1: Close Chrome
        S(1, 'Cerrando Chrome...')
        kill_chrome()

        # Step 2: Launch Chrome and go to Google Payments
        S(2, 'Abriendo Google Pay...')
        os.makedirs(PROFILE, exist_ok=True)

        with sync_playwright() as p:
            ctx = p.chromium.launch_persistent_context(
                user_data_dir=PROFILE, headless=False,
                viewport={'width': 1280, 'height': 800},
                locale='en-US',
                args=['--disable-blink-features=AutomationControlled', '--no-first-run'],
                executable_path=CHROME if os.path.exists(CHROME) else None,
            )
            page = ctx.pages[0] if ctx.pages else ctx.new_page()

            page.goto('https://payments.google.com/payments/home', timeout=30000)
            time.sleep(5)

            # Check login
            if 'signin' in page.url or 'accounts.google' in page.url:
                S(2, 'Inicia sesion en Google...')
                for i in range(300):
                    time.sleep(1)
                    if 'payments' in page.url:
                        break
                time.sleep(3)

            # Step 3: Click Payment methods
            S(2, 'Abriendo Payment methods...')
            try:
                page.locator('text="Payment methods"').first.click()
            except:
                page.goto('https://payments.google.com/payments/home/paymentmethods', timeout=20000)
            time.sleep(12)  # Wait for iframe to fully load

            # Step 4: Find and click "Add payment method" in iframe
            S(3, 'Buscando Add payment method...')
            clicked = False

            for f in page.frames:
                try:
                    add_btn = f.locator('text="Add payment method"').first
                    if add_btn.is_visible(timeout=3000):
                        S(3, 'Click en Add payment method')
                        add_btn.click()
                        clicked = True
                        time.sleep(5)
                        break
                except:
                    continue

            if not clicked:
                for f in page.frames:
                    for sel in ['text="Add a payment method"', 'text="Add credit or debit card"',
                                'button:has-text("Add")', 'a:has-text("Add payment")']:
                        try:
                            el = f.locator(sel).first
                            if el.is_visible(timeout=2000):
                                S(3, 'Click en boton Add')
                                el.click()
                                clicked = True
                                time.sleep(5)
                                break
                        except:
                            continue
                    if clicked:
                        break

            if not clicked:
                page.screenshot(path='C:/nexus-gpay/debug.png')
                state.update({'status': 'error', 'msg': 'No encontre Add payment method. Screenshot: debug.png'})
                ctx.close()
                open_chrome()
                return

            # Step 5: Fill the form in the iframe
            S(4, 'Llenando tarjeta...')
            form_filled = False

            for f in page.frames:
                try:
                    body = f.locator('body').inner_text()
                    if 'card' in body.lower() and ('save' in body.lower() or 'cancel' in body.lower()):
                        # This is the form frame!

                        # Fill card number
                        for sel in ['input[type="tel"]', 'input[name="cardNumber"]',
                                    'input[aria-label*="card"]', 'input[placeholder*="1234"]',
                                    'input[aria-label*="Card"]']:
                            try:
                                el = f.locator(sel).first
                                if el.is_visible(timeout=2000):
                                    el.click()
                                    el.fill('')
                                    el.type(num, delay=30)
                                    S(4, 'Numero escrito')
                                    form_filled = True
                                    break
                            except:
                                continue

                        time.sleep(1)

                        # Fill expiry
                        for sel in ['input[aria-label*="expir"]', 'input[placeholder*="MM"]',
                                    'input[name="expiryDate"]', 'input[aria-label*="Expir"]']:
                            try:
                                el = f.locator(sel).first
                                if el.is_visible(timeout=2000):
                                    el.click()
                                    el.fill('')
                                    el.type(f'{month}/{year}', delay=30)
                                    S(4, 'Vencimiento escrito')
                                    break
                            except:
                                continue

                        time.sleep(2)

                        # Step 6: Click Save
                        S(5, 'Guardando...')
                        for sel in ['text="Save"', 'text="Guardar"', 'button:has-text("Save")']:
                            try:
                                el = f.locator(sel).first
                                if el.is_visible(timeout=2000):
                                    el.click()
                                    S(5, 'Enviado!')
                                    time.sleep(5)
                                    break
                            except:
                                continue
                        break
                except:
                    continue

            if not form_filled:
                # Try filling in main page as fallback
                S(4, 'Buscando campos en pagina principal...')
                for sel in ['input[type="tel"]', 'input[aria-label*="card"]']:
                    try:
                        el = page.locator(sel).first
                        if el.is_visible(timeout=2000):
                            el.click()
                            el.fill(num)
                            S(4, 'Numero escrito (fallback)')
                            form_filled = True
                            break
                    except:
                        continue

            # Done
            page.screenshot(path='C:/nexus-gpay/result.png')
            state.update({'status': 'done', 'msg': '✅ Proceso completado! Revisa Google Pay', 'step': 5})
            time.sleep(5)
            ctx.close()

        # Reopen Chrome
        open_chrome()

    except Exception as e:
        state.update({'status': 'error', 'msg': f'Error: {str(e)}'})
        try:
            open_chrome()
        except:
            pass


if __name__ == '__main__':
    ip = get_ip()
    print("")
    print("  ⚡ NexusPay v6")
    print(f"  PC:     http://localhost:5050")
    print(f"  Red:    http://{ip}:5050")
    print("")
    app.run(host='0.0.0.0', port=5051, debug=False)
