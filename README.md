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

## Tecnologías

- HTML5 / CSS3 / JavaScript (vanilla, sin dependencias)
- Canvas API para gráficos
- Service Worker para uso offline
- Web App Manifest para instalación en iOS/Android
