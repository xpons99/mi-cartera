// ── Persistencia localStorage ──
const SK = 'micartera_v2';

// alloc-gastos se excluye: se calcula automáticamente desde los gastos reales
const INPUTS = [
  'sueldoBase', 'extras', 'otros',
  'alloc-fondo', 'alloc-monetario', 'alloc-colchon',
  'c-inicial', 'c-mensual', 'c-tae', 'c-años',
];

function loadStore() {
  try { return JSON.parse(localStorage.getItem(SK) || '{}'); }
  catch (e) { return {}; }
}

function saveStore(d) {
  try { localStorage.setItem(SK, JSON.stringify(d)); }
  catch (e) { console.warn('Storage error:', e); }
}

function saveAll() {
  const d = loadStore();
  INPUTS.forEach(id => { const el = $(id); if (el) d['i_' + id] = el.value; });
  d.gastos    = gastos;
  d.objetivos = objetivos;
  d.assets    = assets;
  saveStore(d);
}

function loadInputs() {
  const d = loadStore();
  INPUTS.forEach(id => {
    const el = $(id);
    if (el && d['i_' + id] !== undefined) el.value = d['i_' + id];
  });
  const tr = $('c-tae-r'), ar = $('c-años-r');
  if (tr) tr.value = Math.min(parseFloat($('c-tae').value) || 2.5, 25);
  if (ar) ar.value = Math.min(parseInt($('c-años').value) || 4, 40);
  if (d.gastos)    gastos    = d.gastos;
  if (d.objetivos) objetivos = d.objetivos;

  if (d.assets) {
    assets = d.assets;
  } else {
    // Migración desde formato antiguo (a-monetario, a-fondo, etc.)
    const legacy = { 1: 'a-monetario', 2: 'a-fondo', 3: 'a-colchon', 4: 'a-oro', 5: 'a-btc', 6: 'a-corriente' };
    assets.forEach(a => {
      const key = 'i_' + legacy[a.id];
      if (d[key] !== undefined) a.value = parseFloat(d[key]) || 0;
    });
  }
}
