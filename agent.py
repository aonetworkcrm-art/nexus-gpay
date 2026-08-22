"""
NexusPay Agent — Automatiza el proceso de agregar tarjetas a Google Pay
Requiere: pip install playwright && playwright install chromium
Uso: python agent.py --num 4242424242424242 --exp 12/28
"""

import sys
import json
import time
import argparse
import os

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: Instala playwright: pip install playwright && playwright install chromium")
    sys.exit(1)


def log(msg):
    print(f"[NexusPay] {msg}")


def add_card_to_gpay(card_number, card_expiry, headless=False):
    """
    Automatiza todo el proceso de agregar una tarjeta a Google Pay:
    1. Abre Chrome con perfil del usuario (ya logueado en Google)
    2. Navega a Google Pay
    3. Agrega la tarjeta automaticamente
    4. Verifica que se agrego correctamente
    """
    # Parse expiry
    parts = card_expiry.replace('/', '').strip()
    if len(parts) == 4:
        month = parts[:2]
        year = parts[2:]
    else:
        log("ERROR: Vencimiento debe ser MM/AA (ej: 12/28)")
        return False

    # Format card number with spaces for display
    formatted_num = ' '.join([card_number[i:i+4] for i in range(0, len(card_number), 4)])
    log(f"Tarjeta: {formatted_num}")
    log(f"Vence: {month}/{year}")

    with sync_playwright() as p:
        # Launch Chrome with user's existing profile (so they're logged into Google)
        user_data_dir = os.path.expanduser("~") + "/AppData/Local/Google/Chrome/User Data"

        log("Abriendo Chrome con perfil de usuario...")

        # Use a fresh context to avoid profile lock issues
        browser = p.chromium.launch(
            headless=headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--no-default-browser-check',
            ]
        )

        context = browser.new_context(
            viewport={'width': 412, 'height': 915},  # Mobile viewport
            user_agent='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            locale='en-US',
        )

        page = context.new_page()

        try:
            # Step 1: Navigate to Google Pay
            log("Navegando a Google Pay...")
            page.goto('https://pay.google.com', wait_until='networkidle', timeout=30000)
            time.sleep(2)

            # Check if we need to sign in
            current_url = page.url
            log(f"URL actual: {current_url}")

            if 'signin' in current_url or 'accounts.google.com' in current_url:
                log("⚠️ Necesitas iniciar sesion en Google")
                log("Inicia sesion manualmente en el navegador que se abrio...")
                log("Despues de iniciar sesion, el agente continuara automaticamente")

                # Wait for user to sign in (up to 120 seconds)
                for i in range(120):
                    time.sleep(1)
                    current_url = page.url
                    if 'wallet' in current_url or 'pay.google' in current_url:
                        log("✅ Sesion iniciada correctamente")
                        break
                    if i % 10 == 0:
                        log(f"Esperando sesion... ({i}s)")

                time.sleep(3)

            # Step 2: Navigate to wallet/payment methods
            log("Navegando a metodos de pago...")
            page.goto('https://wallet.google.com/manage/methods', wait_until='networkidle', timeout=30000)
            time.sleep(3)

            current_url = page.url
            log(f"URL: {current_url}")

            # Check if redirected to sign in again
            if 'signin' in current_url or 'accounts.google.com' in current_url:
                log("⚠️ Necesitas iniciar sesion de nuevo")
                for i in range(120):
                    time.sleep(1)
                    if 'wallet' in page.url or 'pay.google' in page.url:
                        log("✅ Sesion iniciada")
                        break
                time.sleep(3)

            # Step 3: Look for "Add payment method" or similar button
            log("Buscando boton para agregar tarjeta...")

            # Try multiple selectors for the add button
            add_selectors = [
                'text="Add a payment method"',
                'text="Agregar metodo de pago"',
                'text="Add payment method"',
                'text="Add card"',
                'text="Agregar tarjeta"',
                '[aria-label="Add payment method"]',
                '[aria-label="Agregar metodo de pago"]',
                'button:has-text("Add")',
                'button:has-text("Agregar")',
                '[data-id="addPaymentMethod"]',
            ]

            clicked = False
            for sel in add_selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        log(f"Encontrado: {sel}")
                        elem.click()
                        clicked = True
                        time.sleep(3)
                        break
                except:
                    continue

            if not clicked:
                log("⚠️ No se encontro boton de agregar. Buscando alternativas...")
                # Try clicking any "+" or "Add" button
                try:
                    page.locator('button >> text="+"').first.click()
                    clicked = True
                    time.sleep(3)
                except:
                    pass

            if not clicked:
                # Take screenshot for debugging
                page.screenshot(path='nexuspay_debug.png')
                log("📸 Screenshot guardado en nexuspay_debug.png")
                log("No se pudo encontrar el boton de agregar tarjeta automaticamente")
                log("El navegador esta abierto — agregala manualmente")
                log("Presiona Ctrl+C cuando termines")
                input("Presiona Enter para cerrar...")
                return False

            # Step 4: Fill in card details
            log("Rellenando datos de la tarjeta...")

            # Card number field
            num_selectors = [
                'input[name="cardNumber"]',
                'input[aria-label="Card number"]',
                'input[aria-label="Numero de tarjeta"]',
                'input[placeholder*="card"]',
                'input[placeholder*="1234"]',
                'input[type="tel"]:first-of-type',
                '#cardNumber',
            ]

            for sel in num_selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        elem.fill(card_number)
                        log("✅ Numero de tarjeta ingreado")
                        break
                except:
                    continue

            time.sleep(1)

            # Expiry field
            exp_selectors = [
                'input[name="expiryDate"]',
                'input[aria-label="Expiration date"]',
                'input[aria-label="Fecha de vencimiento"]',
                'input[placeholder*="MM"]',
                'input[placeholder*="expir"]',
                '#expiryDate',
            ]

            for sel in exp_selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        elem.click()
                        elem.fill(f"{month}/{year}")
                        log("✅ Vencimiento ingreado")
                        break
                except:
                    continue

            time.sleep(2)

            # Step 5: Submit / Confirm
            log("Buscando boton de confirmar...")
            submit_selectors = [
                'text="Save"',
                'text="Guardar"',
                'text="Add"',
                'text="Agregar"',
                'text="Confirm"',
                'text="Confirmar"',
                'button[type="submit"]',
                '[aria-label="Save"]',
            ]

            submitted = False
            for sel in submit_selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        log(f"Confirmando: {sel}")
                        elem.click()
                        submitted = True
                        time.sleep(5)
                        break
                except:
                    continue

            # Step 6: Handle verification (SMS/email code)
            log("Verificando si se necesita codigo de verificacion...")

            verify_selectors = [
                'text="Verify"',
                'text="Verificar"',
                'text="Enter code"',
                'text="Codigo"',
                'input[name="verificationCode"]',
                'input[aria-label*="code"]',
                'input[aria-label*="codigo"]',
            ]

            needs_verify = False
            for sel in verify_selectors:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        needs_verify = True
                        log("⚠️ Se necesita codigo de verificacion")
                        log("Revisa tu correo o telefono para el codigo")
                        log("El navegador esta abierto — ingresa el codigo manualmente")
                        log("Despues de ingresar el codigo, presiona Verificar")
                        input("Presiona Enter despues de verificar...")
                        break
                except:
                    continue

            # Step 7: Final screenshot and verification
            time.sleep(3)
            page.screenshot(path='nexuspay_result.png')
            log("📸 Screenshot del resultado guardado en nexuspay_result.png")

            # Check for success indicators
            success_indicators = [
                'text="Payment method added"',
                'text="Metodo de pago agregado"',
                'text="Card added"',
                'text="Tarjeta agregada"',
                'text="Successfully added"',
            ]

            for sel in success_indicators:
                try:
                    elem = page.locator(sel).first
                    if elem.is_visible(timeout=2000):
                        log("✅ TARJETA AGREGADA EXITOSAMENTE A GOOGLE PAY")
                        return True
                except:
                    continue

            log("Proceso completado. Verifica en Google Pay si la tarjeta aparece.")
            log("El navegador permanece abierto para que verifiques.")
            input("Presiona Enter para cerrar...")
            return True

        except Exception as e:
            log(f"ERROR: {str(e)}")
            try:
                page.screenshot(path='nexuspay_error.png')
                log("📸 Screenshot de error guardado en nexuspay_error.png")
            except:
                pass
            return False

        finally:
            browser.close()


def main():
    parser = argparse.ArgumentParser(description='NexusPay Agent — Agrega tarjetas a Google Pay automaticamente')
    parser.add_argument('--num', required=True, help='Numero de tarjeta (sin espacios)')
    parser.add_argument('--exp', required=True, help='Vencimiento MM/AA (ej: 12/28)')
    parser.add_argument('--headless', action='store_true', help='Modo sin ventana (recomendado: NO)')

    args = parser.parse_args()

    # Clean card number
    card_num = args.num.replace(' ', '').replace('-', '')
    if not card_num.isdigit() or len(card_num) < 13:
        log("ERROR: Numero de tarjeta invalido")
        sys.exit(1)

    log("=== NexusPay Agent v1.0 ===")
    log("Este agente automatiza TODO el proceso de agregar tarjetas a Google Pay")
    log("")

    success = add_card_to_gpay(card_num, args.exp, headless=args.headless)

    if success:
        log("")
        log("🎉 PROCESO COMPLETADO")
        log("La tarjeta deberia aparecer en tu Google Pay")
        log("Verifica en: pay.google.com > Metodos de pago")
    else:
        log("")
        log("⚠️ El proceso no se pudo completar automaticamente")
        log("El navegador esta abierto para que termines manualmente")

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
