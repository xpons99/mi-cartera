// ── Objetivos ──
let selEmoji = OBJ_EMOJIS[0];
let selColor = OBJ_COLORS[0];

function renderObjetivos() {
  const list = $('obj-list');
  if (objetivos.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="ei">🎯</div><div>Añade tu primer objetivo</div></div>';
    return;
  }
  list.innerHTML = objetivos.map(obj => {
    const pct     = Math.min(100, (obj.current / obj.goal) * 100);
    const rem     = Math.max(0, obj.goal - obj.current);
    const mLeft   = obj.monthly > 0 ? Math.ceil(rem / obj.monthly) : 0;
    const yy      = Math.floor(mLeft / 12), mm = mLeft % 12;
    const timeStr = rem <= 0 ? '¡Conseguido!' : (yy > 0 ? `${yy}a ${mm}m` : `${mm} meses`);

    return `<div class="obj-card" data-id="${obj.id}">
      <div style="height:4px;background:${obj.color};position:absolute;top:0;left:0;right:0;border-radius:var(--rad) var(--rad) 0 0;"></div>
      <button class="obj-delete" onclick="delObj(${obj.id})">✕</button>
      <div style="margin-top:4px;display:flex;align-items:center;gap:6px;margin-bottom:2px;">
        <span style="font-size:1.4rem">${obj.emoji}</span>
        <input class="obj-name-input" value="${obj.name}" onchange="updateObj(${obj.id},'name',this.value)" />
      </div>
      <div class="obj-bar-t"><div class="obj-bar-f" style="width:${pct.toFixed(1)}%;background:${obj.color};"></div></div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div class="obj-pct" style="color:${obj.color}">${pct.toFixed(0)}%</div>
        <div style="text-align:right">
          <div style="font-size:0.85rem;font-weight:700">${fmt(obj.current)}</div>
          <div style="font-size:0.6rem;font-weight:500;color:var(--mu)">de ${fmt(obj.goal)}</div>
        </div>
      </div>
      <div class="obj-inputs">
        <div class="obj-input-group"><label>Objetivo (€)</label><div class="obj-input-row"><span class="u">€</span><input type="number" value="${obj.goal}" inputmode="decimal" onchange="updateObj(${obj.id},'goal',+this.value)" /></div></div>
        <div class="obj-input-group"><label>Ahorro mensual (€)</label><div class="obj-input-row"><span class="u">€</span><input type="number" value="${obj.monthly}" inputmode="decimal" onchange="updateObj(${obj.id},'monthly',+this.value)" /></div></div>
        <div class="obj-input-group"><label>Ahorro actual (€)</label><div class="obj-input-row"><span class="u">€</span><input type="number" value="${obj.current}" inputmode="decimal" onchange="updateObj(${obj.id},'current',+this.value)" /></div></div>
        <div class="obj-input-group"><label>Tiempo estimado</label><div style="font-size:0.95rem;font-weight:800;color:${obj.color};padding-top:4px">${timeStr}</div></div>
      </div>
    </div>`;
  }).join('');
}

function updateObj(id, field, val) {
  const o = objetivos.find(o => o.id === id);
  if (!o) return;
  o[field] = val;
  saveAll();
  renderObjetivos();
}

function delObj(id) {
  objetivos = objetivos.filter(o => o.id !== id);
  saveAll();
  renderObjetivos();
}

// ── Modal nuevo objetivo ──
function openObjModal() {
  selEmoji = OBJ_EMOJIS[0];
  selColor = OBJ_COLORS[0];
  $('obj-name').value    = '';
  $('obj-goal').value    = '';
  $('obj-monthly').value = '';
  $('obj-current').value = '0';
  renderObjEmojis();
  renderObjColors();
  $('objModalBg').classList.add('show');
}

function renderObjEmojis() {
  $('emojiGrid').innerHTML = OBJ_EMOJIS.map(e =>
    `<div class="emj${e === selEmoji ? ' sel' : ''}" onclick="selObjEmoji('${e}')">${e}</div>`
  ).join('');
}

function renderObjColors() {
  $('colorGrid').innerHTML = OBJ_COLORS.map(c =>
    `<div class="clr${c === selColor ? ' sel' : ''}" style="background:${c}" onclick="selObjColor('${c}')"></div>`
  ).join('');
}

function selObjEmoji(e) { selEmoji = e; renderObjEmojis(); }
function selObjColor(c) { selColor = c; renderObjColors(); }

function closeObjModal()    { $('objModalBg').classList.remove('show'); }
function closeObjMBg(e)     { if (e.target === $('objModalBg')) closeObjModal(); }

function addObjetivo() {
  const name = $('obj-name').value.trim();
  const goal = parseFloat($('obj-goal').value) || 0;
  if (!name || !goal) return;
  objetivos.push({
    id:      Date.now(),
    name,
    emoji:   selEmoji,
    color:   selColor,
    goal,
    monthly: parseFloat($('obj-monthly').value) || 0,
    current: parseFloat($('obj-current').value) || 0,
  });
  saveAll();
  closeObjModal();
  renderObjetivos();
}
