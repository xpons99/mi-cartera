// ── Importación universal CSV / XLSX ──
let csvParsed = [];

// ── OCR de tickets (Tesseract.js, lazy load) ──
function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseTicketText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);

  // Importe: busca línea con TOTAL / IMPORTE / A PAGAR y coge el número mayor de esa zona
  let amt = null;
  const totalRx = /(?:total|importe|a\s*pagar|sum|amount)[^\d\n]{0,12}(\d[\d\s]*[,.]\d{2})/i;
  const totalM  = text.match(totalRx);
  if (totalM) {
    amt = parseAmount(totalM[1].replace(/\s/g, ''));
  }
  // Fallback: mayor importe con decimales del texto
  if (!amt || isNaN(amt)) {
    const amounts = [...text.matchAll(/\b(\d{1,4}[,.]\d{2})\b/g)]
      .map(m => parseAmount(m[1])).filter(v => !isNaN(v) && v > 0 && v < 9999);
    if (amounts.length) amt = Math.max(...amounts);
  }

  // Fecha
  let date = null;
  const dateM = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dateM) {
    let y = parseInt(dateM[3]); if (y < 100) y += 2000;
    const d = new Date(y, parseInt(dateM[2]) - 1, parseInt(dateM[1]));
    if (!isNaN(d.getTime())) date = d;
  }

  // Descripción: primera línea con letras (nombre del comercio)
  const desc = lines.find(l => /[a-záéíóúñA-ZÁÉÍÓÚÑ]{3,}/.test(l) && !/^\d/.test(l)) || '';

  return { amt: amt || null, date, desc: desc.slice(0, 50) };
}

function openTicketScanner() {
  $('ticket-file').value = '';
  $('ticket-file').click();
}

async function handleTicketFile(file) {
  if (!file) return;
  const status = $('ticket-status');
  status.textContent = 'Cargando OCR…';
  status.className   = 'ticket-status loading';

  try {
    await loadTesseract();
    status.textContent = 'Analizando ticket…';
    const { data: { text } } = await Tesseract.recognize(file, 'spa+eng');
    const { amt, date, desc } = parseTicketText(text);

    if (amt)  { $('m-amt').value  = amt.toFixed(2); }
    if (desc) { $('m-desc').value = desc; selectedCat = guessCat(desc); renderModalCats(); }
    if (date) { $('m-date').value = date.toISOString().split('T')[0]; }

    if (amt) {
      status.textContent = `✓ Detectado: ${amt.toFixed(2)} €${desc ? ' · ' + desc : ''}`;
      status.className   = 'ticket-status ok';
    } else {
      status.textContent = 'No se detectó importe. Rellena manualmente.';
      status.className   = 'ticket-status warn';
    }
  } catch (e) {
    status.textContent = 'Error al procesar la imagen.';
    status.className   = 'ticket-status warn';
  }
}

// ── PDF.js (lazy load) ──
function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    s.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function parsePDF(file) {
  await loadPDFJS();
  const buffer = await file.arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buffer }).promise;

  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Agrupa items por posición Y para reconstruir líneas
    const byY = {};
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ x: item.transform[4], str: item.str });
    }
    const ys = Object.keys(byY).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const txt = byY[y].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim();
      if (txt) lines.push(txt);
    }
  }
  return parsePDFLines(lines);
}

