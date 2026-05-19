// ── Activos ──
function getA() {
  return {
    monetario: parseFloat($('a-monetario').value) || 0,
    fondo:     parseFloat($('a-fondo').value)     || 0,
    colchon:   parseFloat($('a-colchon').value)   || 0,
    oro:       parseFloat($('a-oro').value)       || 0,
    btc:       parseFloat($('a-btc').value)       || 0,
    corriente: parseFloat($('a-corriente').value) || 0,
  };
}

function drawPatCard() {
  const a   = getA();
  const tot = Object.values(a).reduce((s, v) => s + v, 0);
  const liq = a.monetario + a.colchon + a.corriente;
  const alt = a.oro + a.btc;
  if ($('pat-total')) $('pat-total').textContent = fmt(tot);
  if ($('pat-inv'))   $('pat-inv').textContent   = fmtK(a.fondo);
  if ($('pat-liq'))   $('pat-liq').textContent   = fmtK(liq);
  if ($('pat-alt'))   $('pat-alt').textContent   = fmtK(alt);
}

function drawDonut() {
  const cv = $('donutCanvas'); if (!cv) return;
  const a   = getA();
  const tot = Object.values(a).reduce((s, v) => s + v, 0);
  const dpr = window.devicePixelRatio || 1;
  const sz  = Math.min(cv.parentElement.clientWidth * 0.5, 170);
  cv.width  = sz * dpr; cv.height = sz * dpr;
  cv.style.width = sz + 'px'; cv.style.height = sz + 'px';

  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cx  = sz / 2, cy = sz / 2, r = sz * 0.44, inn = sz * 0.28;
  let st = -Math.PI / 2;
  ctx.clearRect(0, 0, sz, sz);
  if (!tot) return;

  Object.keys(a).forEach(k => {
    if (!a[k]) return;
    const ang = (a[k] / tot) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, st, st + ang);
    ctx.closePath(); ctx.fillStyle = ASSET_COLORS[k]; ctx.fill();
    st += ang;
  });
  ctx.beginPath(); ctx.arc(cx, cy, inn, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  $('donut-total').textContent = fmtK(tot);

  const leg = $('donut-legend'); leg.innerHTML = '';
  Object.keys(a).forEach(k => {
    if (!a[k]) return;
    const pct = ((a[k] / tot) * 100).toFixed(1);
    leg.innerHTML += `<div class="dl-item">
      <div class="dl-l"><div class="dl-dot" style="background:${ASSET_COLORS[k]}"></div><span class="dl-name">${ASSET_NAMES[k]}</span></div>
      <div class="dl-r"><span class="dl-pct">${pct}%</span><span class="dl-val">${fmtK(a[k])}</span></div>
    </div>`;
  });
}

// ── Ingresos ──
function calcIngresos() {
  const s = parseFloat($('sueldoBase').value) || 0;
  const b = parseFloat($('bonus').value)      || 0;
  const g = parseFloat($('guardias').value)   || 0;
  const o = parseFloat($('otros').value)      || 0;
  const total = s + b + g + o;
  $('totalIngresos').textContent = fmt(total);
  updateDist(total);
  updateAll();
  saveAll();
}

