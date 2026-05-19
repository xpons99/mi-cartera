// ── Simulador de interés compuesto ──
const TS = {
  monetario: { ini: null, men: null, tae: 2.5,  años: 4  },
  fondo:     { ini: null, men: null, tae: 10,   años: 10 },
  custom:    { ini: null, men: null, tae: null,  años: null },
};
let actTab = 'monetario';

function rC() {
  return {
    ini:  parseFloat($('c-inicial').value) || 0,
    men:  parseFloat($('c-mensual').value) || 0,
    tae:  parseFloat($('c-tae').value)     || 0,
    años: parseInt($('c-años').value)      || 1,
  };
}

function wC(s) {
  $('c-inicial').value  = s.ini;
  $('c-mensual').value  = s.men;
  $('c-tae').value      = s.tae;
  $('c-tae-r').value    = Math.min(s.tae, 25);
  $('c-años').value     = s.años;
  $('c-años-r').value   = Math.min(s.años, 40);
}

function setCalcTab(t) {
  TS[actTab] = rC();
  document.querySelectorAll('.ctab').forEach(b => b.classList.remove('on'));
  $('ctab-' + t).classList.add('on');
  actTab = t;

  const a  = getA();
  const aM = parseFloat(($('alloc-monetario') || {}).value) || 1000;
  const aF = parseFloat(($('alloc-fondo')     || {}).value) || 250;

  if (t === 'monetario') {
    if (TS.monetario.ini === null) TS.monetario.ini = a.monetario;
    if (TS.monetario.men === null) TS.monetario.men = aM;
  } else if (t === 'fondo') {
    if (TS.fondo.ini === null) TS.fondo.ini = a.fondo;
    if (TS.fondo.men === null) TS.fondo.men = aF;
  } else {
    const c = rC();
    if (TS.custom.ini  === null) TS.custom.ini  = c.ini;
    if (TS.custom.men  === null) TS.custom.men  = c.men;
    if (TS.custom.tae  === null) TS.custom.tae  = c.tae  || 5;
    if (TS.custom.años === null) TS.custom.años = c.años || 10;
  }
  wC(TS[t]);
  calcCompound();
}

function onCI()         { TS[actTab] = rC(); calcCompound(); saveAll(); }
function syncTAE(v)     { $('c-tae').value   = parseFloat(v).toFixed(1); onCI(); }
function syncTAER(v)    { $('c-tae-r').value = Math.min(v, 25); onCI(); }
function syncAños(v)    { $('c-años').value  = v; onCI(); }
function syncAñosR(v)   { $('c-años-r').value = Math.min(v, 40); onCI(); }

function calcCompound() {
  const ini  = parseFloat($('c-inicial').value) || 0;
  const men  = parseFloat($('c-mensual').value) || 0;
  const tae  = parseFloat($('c-tae').value)     || 0;
  const años = parseInt($('c-años').value)       || 1;
  const r    = tae / 100 / 12;
  const meses = años * 12;
  const lbs = [], cap = [], apt = [];

  for (let m = 0; m <= meses; m++) {
    let v = ini * Math.pow(1 + r, m);
    if (r > 0) v += men * ((Math.pow(1 + r, m) - 1) / r);
    else v += men * m;
    if (m % 12 === 0) {
      lbs.push('Año ' + (m / 12));
      cap.push(parseFloat(v.toFixed(2)));
      apt.push(parseFloat((ini + men * m).toFixed(2)));
    }
  }

  const fv = cap[cap.length - 1];
  const ta = ini + men * meses;
  const it = fv - ta;
  const rp = ta > 0 ? ((fv / ta - 1) * 100) : 0;

  $('c-resultado').textContent = fmt(fv);
  $('c-ini-out').textContent   = fmt(ini);
  $('c-aportado').textContent  = fmt(ta);
  $('c-intereses').textContent = '+' + fmt(it);
  $('c-rentpct').textContent   = '+' + rp.toFixed(1) + '%';

  drawChart(lbs, cap, apt);
}

function drawChart(lbs, cap, apt) {
  if (!lbs) { calcCompound(); return; }
  const cv = $('compChart'); if (!cv) return;

  const dpr = window.devicePixelRatio || 1;
  const W   = cv.parentElement.clientWidth;
  const H   = 180;
  cv.width  = W * dpr; cv.height = H * dpr;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';

  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const mxV = Math.max(...cap) || 1;
  const pad = { t: 10, r: 12, b: 26, l: 50 };
  const cw  = W - pad.l - pad.r;
  const ch  = H - pad.t - pad.b;
  ctx.clearRect(0, 0, W, H);

  const xs = lbs.map((_, i) => pad.l + (i / (lbs.length - 1 || 1)) * cw);
  const yF = v => pad.t + ch - (v / mxV) * ch;

  // Grid
  ctx.strokeStyle = 'rgba(0,0,0,0.05)'; ctx.lineWidth = 1;
  for (let g = 0; g <= 4; g++) {
    const y = pad.t + (g / 4) * ch;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cw, y); ctx.stroke();
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '600 9px Plus Jakarta Sans,system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(fmtK(mxV * (1 - g / 4)), pad.l - 4, y + 3);
  }

  // Areas
  const area = (d, col) => {
    ctx.beginPath();
    xs.forEach((x, i) => i === 0 ? ctx.moveTo(x, yF(d[i])) : ctx.lineTo(x, yF(d[i])));
    ctx.lineTo(xs[xs.length - 1], pad.t + ch); ctx.lineTo(xs[0], pad.t + ch);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  };
  area(apt, 'rgba(37,99,235,0.08)');
  area(cap, 'rgba(16,185,129,0.1)');

  // Lines
  const line = (d, col, dash) => {
    ctx.beginPath();
    xs.forEach((x, i) => i === 0 ? ctx.moveTo(x, yF(d[i])) : ctx.lineTo(x, yF(d[i])));
    ctx.strokeStyle = col;
    if (dash) ctx.setLineDash([4, 4]);
    ctx.lineWidth = dash ? 1.5 : 2.5; ctx.stroke(); ctx.setLineDash([]);
  };
  line(apt, '#2563EB', true);
  line(cap, '#10B981', false);

  // Dots
  xs.forEach((x, i) => {
    ctx.beginPath(); ctx.arc(x, yF(cap[i]), 4, 0, Math.PI * 2);
    ctx.fillStyle = '#10B981'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, yF(cap[i]), 2, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '600 9px Plus Jakarta Sans,system-ui';
  ctx.textAlign = 'center';
  lbs.forEach((l, i) => ctx.fillText(l, xs[i], pad.t + ch + 15));

  // Legend
  ctx.fillStyle = '#10B981'; ctx.fillRect(pad.l, H - 7, 10, 2.5);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '600 9px Plus Jakarta Sans,system-ui';
  ctx.textAlign = 'left'; ctx.fillText('Capital', pad.l + 14, H - 4);
  ctx.fillStyle = '#2563EB'; ctx.fillRect(pad.l + 62, H - 7, 10, 2.5);
  ctx.fillText('Aportado', pad.l + 76, H - 4);
}
