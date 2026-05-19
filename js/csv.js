// ── Importación CSV ──
let csvBank   = 'bbva';
let csvParsed = [];

const CSV_HELP = {
  bbva:    'En la app BBVA: Movimientos → Filtrar → Exportar → CSV. El archivo se llama algo como "movimientos.csv".',
  revolut: 'En Revolut: Cuenta → Extractos → Selecciona periodo → Descargar CSV.',
};

function openCSVModal() {
  csvParsed = [];
  $('csv-file').value        = '';
  $('csv-preview').innerHTML = '';
  $('csv-import-btn').style.opacity       = '0.4';
  $('csv-import-btn').style.pointerEvents = 'none';
  selBank('bbva');
  $('csvModalBg').classList.add('show');
}

function closeCSVModal()  { $('csvModalBg').classList.remove('show'); }
function closeCSVMBg(e)   { if (e.target === $('csvModalBg')) closeCSVModal(); }

function selBank(b) {
  csvBank = b;
  ['bbva', 'revolut'].forEach(id => { $('csv-' + id).classList.toggle('on', id === b); });
  $('csv-help').textContent = CSV_HELP[b];
}

// ── Parsers ──
function parseBBVA(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(l => l);
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols   = lines[i].split(';');
    if (cols.length < 3) continue;
    const dateStr = cols[0].trim();
    const desc    = cols[1] ? cols[1].trim() : '';
    const amtStr  = cols[2] ? cols[2].replace(/\./g, '').replace(',', '.').trim() : '0';
    const amt     = parseFloat(amtStr);
    if (isNaN(amt) || amt >= 0) continue;
    const d = parseDateES(dateStr);
    if (!d) continue;
    results.push({ desc, amt: Math.abs(amt), date: d.toISOString(), cat: guessCat(desc) });
  }
  return results;
}

function parseRevolut(text) {
  const lines   = text.split('\n').map(l => l.trim()).filter(l => l);
  const results = [];
  let headerIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('description')) { headerIdx = i; break; }
  }
  const header  = lines[headerIdx].split(',').map(h => h.toLowerCase().replace(/"/g, '').trim());
  const descIdx = header.indexOf('description');
  const amtIdx  = header.findIndex(h => h === 'amount');
  const dateIdx = header.findIndex(h => h.includes('completed') || h.includes('started'));

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length <= Math.max(descIdx, amtIdx, dateIdx)) continue;
    const desc   = (cols[descIdx] || '').replace(/"/g, '').trim();
    const amtStr = (cols[amtIdx]  || '').replace(/"/g, '').trim();
    const amt    = parseFloat(amtStr);
    if (isNaN(amt) || amt >= 0) continue;
    const dateRaw = (cols[dateIdx] || '').replace(/"/g, '').trim();
    const d       = new Date(dateRaw);
    if (isNaN(d.getTime())) continue;
    results.push({ desc, amt: Math.abs(amt), date: d.toISOString(), cat: guessCat(desc) });
  }
  return results;
}

function splitCSVLine(line) {
  const result = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"')             { inQ = !inQ; }
    else if (line[i] === ',' && !inQ){ result.push(cur); cur = ''; }
    else                             { cur += line[i]; }
  }
  result.push(cur); return result;
}

function parseDateES(str) {
  const m = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let y = parseInt(m[3]); if (y < 100) y += 2000;
  const d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
  return isNaN(d.getTime()) ? null : d;
}

function guessCat(desc) {
  const d = desc.toLowerCase();
  if (/mercadona|lidl|aldi|carrefour|supermercado|supermarket|eroski|consum|dia |hipercor|alcampo/.test(d))       return 'alim';
  if (/renfe|metro|bus|taxi|uber|cabify|gasolina|parking|peaje|autobus|tren|avion|ryanair|vueling|iberia/.test(d)) return 'trans';
  if (/netflix|spotify|amazon prime|hbo|disney|cine|teatro|juego|steam|ps4|ps5|xbox/.test(d))                      return 'ocio';
  if (/farmacia|medico|hospital|doctor|clinica|dentista|seguro|sanitas|adeslas/.test(d))                           return 'salud';
  if (/zara|hm|h&m|mango|primark|ropa|adidas|nike|decathlon/.test(d))                                             return 'ropa';
  if (/ikea|leroy|bricomart|hogar|electricidad|agua|gas |comunidad|alquiler|hipoteca/.test(d))                    return 'hogar';
  if (/restaurante|bar |cafeter|mcdonald|burger|pizza|kebab|sushi|just.eat|glovo|deliveroo|uber.eat/.test(d))     return 'restaur';
  return 'otros2';
}

// ── Preview e importación ──
function showCSVPreview() {
  if (csvParsed.length === 0) {
    $('csv-preview').innerHTML = '<div style="font-size:0.75rem;font-weight:500;color:var(--re);background:#FEF2F2;border-radius:10px;padding:10px">No se encontraron gastos en el archivo. Comprueba que es el formato correcto.</div>';
    return;
  }
  $('csv-import-btn').style.opacity       = '1';
  $('csv-import-btn').style.pointerEvents = 'auto';
  const total = csvParsed.reduce((s, g) => s + g.amt, 0);
  $('csv-preview').innerHTML = `
    <div style="background:#ECFDF5;border-radius:10px;padding:10px;font-size:0.75rem;font-weight:600;color:#059669">
      ✓ ${csvParsed.length} gastos encontrados · Total: ${fmt(total)}
      <div style="margin-top:4px;font-weight:500;color:var(--mu)">Se importarán solo los gastos (cargos negativos)</div>
    </div>
    <div style="max-height:120px;overflow-y:auto;margin-top:8px;display:flex;flex-direction:column;gap:3px">
      ${csvParsed.slice(0, 5).map(g => {
        const cat = CATS.find(c => c.id === g.cat) || CATS[CATS.length - 1];
        return `<div style="display:flex;justify-content:space-between;font-size:0.7rem;padding:4px 0;border-bottom:1px solid var(--b1)">
          <span>${cat.icon} ${g.desc.slice(0, 30)}</span>
          <span style="font-weight:700;color:var(--re)">-${fmt(g.amt)}</span>
        </div>`;
      }).join('')}
      ${csvParsed.length > 5 ? `<div style="font-size:0.68rem;color:var(--mu);text-align:center;padding:4px">...y ${csvParsed.length - 5} más</div>` : ''}
    </div>`;
}

function importCSV() {
  if (csvParsed.length === 0) return;
  const existing = new Set(gastos.map(g => g.desc + '|' + g.amt + '|' + g.date.slice(0, 10)));
  let added = 0;
  csvParsed.forEach(g => {
    const key = g.desc + '|' + g.amt + '|' + g.date.slice(0, 10);
    if (!existing.has(key)) {
      gastos.unshift({ id: Date.now() + Math.random(), cat: g.cat, desc: g.desc, amt: g.amt, date: g.date });
      existing.add(key);
      added++;
    }
  });
  gastos.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveAll();
  updateAll();
  renderGastos();
  closeCSVModal();
  const btn = $('nav-gastos');
  if (btn) {
    const orig = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = `+${added}`;
    setTimeout(() => btn.querySelector('span').textContent = orig, 2000);
  }
}