// ── Distribución mensual ──
// FIX: usa gastos reales del mes en lugar de la estimación manual.
// "Dinero libre" = ingresos - (fondo + monetario + colchón) - gastos reales.
// "Tasa ahorro"  = (ingresos - gastos reales) / ingresos  (% no gastado).
function updateDist(total) {
  if (total === undefined) {
    const s = parseFloat($('sueldoBase').value) || 0;
    const b = parseFloat($('bonus').value)      || 0;
    const g = parseFloat($('guardias').value)   || 0;
    const o = parseFloat($('otros').value)      || 0;
    total = s + b + g + o;
  }

  const f = parseFloat($('alloc-fondo').value)      || 0;
  const m = parseFloat($('alloc-monetario').value)  || 0;
  const c = parseFloat($('alloc-colchon').value)    || 0;

  // Gastos reales del mes actual (siempre mes en curso, no el mes seleccionado)
  const realGastos = getCurrentMonthGastos().reduce((s, g) => s + g.amt, 0);

  // Sincroniza el campo de display de gastos reales en la distribución
  const gg = $('alloc-gastos');
  if (gg) gg.value = realGastos.toFixed(0);

  const libre = total - (f + m + c) - realGastos;

  const setB = (el, v) => {
    if (v < 0) { el.textContent = fmt(Math.abs(v)) + ' excedido'; el.className = 'bov'; }
    else       { el.textContent = '+' + fmt(v) + ' libre';        el.className = 'bok'; }
  };
  setB($('allocBadge'), libre);
  setB($('topBadge'),   libre);

  // Barra de distribución con gastos reales
  const pF = total > 0 ? Math.min(f           / total * 100, 100)             : 0;
  const pM = total > 0 ? Math.min(m           / total * 100, 100 - pF)        : 0;
  const pG = total > 0 ? Math.min(realGastos  / total * 100, 100 - pF - pM)  : 0;
  const pC = total > 0 ? Math.min(c           / total * 100, 100 - pF - pM - pG) : 0;
  const pL = Math.max(0, 100 - pF - pM - pG - pC);

  $('seg-f').style.width = pF + '%';
  $('seg-m').style.width = pM + '%';
  $('seg-g').style.width = pG + '%';
  $('seg-c').style.width = pC + '%';
  $('seg-l').style.width = pL + '%';

  // Tasa de ahorro = porcentaje de ingresos no gastado en gastos reales
  const tasa = total > 0 ? Math.max(0, (total - realGastos) / total * 100) : 0;
  $('m-tasa').textContent = tasa.toFixed(0) + '%';

  saveAll();
}

// ── Actualizar todo ──
function updateAll() {
  const a   = getA();
  const tot = Object.values(a).reduce((s, v) => s + v, 0);
  const liq = a.monetario + a.colchon + a.corriente;

  $('m-total').textContent = fmtK(tot);
  $('m-inv').textContent   = fmtK(a.fondo);
  $('m-liq').textContent   = fmtK(liq);

  drawPatCard();
  drawDonut();
  updateGastosInicio();
  updateDist(); // recalcula dinero libre y tasa ahorro con gastos reales
  saveAll();
}

// ── Navegación ──
function goTo(sc) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('on'));
  $('sc-' + sc).classList.add('on');
  $('nav-' + sc).classList.add('on');
  window.scrollTo(0, 0);
  if (sc === 'activos')  setTimeout(() => { drawDonut(); drawPatCard(); }, 40);
  if (sc === 'calc')     setTimeout(drawChart, 40);
  if (sc === 'gastos')   renderGastos();
  if (sc === 'objetivo') renderObjetivos();
}

// ── Binding de eventos ──
function bindAll() {
  ['sueldoBase', 'bonus', 'guardias', 'otros'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', calcIngresos);
  });
  ['alloc-fondo', 'alloc-monetario', 'alloc-colchon'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', () => updateDist());
  });
  ['a-monetario', 'a-fondo', 'a-colchon', 'a-oro', 'a-btc', 'a-corriente',
   'r-monetario', 'r-fondo', 'r-colchon'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', updateAll);
  });

  const cf = $('csv-file');
  if (cf) cf.addEventListener('change', function () {
    const file = this.files[0]; if (!file) return;
    handleFileChange(file);
  });
}

// ── Inicialización ──
document.addEventListener('DOMContentLoaded', function () {
  $('hdrDate').textContent = new Date().toLocaleDateString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  try { loadInputs(); } catch (e) { console.warn('load error:', e); }

  bindAll();
  calcIngresos();
  updateAll();

  const _a = getA();
  TS.monetario.ini = _a.monetario;
  TS.monetario.men = parseFloat(($('alloc-monetario') || {}).value) || 200;
  TS.fondo.ini     = _a.fondo;
  TS.fondo.men     = parseFloat(($('alloc-fondo')     || {}).value) || 100;
  wC(TS.monetario);
  calcCompound();
  renderGastos();
  renderObjetivos();
});

// ── Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch(e  => console.warn('SW failed:', e));
  });
}