function parsePDFLines(lines) {
  const results = [];
  const dateRx  = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/;
  // Importes con posible signo negativo y formato europeo o anglosajón
  const amtRx   = /[-−]\s*\d{1,6}(?:[.,]\d{3})*[.,]\d{2}/g;

  for (const line of lines) {
    const dateM = line.match(dateRx);
    if (!dateM) continue;

    const rawAmts = [...line.matchAll(amtRx)];
    if (rawAmts.length === 0) continue;

    const amt = Math.abs(parseAmount(rawAmts[0][0].replace(/\s/g, '')));
    if (!amt || isNaN(amt) || amt <= 0) continue;

    // Fecha
    let yr = parseInt(dateM[3]); if (yr < 100) yr += 2000;
    const d = new Date(yr, parseInt(dateM[2]) - 1, parseInt(dateM[1]));
    if (isNaN(d.getTime())) continue;

    // Descripción: texto entre la fecha y el primer importe
    const dateEnd  = line.indexOf(dateM[0]) + dateM[0].length;
    const firstAmt = line.search(/[-−]\s*\d{1,6}(?:[.,]\d{3})*[.,]\d{2}/);
    const desc = line
      .slice(dateEnd, firstAmt > dateEnd ? firstAmt : undefined)
      .replace(/\s+/g, ' ').trim().slice(0, 60) || 'Movimiento';

    results.push({ desc, amt, date: d.toISOString(), cat: guessCat(desc) });
  }

  // Deduplicar por fecha + importe + inicio de descripción
  const seen = new Set();
  return results.filter(g => {
    const k = g.date.slice(0, 10) + '|' + g.amt.toFixed(2) + '|' + g.desc.slice(0, 15);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ── SheetJS (lazy load) ──
function loadSheetJS() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── Modal ──
async function openCSVModal() {
  csvParsed = [];
  $('csv-file').value        = '';
  $('csv-preview').innerHTML = '';
  $('csv-import-btn').style.opacity       = '0.4';
  $('csv-import-btn').style.pointerEvents = 'none';
  $('csvModalBg').classList.add('show');
  // Carga SheetJS en background para que esté listo cuando el usuario elija un xlsx
  loadSheetJS().catch(() => {});
}

function closeCSVModal() { $('csvModalBg').classList.remove('show'); }
function closeCSVMBg(e)  { if (e.target === $('csvModalBg')) closeCSVModal(); }

// ── Parsing universal ──
function detectSeparator(text) {
  const sample = text.slice(0, 3000);
  const counts = {
    ';':  (sample.match(/;/g)  || []).length,
    ',':  (sample.match(/,/g)  || []).length,
    '\t': (sample.match(/\t/g) || []).length,
  };
  return Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b);
}

function splitRow(line, sep) {
  const result = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"')          { inQ = !inQ; }
    else if (ch === sep && !inQ) { result.push(cur.trim()); cur = ''; }
    else                     { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function detectColumns(headers) {
  const h = headers.map(s => String(s == null ? '' : s).toLowerCase().replace(/['"]/g, '').trim());
  const find = (...patterns) => h.findIndex(col => patterns.some(p => col.includes(p)));

  return {
    dateIdx:  find('fecha', 'date', 'data', 'started', 'completed', 'operaci', 'operació'),
    descIdx:  find('concepto', 'concept', 'descripci', 'description', 'detalle', 'texto', 'referencia',
                   'beneficiario', 'comercio', 'detall', 'narrativa'),
    movIdx:   find('movimiento', 'tipo operac', 'tipo de mov', 'categoria'),
    amtIdx:   find('importe', 'amount', 'cantidad', 'total'),
    cargoIdx: find('cargo', 'débito', 'debito', 'débits', 'outgo', 'salida', 'gasto'),
    abonoIdx: find('abono', 'crédito', 'credito', 'income', 'entrada', 'ingreso'),
  };
}

function parseAmount(str) {
  if (!str && str !== 0) return NaN;
  str = String(str).replace(/[€$£\s]/g, '').trim();
  if (!str) return NaN;
  // Formato europeo: 1.234,56
  if (/\d+\.\d{3},/.test(str) || (/,/.test(str) && /\./.test(str) && str.indexOf('.') < str.lastIndexOf(','))) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (/,/.test(str) && !/\./.test(str)) {
    str = str.replace(',', '.');
  }
  return parseFloat(str);
}

function parseAnyDate(str) {
  if (!str) return null;
  str = String(str).replace(/['"]/g, '').trim();
  // ISO: yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str); return isNaN(d.getTime()) ? null : d;
  }
  // Europeo: dd/mm/yyyy o dd-mm-yyyy
  const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m) {
    let y = parseInt(m[3]); if (y < 100) y += 2000;
    const d = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  // Fecha serial de Excel (número entero)
  if (/^\d{5}$/.test(str)) {
    const d = new Date((parseInt(str) - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str); return isNaN(d.getTime()) ? null : d;
}

// Conceptos genéricos de BBVA y otros bancos donde el Movimiento tiene más info
const _GENERIC_RX = /^(bizum|transferencia realizada|transferencia recibida|pago con tarjeta|domiciliaci|adeudo sepa|nom[ií]na)$/i;

function rowsToGastos(rows) {
  if (rows.length < 2) return [];

  // Busca la cabecera real: primera fila con ≥ 2 celdas de texto no numéricas
  let headerIdx = 0;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r      = (rows[i] || []).map(c => String(c == null ? '' : c).trim());
    const nonNum = r.filter(c => c !== '' && isNaN(parseFloat(c.replace(',', '.'))));
    if (r.filter(c => c !== '').length >= 2 && nonNum.length >= 2) { headerIdx = i; break; }
  }

  const headers = rows[headerIdx] || [];
  const { dateIdx, descIdx, movIdx, amtIdx, cargoIdx, abonoIdx } = detectColumns(headers);
  const results = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 2) continue;

    // Importe: cargo > importe negativo > fallback negativo
    let amt;
    if (cargoIdx >= 0 && cols[cargoIdx] !== '' && cols[cargoIdx] != null) {
      amt = parseAmount(cols[cargoIdx]);
      if (isNaN(amt) || amt <= 0) continue;
    } else if (amtIdx >= 0) {
      amt = parseAmount(cols[amtIdx]);
      if (isNaN(amt)) continue;
      if (amt >= 0) continue; // ignorar ingresos
      amt = Math.abs(amt);
    } else {
      let found = false;
      for (let j = 0; j < cols.length; j++) {
        const v = parseAmount(cols[j]);
        if (!isNaN(v) && v < 0) { amt = Math.abs(v); found = true; break; }
      }
      if (!found) continue;
    }

    // Fecha
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : '';
    const d = parseAnyDate(rawDate);
    if (!d) continue;

    // Descripción: Concepto como principal; si es genérico (BBVA: BIZUM, TRANSFERENCIA…)
    // usa la columna Movimiento que tiene el detalle real ("RECIBIDO: Horchata")
    let desc = (descIdx >= 0 ? String(cols[descIdx] || '') : String(cols[1] || ''))
      .replace(/"/g, '').trim();
    if (movIdx >= 0 && cols[movIdx] != null) {
      const mov = String(cols[movIdx]).replace(/"/g, '').trim();
      if (mov && (_GENERIC_RX.test(desc) || !desc)) desc = mov;
    }

    results.push({ desc, amt, date: d.toISOString(), cat: guessCat(desc) });
  }
  return results;
}

function parseCSV(text) {
  const sep  = detectSeparator(text);
  const lines = text.split('\n').map(l => l.replace(/\r$/, '').trim()).filter(l => l);
  const rows  = lines.map(l => splitRow(l, sep));
  return rowsToGastos(rows); // la detección de cabecera ya está en rowsToGastos
}

async function parseXLSX(file) {
  await loadSheetJS();
  const buffer = await file.arrayBuffer();
  const wb     = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws     = wb.Sheets[wb.SheetNames[0]];
  const data   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  return rowsToGastos(data);
}

async function parseFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return await parseXLSX(file);
  if (name.endsWith('.pdf'))                           return await parsePDF(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(parseCSV(e.target.result));
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

// ── Categorías automáticas ──
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

// ── Preview ──
async function handleFileChange(file) {
  if (!file) return;
  $('csv-preview').innerHTML = '<div style="font-size:0.75rem;color:var(--mu);padding:8px">Analizando archivo…</div>';
  try {
    csvParsed = await parseFile(file);
    showCSVPreview();
  } catch (e) {
    $('csv-preview').innerHTML = `<div style="font-size:0.75rem;font-weight:500;color:var(--re);background:#FEF2F2;border-radius:10px;padding:10px">Error al leer el archivo: ${e.message || e}</div>`;
  }
}

function showCSVPreview() {
  if (csvParsed.length === 0) {
    $('csv-preview').innerHTML = '<div style="font-size:0.75rem;font-weight:500;color:var(--re);background:#FEF2F2;border-radius:10px;padding:10px">No se encontraron gastos. Comprueba que el archivo contiene movimientos con importes negativos o columna de cargos.</div>';
    return;
  }
  $('csv-import-btn').style.opacity       = '1';
  $('csv-import-btn').style.pointerEvents = 'auto';
  const total = csvParsed.reduce((s, g) => s + g.amt, 0);
  $('csv-preview').innerHTML = `
    <div style="background:#ECFDF5;border-radius:10px;padding:10px;font-size:0.75rem;font-weight:600;color:#059669">
      ✓ ${csvParsed.length} gastos detectados · Total: ${fmt(total)}
    </div>
    <div style="max-height:130px;overflow-y:auto;margin-top:8px;display:flex;flex-direction:column;gap:3px">
      ${csvParsed.slice(0, 6).map(g => {
        const cat = CATS.find(c => c.id === g.cat) || CATS[CATS.length - 1];
        const d   = new Date(g.date);
        return `<div style="display:flex;justify-content:space-between;align-items:center;font-size:0.7rem;padding:4px 0;border-bottom:1px solid var(--b1)">
          <span>${cat.icon} ${g.desc.slice(0, 28)}</span>
          <span style="font-weight:700;color:var(--mu);flex-shrink:0;margin-left:6px">${d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span>
          <span style="font-weight:700;color:var(--re);flex-shrink:0;margin-left:6px">-${fmt(g.amt)}</span>
        </div>`;
      }).join('')}
      ${csvParsed.length > 6 ? `<div style="font-size:0.68rem;color:var(--mu);text-align:center;padding:4px">…y ${csvParsed.length - 6} más</div>` : ''}
    </div>`;
}

// ── Importar ──
function importCSV() {
  if (csvParsed.length === 0) return;
  const existing = new Set(gastos.map(g => g.desc + '|' + g.amt.toFixed(2) + '|' + g.date.slice(0, 10)));
  let added = 0;
  csvParsed.forEach(g => {
    const key = g.desc + '|' + g.amt.toFixed(2) + '|' + g.date.slice(0, 10);
    if (!existing.has(key)) {
      gastos.unshift({ id: Date.now() + Math.random(), cat: g.cat, desc: g.desc, amt: g.amt, date: g.date });
      existing.add(key); added++;
    }
  });
  gastos.sort((a, b) => new Date(b.date) - new Date(a.date));
  saveAll(); updateAll(); renderGastos(); closeCSVModal();
  const btn = $('nav-gastos');
  if (btn) {
    const orig = btn.querySelector('span').textContent;
    btn.querySelector('span').textContent = `+${added}`;
    setTimeout(() => btn.querySelector('span').textContent = orig, 2000);
  }
}

// ── Exportar CSV del mes seleccionado ──
function exportGastos() {
  const mes   = getGastosMes();
  const label = monthLabel ? monthLabel() : 'mes';
  if (mes.length === 0) {
    alert('No hay gastos en ' + label + ' para exportar.');
    return;
  }
  const rows = [
    ['Fecha', 'Descripción', 'Categoría', 'Importe (€)'],
    ...mes.map(g => {
      const cat = CATS.find(c => c.id === g.cat) || CATS[CATS.length - 1];
      return [
        new Date(g.date).toLocaleDateString('es-ES'),
        g.desc,
        cat.name,
        g.amt.toFixed(2).replace('.', ','),
      ];
    }),
  ];
  const csv  = '﻿' + rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `gastos_${selectedMonth.year}_${String(selectedMonth.month + 1).padStart(2, '0')}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
