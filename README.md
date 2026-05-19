# miCartera

PWA de finanzas personales para móvil. Funciona sin conexión y se puede instalar en la pantalla de inicio.

## Características

- **Ingresos** — sueldo base, bonus, guardias y otros ingresos variables
- **Distribución mensual** — asigna cada euro a MSCI World, monetario, colchón o gastos. El dinero libre y la tasa de ahorro se actualizan en tiempo real según los gastos registrados
- **Gastos** — registro manual por categoría o importación desde CSV de BBVA/Revolut
- **Activos** — patrimonio total con gráfico donut (fondo monetario, MSCI World, cuenta remunerada, oro, Bitcoin, corriente)
- **Objetivos** — metas de ahorro con barra de progreso y tiempo estimado
- **Simulador** — interés compuesto para el monetario, el fondo MSCI o parámetros libres

## Estructura del proyecto

```
files/
├── index.html          # HTML limpio, sin estilos ni scripts inline
├── manifest.json       # Configuración PWA
├── sw.js               # Service Worker (caché offline)
├── icon.png            # Icono de la app
├── css/
│   └── app.css         # Todos los estilos
└── js/
    ├── constants.js    # Helpers de formato, CATS, colores, estado global
    ├── store.js        # Persistencia con localStorage
    ├── gastos.js       # Registro y renderizado de gastos
    ├── objetivos.js    # Gestión de objetivos de ahorro
    ├── simulador.js    # Calculadora de interés compuesto + gráfico
    ├── csv.js          # Importación de extractos BBVA / Revolut
    └── app.js          # Navegación, distribución, inicialización
```

## Cómo funciona la tasa de ahorro y el dinero disponible

Ambas métricas usan los **gastos reales registrados** en el mes actual, no una estimación manual:

- **Dinero libre** = ingresos − (MSCI + monetario + colchón) − gastos reales del mes
- **Tasa de ahorro** = (ingresos − gastos reales) / ingresos × 100

El campo "Gastos reales" en la distribución mensual se actualiza automáticamente cada vez que añades o eliminas un gasto.

## Uso en local

Abre `index.html` directamente en el navegador o sirve la carpeta con cualquier servidor estático:

```bash
# Python
python3 -m http.server 8080

# Node (npx)
npx serve .
```

La app se registra como PWA al acceder desde HTTPS o localhost. En Safari (iOS) usa "Añadir a pantalla de inicio" para instalarla.

## Importación CSV

| Banco   | Ruta de exportación |
|---------|---------------------|
| BBVA    | Movimientos → Filtrar → Exportar → CSV |
| Revolut | Cuenta → Extractos → Selecciona periodo → Descargar CSV |

Solo se importan los cargos negativos (gastos). Los duplicados se detectan automáticamente por descripción + importe + fecha.

## Persistencia

Todos los datos se guardan en `localStorage` bajo la clave `micartera_v2`. No se envía nada a ningún servidor.

## Open Banking (PSD2)

La app incluye una sección "Banco" en la pestaña Gastos para sincronización automática de movimientos via Open Banking PSD2.

### Servicio recomendado: GoCardless Nordigen

- Gratuito para uso personal
- Más de 2.400 bancos en Europa (BBVA, Santander, CaixaBank, ING, Sabadell, Bankinter, Openbank…)
- Solo acceso de lectura — las credenciales bancarias nunca pasan por la app
- Documentación: https://developer.gocardless.com/bank-account-data/overview

### Arquitectura necesaria

```
[Tu banco] ← OAuth PSD2 → [Backend Node/Python] ← HTTPS → [miCartera PWA]
```

El backend actúa como intermediario seguro para:
1. Gestionar el flujo OAuth con el banco
2. Almacenar los tokens de acceso (nunca en el cliente)
3. Obtener los movimientos cada 24 h y exponerlos a la app

### Setup básico del backend (Node.js)

```bash
npm install node-fetch express
```

```js
// server.js (ejemplo mínimo)
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const BASE = 'https://bankaccountdata.gocardless.com/api/v2';
const SECRET_ID  = process.env.NORDIGEN_SECRET_ID;
const SECRET_KEY = process.env.NORDIGEN_SECRET_KEY;

// 1. Obtener token
app.get('/token', async (req, res) => {
  const r = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: SECRET_ID, secret_key: SECRET_KEY }),
  });
  res.json(await r.json());
});

// 2. Listar movimientos de una cuenta
app.get('/transactions/:accountId', async (req, res) => {
  const { access_token } = req.query;
  const r = await fetch(`${BASE}/accounts/${req.params.accountId}/transactions/`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  res.json(await r.json());
});

app.listen(3000);
```

Los movimientos devueltos tienen el mismo formato que los CSV — pasan por el parser universal de la app.

## Tecnologías

- HTML5 / CSS3 / JavaScript (vanilla, sin dependencias)
- Canvas API para gráficos
- Service Worker para uso offline
- Web App Manifest para instalación en iOS/Android
