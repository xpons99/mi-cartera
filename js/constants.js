// ── Helpers ──
const $ = id => document.getElementById(id);
const fmt  = n => n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
const fmtK = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k€' : fmt(n);
const fmtD = n => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

// ── Categorías de gasto ──
const CATS = [
  { id: 'alim',    name: 'Alimentación', icon: '🛒', color: '#10B981' },
  { id: 'trans',   name: 'Transporte',   icon: '🚗', color: '#2563EB' },
  { id: 'ocio',    name: 'Ocio',         icon: '🎬', color: '#8B5CF6' },
  { id: 'salud',   name: 'Salud',        icon: '🏥', color: '#EF4444' },
  { id: 'ropa',    name: 'Ropa',         icon: '👕', color: '#F59E0B' },
  { id: 'hogar',   name: 'Hogar',        icon: '🏠', color: '#06B6D4' },
  { id: 'restaur', name: 'Restaurantes', icon: '🍽️', color: '#EC4899' },
  { id: 'otros2',  name: 'Otros',        icon: '📦', color: '#9CA3AF' },
];

// ── Objetivos ──
const OBJ_EMOJIS = ['🏠','🚗','🏍️','✈️','💻','📱','🎓','💍','🏖️','🛥️','🎸','🏋️','📷','🌍','💰','🎯'];
const OBJ_COLORS = ['#2563EB','#10B981','#8B5CF6','#EF4444','#F59E0B','#EC4899','#06B6D4','#F97316'];

// ── Activos: paleta y tipos ──
const ASSET_PALETTE = ['#2563EB','#10B981','#F59E0B','#8B5CF6','#EF4444','#9CA3AF','#EC4899','#06B6D4','#F97316','#84CC16','#14B8A6'];
const ASSET_TYPE_LABELS = { liq: 'Liquidez', inv: 'Inversión LP', alt: 'Alternativo' };

// ── Estado global ──
let gastos    = [];
let objetivos = [];
let assets = [
  { id: 1, name: 'Fondo monetario',    type: 'liq', value: 0, rate: 2.5 },
  { id: 2, name: 'Fondos de inversión', type: 'inv', value: 0, rate: 10  },
  { id: 3, name: 'Cuenta remunerada',  type: 'liq', value: 0, rate: 1.5 },
  { id: 4, name: 'Oro',                type: 'alt', value: 0, rate: 0   },
  { id: 5, name: 'Bitcoin',            type: 'alt', value: 0, rate: 0   },
  { id: 6, name: 'Cuenta corriente',   type: 'liq', value: 0, rate: 0   },
];
