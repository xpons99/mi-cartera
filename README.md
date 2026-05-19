# miCartera

PWA de finanzas personales para móvil. Funciona sin conexión y se puede instalar en la pantalla de inicio.

## Características

- **Ingresos** — sueldo base, extras/bonus y otros ingresos variables
- **Distribución mensual** — asigna cada euro a MSCI World, monetario, colchón o gastos. El dinero libre y la tasa de ahorro (en % y en €) se actualizan en tiempo real. Toca cualquier segmento de la barra para ver el desglose
- **Gastos** — registro manual por categoría, edición inline tocando cualquier movimiento, navegación por meses
- **Importación** — CSV, XLSX y PDF de cualquier banco. Las columnas se detectan automáticamente. Optimizado para el extracto XLSX de BBVA
- **Escanear ticket** — foto del ticket desde la cámara, extrae importe, fecha y comercio con OCR (Tesseract.js)
- **Exportar CSV** — descarga los gastos del mes seleccionado
- **Activos dinámicos** — añade, edita y elimina activos con nombre, tipo (Liquidez / Inversión LP / Alternativo) y rentabilidad personalizada. Sincronización en tiempo real con el dashboard
- **Patrimonio** — gráfico donut y métricas por tipo de activo
- **Objetivos** — metas de ahorro con barra de progreso y tiempo estimado
- **Simulador** — interés compuesto con gráfico: capital inicial, aportación mensual, TAE y horizonte temporal
- **Backup** — exportar e importar todos los datos en JSON desde el menú lateral (☰)

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
    ├── constants.js    # Helpers de formato, CATS, colores, estado global (gastos, objetivos, assets)
    ├── store.js        # Persistencia con localStorage + exportar/importar backup JSON
    ├── gastos.js       # Registro, edición y renderizado de gastos; navegación por meses
    ├── activos.js      # Gestión dinámica de activos (CRUD)
    ├── objetivos.js    # Gestión de objetivos de ahorro
    ├── simulador.js    # Calculadora de interés compuesto + gráfico
    ├── csv.js          # Importación CSV / XLSX / PDF + OCR de tickets
    └── app.js          # Navegación, distribución mensual, donut, inicialización
```

## Cómo funciona la tasa de ahorro y el dinero disponible

Ambas métricas usan los **gastos reales registrados** en el mes actual:

- **Dinero libre** = ingresos − (MSCI + monetario + colchón) − gastos reales del mes
- **Tasa de ahorro** = (ingresos − gastos reales) / ingresos × 100
- **Euros ahorrados** = ingresos − gastos reales

El campo "Gastos reales" en la distribución mensual se actualiza automáticamente cada vez que añades, editas o eliminas un gasto.

## Uso en local

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

La app se registra como PWA al acceder desde HTTPS o localhost. En Safari (iOS) usa "Añadir a pantalla de inicio" para instalarla.

## Importación de extractos

| Formato | Compatibilidad |
|---------|---------------|
| XLSX    | BBVA (optimizado), cualquier banco con columnas estándar |
| CSV     | Revolut, ING, N26, cualquier banco con separador `;` `,` o `TAB` |
| PDF     | Extractos digitales con texto real (no escaneados) |

La detección de columnas es automática: busca encabezados en español e inglés (`fecha`, `date`, `concepto`, `description`, `importe`, `amount`, `cargo`…) y salta filas de metadatos. Solo se importan los cargos negativos. Los duplicados se detectan por descripción + importe + fecha.

## Escanear ticket con la cámara

El botón "Escanear ticket" en el modal de nuevo gasto abre la cámara trasera del móvil. El OCR (Tesseract.js, cargado desde CDN la primera vez) extrae importe, fecha y nombre del comercio. El usuario puede corregir los campos antes de guardar.

Funciona bien con tickets impresos en buena luz. Para tickets muy deteriorados o con letra pequeña los resultados pueden ser imprecisos.

## Activos dinámicos

Los activos son completamente personalizables desde la pestaña Activos:

- **Añadir** — nombre, tipo (Liquidez / Inversión LP / Alternativo) y rentabilidad anual
- **Editar** — nombre y rentabilidad inline, valor en el campo de la derecha
- **Eliminar** — botón ✕ en cada fila

Todos los cambios se reflejan inmediatamente en el donut, las métricas del dashboard y la tarjeta de patrimonio.

## Backup de datos

Desde el menú lateral (☰ arriba a la derecha):

- **Exportar backup** — descarga un JSON con todos los datos (gastos, activos, objetivos, configuración)
- **Importar backup** — restaura el estado completo desde un JSON exportado previamente

## Persistencia

Todos los datos se guardan en `localStorage` bajo la clave `micartera_v2`. No se envía nada a ningún servidor. El backup JSON es la forma recomendada de hacer copias de seguridad, especialmente antes de limpiar datos del navegador.

## Open Banking (PSD2)

La integración con banco vía Open Banking está preparada en el código pero desactivada en la UI. Para activarla:

1. Descomentar el bloque `<!-- OPEN BANKING: descomentar... -->` en `index.html` (sección Gastos)
2. Cambiar `display:none!important` a `display:flex` en el modal `bankModalBg`

El servicio recomendado es **GoCardless Nordigen** (gratuito para uso personal, +2.400 bancos en Europa). Requiere un backend propio que gestione los tokens OAuth — ver el ejemplo en la sección siguiente.

### Arquitectura necesaria

```
[Tu banco] ← OAuth PSD2 → [Backend Node/Python] ← HTTPS → [miCartera PWA]
```

### Setup básico del backend (Node.js)

```bash
npm install node-fetch express
```

```js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const BASE       = 'https://bankaccountdata.gocardless.com/api/v2';
const SECRET_ID  = process.env.NORDIGEN_SECRET_ID;
const SECRET_KEY = process.env.NORDIGEN_SECRET_KEY;

app.get('/token', async (req, res) => {
  const r = await fetch(`${BASE}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret_id: SECRET_ID, secret_key: SECRET_KEY }),
  });
  res.json(await r.json());
});

app.get('/transactions/:accountId', async (req, res) => {
  const { access_token } = req.query;
  const r = await fetch(`${BASE}/accounts/${req.params.accountId}/transactions/`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  res.json(await r.json());
});

app.listen(3000);
```

## Tecnologías

- HTML5 / CSS3 / JavaScript vanilla (sin dependencias en tiempo de ejecución)
- Canvas API para gráficos (donut, simulador)
- Service Worker para uso offline
- Web App Manifest para instalación en iOS/Android
- [SheetJS](https://sheetjs.com/) — lectura de XLSX (lazy load desde CDN)
- [PDF.js](https://mozilla.github.io/pdf.js/) — extracción de texto de PDFs (lazy load desde CDN)
- [Tesseract.js](https://tesseract.projectnaptha.com/) — OCR para tickets (lazy load desde CDN)
