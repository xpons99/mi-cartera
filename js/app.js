// ── Activos: helpers ──
function getAssetTotal()       { return assets.reduce((s, a) => s + (a.value || 0), 0); }
function getAssetByType(type)  { return assets.filter(a => a.type === type).reduce((s, a) => s + (a.value || 0), 0); }

function drawPatCard() {
  const tot = getAssetTotal();
  const liq = getAssetByType('liq');
  const inv = getAssetByType('inv');
  const alt = getAssetByType('alt');
  if ($('pat-total')) $('pat-total').textContent = fmt(tot);
  if ($('pat-inv'))   $('pat-inv').textContent   = fmtK(inv);
  if ($('pat-liq'))   $('pat-liq').textContent   = fmtK(liq);
  if ($('pat-alt'))   $('pat-alt').textContent   = fmtK(alt);
}

function drawDonut() {
  const cv = $('donutCanvas'); if (!cv) return;
  const tot = getAssetTotal();
  const dpr = window.devicePixelRatio || 1;
  const sz  = Math.min(cv.parentElement.clientWidth * 0.5, 170);
  cv.width  = sz * dpr; cv.height = sz * dpr;
  cv.style.width = sz + 'px'; cv.style.height = sz + 'px';

  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cx  = sz / 2, cy = sz / 2, r = sz * 0.44, inn = sz * 0.28;
  let st = -Math.PI / 2;
  ctx.clearRect(0, 0, sz, sz);
  if (!tot) return;

  assets.forEach((a, i) => {
    if (!a.value) return;
    const col = ASSET_PALETTE[i % ASSET_PALETTE.length];
    const ang = (a.value / tot) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, st, st + ang);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    st += ang;
  });
  ctx.beginPath(); ctx.arc(cx, cy, inn, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
  $('donut-total').textContent = fmtK(tot);

  const leg = $('donut-legend'); leg.innerHTML = '';
  assets.forEach((a, i) => {
    if (!a.value) return;
    const col = ASSET_PALETTE[i % ASSET_PALETTE.length];
    const pct = ((a.value / tot) * 100).toFixed(1);
    leg.innerHTML += `<div class="dl-item">
      <div class="dl-l"><div class="dl-dot" style="background:${col}"></div><span class="dl-name">${a.name}</span></div>
      <div class="dl-r"><span class="dl-pct">${pct}%</span><span class="dl-val">${fmtK(a.value)}</span></div>
    </div>`;
  });
}

// ── Tooltip de la barra de distribución ──
function showSegInfo(key) {
  const s = parseFloat($('sueldoBase').value) || 0;
  const e = parseFloat($('extras').value)     || 0;
  const o = parseFloat($('otros').value)      || 0;
  const total = s + e + o;

  const f = parseFloat($('alloc-fondo').value)     || 0;
  const m = parseFloat($('alloc-monetario').value) || 0;
  const c = parseFloat($('alloc-colchon').value)   || 0;
  const realGastos = getCurrentMonthGastos().reduce((s, g) => s + g.amt, 0);
  const libre = Math.max(0, total - (f + m + c) - realGastos);

  const segs = {
    f: { name: 'MSCI World',      val: f,          color: 'var(--pu)' },
    m: { name: 'Fondo monetario', val: m,          color: 'var(--bl)' },
    g: { name: 'Gastos reales',   val: realGastos, color: 'var(--or)' },
    c: { name: 'Colchón',         val: c,          color: 'var(--gr)' },
    l: { name: 'Libre',           val: libre,      color: '#9CA3AF'   },
  };

  const seg  = segs[key];
  const info = $('dbar-info');
  if (!seg || seg.val <= 0) return;

  if (info.dataset.active === key) {
    info.innerHTML = ''; info.dataset.active = ''; return;
  }
  info.dataset.active = key;
  const pct = total > 0 ? (seg.val / total * 100).toFixed(1) : '0.0';
  info.innerHTML = `<div class="dbar-tooltip" style="--tc:${seg.color}">
    <div class="dbar-tt-dot"></div>
    <span class="dbar-tt-name">${seg.name}</span>
    <span class="dbar-tt-val">${fmt(seg.val)}</span>
    <span class="dbar-tt-pct">${pct}%</span>
  </div>`;
}

// ── Ingresos ──
function calcIngresos() {
  const s = parseFloat($('sueldoBase').value) || 0;
  const e = parseFloat($('extras').value)     || 0;
  const o = parseFloat($('otros').value)      || 0;
  const total = s + e + o;
  $('totalIngresos').textContent = fmt(total);
  updateDist(total);
  updateAll();
  saveAll();
}

// ── Distribución mensual ──
// "Dinero libre" = ingresos - (fondo + monetario + colchón) - gastos reales.
// "Tasa ahorro"  = (ingresos - gastos reales) / ingresos  (% no gastado).
function updateDist(total) {
  if (total === undefined) {
    const s = parseFloat($('sueldoBase').value) || 0;
    const e = parseFloat($('extras').value)     || 0;
    const o = parseFloat($('otros').value)      || 0;
    total = s + e + o;
  }

  const f = parseFloat($('alloc-fondo').value)     || 0;
  const m = parseFloat($('alloc-monetario').value) || 0;
  const c = parseFloat($('alloc-colchon').value)   || 0;

  // Gastos reales del mes actual (siempre mes en curso, no el mes seleccionado)
  const realGastos = getCurrentMonthGastos().reduce((s, g) => s + g.amt, 0);

  const gg = $('alloc-gastos');
  if (gg) gg.value = realGastos.toFixed(0);

  const libre = total - (f + m + c) - realGastos;

  const setB = (el, v) => {
    if (!el) return;
    if (v < 0) { el.textContent = fmt(Math.abs(v)) + ' excedido'; el.className = 'bov'; }
    else       { el.textContent = '+' + fmt(v) + ' libre';        el.className = 'bok'; }
  };
  setB($('allocBadge'), libre);

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

  const tasa      = total > 0 ? Math.max(0, (total - realGastos) / total * 100) : 0;
  const ahorroEur = Math.max(0, total - realGastos);
  $('m-tasa').textContent     = tasa.toFixed(0) + '%';
  const sub = $('m-tasa-sub');
  if (sub) sub.textContent = fmt(ahorroEur) + ' ahorrado';

  saveAll();
}

// ── Actualizar todo ──
function updateAll() {
  const tot = getAssetTotal();
  const liq = getAssetByType('liq');
  const inv = getAssetByType('inv');

  $('m-total').textContent = fmtK(tot);
  $('m-inv').textContent   = fmtK(inv);
  $('m-liq').textContent   = fmtK(liq);

  drawPatCard();
  drawDonut();
  updateGastosInicio();
  updateDist();
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
  ['sueldoBase', 'extras', 'otros'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', calcIngresos);
  });
  ['alloc-fondo', 'alloc-monetario', 'alloc-colchon'].forEach(id => {
    const el = $(id); if (el) el.addEventListener('input', () => updateDist());
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
  renderActivos();
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
