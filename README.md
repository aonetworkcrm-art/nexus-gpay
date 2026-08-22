# NexusPay — Google Pay Card Linker

## Que es?

NexusPay es una herramienta personal para **vincular tarjetas de credito/debito a Google Pay** cuando la app nativa no funciona correctamente.

## Por que existe?

Google Pay a veces falla al agregar tarjetas directamente. NexusPay ofrece:
1. Deep links que abren el flujo nativo de Google Pay
2. Copia rapida de datos para pegar manualmente
3. QR codes para transferir datos entre dispositivos
4. Guardado local de tarjetas para re-vincular rapido

## Como funciona?

### Metodo 1: Deep Link (Recomendado)
1. Abre NexusPay en el celular con Chrome
2. Ingresa los datos de la tarjeta
3. Presiona "Vincular a Google Pay"
4. Se abre Google Pay nativo con la tarjeta

### Metodo 2: Copia Manual
1. Ingresa los datos
2. Presiona "Copiar Datos"
3. Abre Google Pay > Agregar metodo de pago
4. Pega los datos

### Metodo 3: QR Code
1. Genera el QR desde la desktop
2. Escanea desde el celular
3. Abre Google Pay

## Seguridad

- **100% local** — Los datos NUNCA salen de tu navegador
- **Sin servidores** — No hay backend que pueda ser comprometido
- **localStorage** — Las tarjetas se guardan solo en tu dispositivo
- **HTTPS** — Comunicacion encriptada (via Vercel)

## Archivos

```
nexus-gpay/
├── index.html      ← Interfaz principal
├── style.css       ← Estilos mobile-first
├── app.js          ← Logica de la herramienta
├── vercel.json     ← Config de deploy
└── README.md       ← Esta documentacion
```

## Deploy

```bash
cd nexus-gpay
vercel --yes --prod
```

## Uso Personal

1. Guarda la URL en elCELULAR
2. Cuando necesites vincular una tarjeta, abrela
3. Ingresa los datos y presiona "Vincular"
4. Google Pay abre automaticamente

## Solucion de Problemas

### Google Pay no abre
- Verifica que tienes Chrome en el celular
- Asegurate de tener Google sesion activa
- Usa "Copiar Datos" como alternativa

### Tarjeta no se vincula
- Verifica que los datos son correctos
- Intenta con otro navegador
- Contacta a tu banco para verificar que la tarjeta soporta Google Pay

## API Oficial

NexusPay usa el deep link `gpay://` que abre la app de Google Pay directamente.
Si esto deja de funcionar, revisa la documentacion de Google Pay API:
https://developers.google.com/pay/api/web/overview
