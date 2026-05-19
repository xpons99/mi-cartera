// ── Gastos ──
let selectedCat = CATS[0].id;

function getGastosMes() {
  const now = new Date();
  return gastos.filter(g => {
    const d = new Date(g.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

function updateGastosInicio() {
  const mes   = getGastosMes();
  const total = mes.reduce((s, g) => s + g.amt, 0);

  $('gi-total').textContent = fmt(total);
  $('gi-count').textContent = mes.length;

  const bycat = {};
  CATS.forEach(c => { bycat[c.id] = 0; });
  mes.forEach(g => { if (bycat[g.cat] !== undefined) bycat[g.cat] += g.amt; });
  const active = CATS.filter(c => bycat[c.id] > 0);

  $('gi-bar').innerHTML = active.map(c =>
    `<div class="gi-seg" style="width:${total > 0 ? (bycat[c.id] / total * 100).toFixed(1) : 0}%;background:${c.color}"></div>`
  ).join('');

  const cats = $('gi-cats');
  if (active.length === 0) {
    cats.innerHTML = '<div class="gi-empty">Sin gastos este mes</div>';
  } else {
    cats.innerHTML = active
      .sort((a, b) => bycat[b.id] - bycat[a.id])
      .slice(0, 4)
      .map(c => {
        const v   = bycat[c.id];
        const pct = total > 0 ? (v / total * 100).toFixed(0) : 0;
        return `<div class="gi-row">
          <div class="gi-left"><div class="gi-dot" style="background:${c.color}"></div><span class="gi-name">${c.icon} ${c.name}</span></div>
          <div class="gi-right"><div class="gi-val">${fmt(v)}</div><div class="gi-pct">${pct}%</div></div>
        </div>`;
      }).join('');
  }

  const gastosMesInput = $('gastosMes');
  if (gastosMesInput) gastosMesInput.value = total.toFixed(0);
}

// ── Modal añadir gasto ──
function openModal() {
  selectedCat = CATS[0].id;
  renderModalCats();
  $('m-desc').value = '';
  $('m-amt').value  = '';
  $('modalBg').classList.add('show');
  setTimeout(() => $('m-desc').focus(), 150);
}

function closeModal()    { $('modalBg').classList.remove('show'); }
function closeMBg(e)     { if (e.target === $('modalBg')) closeModal(); }

function renderModalCats() {
  $('modalCats').innerHTML = CATS.map(c =>
    `<div class="mcat${c.id === selectedCat ? ' sel' : ''}" onclick="selCat('${c.id}')">
       <span class="mcat-icon">${c.icon}</span>
       <div class="mcat-name">${c.name}</div>
     </div>`
  ).join('');
}

function selCat(id) { selectedCat = id; renderModalCats(); }

function addGasto() {
  const amt = parseFloat($('m-amt').value);
  if (!amt || amt <= 0) return;
  const desc = $('m-desc').value.trim() || CATS.find(c => c.id === selectedCat).name;
  gastos.unshift({ id: Date.now(), cat: selectedCat, desc, amt, date: new Date().toISOString() });
  saveAll();
  updateAll();
  renderGastos();
  closeModal();
}

function delGasto(id) {
  gastos = gastos.filter(g => g.id !== id);
  saveAll();
  updateAll();
  renderGastos();
}

// ── Pantalla de gastos ──
function renderGastos() {
  const mes      = getGastosMes();
  const totalMes = mes.reduce((s, g) => s + g.amt, 0);

  $('gastos-resumen').innerHTML = `
    <div class="card"><div class="cp" style="display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--mu);margin-bottom:3px">Total este mes</div>
        <div style="font-size:2rem;font-weight:800;color:var(--re);letter-spacing:-0.03em">${fmt(totalMes)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.55rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--mu);margin-bottom:3px">Movimientos</div>
        <div style="font-size:1.5rem;font-weight:800">${mes.length}</div>
      </div>
    </div></div>`;

  const bycat  = {};
  CATS.forEach(c => { bycat[c.id] = 0; });
  mes.forEach(g => { if (bycat[g.cat] !== undefined) bycat[g.cat] += g.amt; });
  const active = CATS.filter(c => bycat[c.id] > 0).sort((a, b) => bycat[b.id] - bycat[a.id]);

  $('cats-container').innerHTML = active.length > 0
    ? `<div class="gastos-total">${active.map(c => {
        const v   = bycat[c.id];
        const pct = totalMes > 0 ? (v / totalMes * 100).toFixed(0) : 0;
        return `<div class="gt-row">
          <div class="gt-left"><div class="gt-dot" style="background:${c.color}"></div><span class="gt-name">${c.icon} ${c.name}</span></div>
          <div style="text-align:right"><div class="gt-val">${fmt(v)}</div><div class="gt-pct">${pct}%</div></div>
        </div>`;
      }).join('')}</div>`
    : '<div class="empty-state"><div class="ei">📊</div><div>Sin gastos este mes</div></div>';

  $('txn-list').innerHTML = gastos.length === 0
    ? '<div class="empty-state"><div class="ei">💸</div><div>Añade tu primer gasto</div></div>'
    : gastos.slice(0, 40).map(g => {
        const cat = CATS.find(c => c.id === g.cat) || CATS[CATS.length - 1];
        const d   = new Date(g.date);
        return `<div class="txn">
          <div class="txn-l">
            <div class="txn-icon">${cat.icon}</div>
            <div>
              <div class="txn-desc">${g.desc}</div>
              <div class="txn-cat">${cat.name} · ${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</div>
            </div>
          </div>
          <div class="txn-r">
            <div class="txn-amt">-${fmtD(g.amt)}</div>
            <button class="txn-del" onclick="delGasto(${g.id})">✕</button>
          </div>
        </div>`;
      }).join('');
}
