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

// ── Colores y nombres de activos (donut) ──
const ASSET_COLORS = {
  monetario: '#2563EB',
  fondo:     '#10B981',
  colchon:   '#F59E0B',
  oro:       '#8B5CF6',
  btc:       '#EF4444',
  corriente: '#9CA3AF',
};
const ASSET_NAMES = {
  monetario: 'Monetario',
  fondo:     'MSCI World',
  colchon:   'Colchón',
  oro:       'Oro',
  btc:       'Bitcoin',
  corriente: 'Corriente',
};

// ── Estado global ──
let gastos    = [];
let objetivos = [];
