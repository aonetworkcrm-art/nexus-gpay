# NexusPay — Guia Completa de Uso

## Que es NexusPay?

NexusPay es una herramienta personal para **vincular tarjetas de credito/debito a Google Pay** cuando la app nativa falla o no te deja agregar tarjetas.

## Por que existe?

Google Pay a veces presenta errores al agregar tarjetas directamente. NexusPay ofrece multiples metodos para lograrlo:

1. **Deep Link** — Abre Google Pay nativo directamente
2. **Copia Manual** — Copia los datos y pegalos en Google Pay
3. **QR Code** — Genera un QR para escanear desde otro dispositivo

## Como Usar (Paso a Paso)

### Desde el Celular (Recomendado)

1. **Abre** https://nexus-gpay.vercel.app en Chrome
2. **Asegurate** de tener tu Google sesion activa en Chrome
3. **Ingresa** los datos de tu tarjeta:
   - Numero de tarjeta
   - Nombre del titular
   - Fecha de vencimiento
   - CVV
4. **Presiona** "Vincular a Google Pay"
5. **Se abre** Google Pay con tu tarjeta pre-cargada
6. **Confirma** y listo!

### Desde la Desktop

1. Ingresa los datos de la tarjeta
2. Presiona "Copiar Datos"
3. Abre Google Pay en tu celular
4. Ve a "Agregar metodo de pago"
5. Pega los datos

### Usando QR Code

1. Desde la desktop, genera el QR
2. Desde el celular, escanea el QR
3. Abre Google Pay
4. Agrega la tarjeta manualmente

## Funcionalidades

### Deteccion Automatica de Marca
- Visa (empieza con 4)
- Mastercard (empieza con 51-55)
- American Express (empieza con 34-37)
- Discover (empieza con 6011 o 65)
- JCB (empieza con 35)

### Guardado Local
- Las tarjetas se guardan en tu navegador (localStorage)
- NUNCA se envian a servidores
- Puedes vincular rapidamente despues

### Copia Rapida
- Un solo click para copiar todos los datos
- Compatible con cualquier app de clipboard

## Solucion de Problemas

### Google Pay no abre
**Causa:** No tienes Chrome o tu Google sesion no esta activa
**Solucion:**
1. Abre Chrome en tu celular
2. Ve a Configuracion > Cuentas
3. Verifica que tu Google sesion esta activa
4. Intenta de nuevo

### Tarjeta no se vincula
**Causa:** Google Pay no acepta la tarjeta
**Solucion:**
1. Verifica que la tarjeta esta activa
2. Contacta a tu banco para verificar soporte
3. Intenta con otro metodo de vinculacion

### QR no escanea
**Causa:** Resolucion muy baja
**Solucion:**
1. Genera el QR de nuevo
2. Acerca el celular a la pantalla
3. Usa un lector QR confiable

## Seguridad

### Proteccion de Datos
- **100% local** — Los datos NUNCA salen de tu navegador
- **Sin servidores** — No hay backend que pueda ser comprometido
- **localStorage** — Las tarjetas se guardan solo en tu dispositivo
- **HTTPS** — Comunicacion encriptada (via Vercel)

### Que NO hace NexusPay
- NO guarda tus datos en la nube
- NO envia informacion a terceros
- NO procesa pagos
- NO tiene acceso a tus tarjetas

## API y Desarrollo

### Deep Link
NexusPay usa el deep link `gpay://` que abre la app de Google Pay directamente.

### Google Pay API
Para integraciones avanzadas, consulta:
https://developers.google.com/pay/api/web/overview

### Estructura del Codigo
```
nexus-gpay/
├── index.html      ← Interfaz principal
├── style.css       ← Estilos mobile-first
├── app.js          ← Logica de la herramienta
├── vercel.json     ← Config de deploy
└── README.md       ← Documentacion
```

## Actualizaciones

### v1.0 (22 Agosto 2026)
- Version inicial
- Deep link a Google Pay
- QR Code generation
- Guardado local de tarjetas
- Deteccion automatica de marca
- Mobile-first design
