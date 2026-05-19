// ── Activos dinámicos ──
let _selAssetType = 'liq';

function _assetColor(index) {
  return ASSET_PALETTE[index % ASSET_PALETTE.length];
}

function renderActivos() {
  const list = $('asset-list');
  if (!list) return;
  list.innerHTML = '';
  assets.forEach((a, i) => {
    const col     = _assetColor(i);
    const typeLbl = ASSET_TYPE_LABELS[a.type] || a.type;
    list.innerHTML += `
      <div class="arow" style="--ac:${col}">
        <div class="ainfo">
          <input class="aname-input" value="${a.name.replace(/"/g,'&quot;')}" onchange="updateAssetField(${a.id},'name',this.value)">
          <div class="asub">${typeLbl}</div>
          <div class="atae">
            <input type="number" value="${a.rate || 0}" step="0.1" inputmode="decimal" onchange="updateAssetField(${a.id},'rate',parseFloat(this.value)||0)">
            <span>% rent.</span>
          </div>
        </div>
        <div class="aright">
          <input class="aval" type="number" value="${a.value || 0}" inputmode="decimal" oninput="onAssetValue(${a.id},this.value)">
          <button class="asset-del" onclick="delAsset(${a.id})">✕</button>
        </div>
      </div>`;
  });
}

function onAssetValue(id, val) {
  const a = assets.find(x => x.id === id);
  if (a) { a.value = parseFloat(val) || 0; updateAll(); }
}

function updateAssetField(id, field, val) {
  const a = assets.find(x => x.id === id);
  if (a) { a[field] = val; saveAll(); }
}

function delAsset(id) {
  assets = assets.filter(x => x.id !== id);
  renderActivos();
  updateAll();
}

function openAssetModal() {
  _selAssetType = 'liq';
  $('new-asset-name').value = '';
  $('new-asset-rate').value = '0';
  document.querySelectorAll('.atype-btn').forEach(b => b.classList.toggle('sel', b.dataset.type === 'liq'));
  $('assetModalBg').classList.add('show');
}

function closeAssetModal() { $('assetModalBg').classList.remove('show'); }
function closeAssetMBg(e)  { if (e.target === $('assetModalBg')) closeAssetModal(); }

function selAssetType(t) {
  _selAssetType = t;
  document.querySelectorAll('.atype-btn').forEach(b => b.classList.toggle('sel', b.dataset.type === t));
}

function addAsset() {
  const name = ($('new-asset-name').value || '').trim();
  if (!name) { $('new-asset-name').focus(); return; }
  const rate  = parseFloat($('new-asset-rate').value) || 0;
  const maxId = assets.reduce((m, a) => Math.max(m, a.id), 0);
  assets.push({ id: maxId + 1, name, type: _selAssetType, value: 0, rate });
  closeAssetModal();
  renderActivos();
  saveAll();
}
