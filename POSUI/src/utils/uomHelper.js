/**
 * Universal Unit of Measure (UoM) & Quantity Measurement Utilities
 * 
 * Supports:
 * - Weight: KG (Kilogram), GM (Gram)
 * - Volume: LTR (Liter), ML (Milliliter)
 * - Count: PCS (Piece), PACK (Pack), BOX (Box), DOZEN (Dozen)
 */

export const UNIT_TYPES = {
  WEIGHT: 'weight',
  VOLUME: 'volume',
  COUNT: 'count'
};

export const UNITS = [
  {
    code: 'KG',
    label: 'Kilogram (KG)',
    short: 'kg',
    symbol: 'KG',
    type: UNIT_TYPES.WEIGHT,
    allowDecimal: true,
    step: 0.25,
    minQty: 0.05,
    precision: 3,
    presets: [
      { label: '100g', value: 0.1 },
      { label: '250g', value: 0.25 },
      { label: '500g', value: 0.5 },
      { label: '1 kg', value: 1.0 },
      { label: '2 kg', value: 2.0 },
      { label: '5 kg', value: 5.0 }
    ]
  },
  {
    code: 'GM',
    label: 'Gram (GM)',
    short: 'g',
    symbol: 'GM',
    type: UNIT_TYPES.WEIGHT,
    allowDecimal: false,
    step: 50,
    minQty: 10,
    precision: 0,
    presets: [
      { label: '50g', value: 50 },
      { label: '100g', value: 100 },
      { label: '250g', value: 250 },
      { label: '500g', value: 500 },
      { label: '1000g', value: 1000 }
    ]
  },
  {
    code: 'LTR',
    label: 'Liter (LTR)',
    short: 'L',
    symbol: 'LTR',
    type: UNIT_TYPES.VOLUME,
    allowDecimal: true,
    step: 0.25,
    minQty: 0.1,
    precision: 3,
    presets: [
      { label: '200ml', value: 0.2 },
      { label: '500ml', value: 0.5 },
      { label: '1 L', value: 1.0 },
      { label: '1.5 L', value: 1.5 },
      { label: '2 L', value: 2.0 },
      { label: '5 L', value: 5.0 }
    ]
  },
  {
    code: 'ML',
    label: 'Milliliter (ML)',
    short: 'ml',
    symbol: 'ML',
    type: UNIT_TYPES.VOLUME,
    allowDecimal: false,
    step: 100,
    minQty: 50,
    precision: 0,
    presets: [
      { label: '100ml', value: 100 },
      { label: '200ml', value: 200 },
      { label: '500ml', value: 500 },
      { label: '750ml', value: 750 },
      { label: '1000ml', value: 1000 }
    ]
  },
  {
    code: 'PCS',
    label: 'Piece (PCS)',
    short: 'pc',
    symbol: 'PCS',
    type: UNIT_TYPES.COUNT,
    allowDecimal: false,
    step: 1,
    minQty: 1,
    precision: 0,
    presets: [
      { label: '+1', value: 1 },
      { label: '+2', value: 2 },
      { label: '+5', value: 5 },
      { label: '+10', value: 10 }
    ]
  },
  {
    code: 'PACK',
    label: 'Pack (PACK)',
    short: 'pack',
    symbol: 'PACK',
    type: UNIT_TYPES.COUNT,
    allowDecimal: false,
    step: 1,
    minQty: 1,
    precision: 0,
    presets: [
      { label: '+1', value: 1 },
      { label: '+2', value: 2 },
      { label: '+5', value: 5 },
      { label: '+10', value: 10 }
    ]
  },
  {
    code: 'BOX',
    label: 'Box (BOX)',
    short: 'box',
    symbol: 'BOX',
    type: UNIT_TYPES.COUNT,
    allowDecimal: false,
    step: 1,
    minQty: 1,
    precision: 0,
    presets: [
      { label: '+1', value: 1 },
      { label: '+2', value: 2 },
      { label: '+5', value: 5 }
    ]
  },
  {
    code: 'DOZEN',
    label: 'Dozen (12 Pcs)',
    short: 'dz',
    symbol: 'DOZEN',
    type: UNIT_TYPES.COUNT,
    allowDecimal: true, // e.g. 0.5 dozen = 6 pcs
    step: 0.5,
    minQty: 0.5,
    precision: 2,
    presets: [
      { label: '0.5 dz (6)', value: 0.5 },
      { label: '1 dz (12)', value: 1.0 },
      { label: '2 dz (24)', value: 2.0 }
    ]
  }
];

const UNIT_MAP = UNITS.reduce((acc, u) => {
  acc[u.code] = u;
  acc[u.code.toLowerCase()] = u;
  return acc;
}, {});

/**
 * Returns metadata definition for a unit code, default PCS
 */
export function getUnitMeta(unitCode = 'PCS') {
  if (!unitCode) return UNIT_MAP['PCS'];
  const clean = String(unitCode).toUpperCase().trim();
  return UNIT_MAP[clean] || UNIT_MAP['PCS'];
}

/**
 * Checks if a unit code represents a weighed or volume metric item
 */
export function isWeighedOrMeasured(unitCode) {
  const meta = getUnitMeta(unitCode);
  return meta.type === UNIT_TYPES.WEIGHT || meta.type === UNIT_TYPES.VOLUME || meta.allowDecimal;
}

/**
 * Formats a quantity value according to unit precision (e.g. 0.500 kg -> 0.5 kg or 0.250 kg)
 */
export function formatQuantity(qty, unitCode = 'PCS') {
  const num = Number(qty) || 0;
  const meta = getUnitMeta(unitCode);

  if (!meta.allowDecimal) {
    return String(Math.round(num));
  }

  // If decimal allowed, show up to 3 places without trailing zeros if clean
  if (num % 1 === 0) {
    return String(num.toFixed(0));
  }
  // If decimal has 2 or 3 places
  return Number(num.toFixed(3)).toString();
}

/**
 * Formats quantity with unit symbol, e.g. "0.5 kg", "250 g", "2 pcs"
 */
export function formatQtyWithUnit(qty, unitCode = 'PCS') {
  const meta = getUnitMeta(unitCode);
  return `${formatQuantity(qty, unitCode)} ${meta.short}`;
}

/**
 * Formats rate per unit display, e.g. "₹120.00 / kg"
 */
export function formatRatePerUnit(rate, unitCode = 'PCS') {
  const r = Number(rate) || 0;
  const meta = getUnitMeta(unitCode);
  return `₹${r.toFixed(2)} / ${meta.short}`;
}

/**
 * Calculates line base amount safely rounded to 2 decimal places
 */
export function calculateLineAmount(rate, quantity) {
  const r = Number(rate) || 0;
  const q = Number(quantity) || 0;
  return parseFloat((r * q).toFixed(2));
}

export default {
  UNIT_TYPES,
  UNITS,
  getUnitMeta,
  isWeighedOrMeasured,
  formatQuantity,
  formatQtyWithUnit,
  formatRatePerUnit,
  calculateLineAmount
};
