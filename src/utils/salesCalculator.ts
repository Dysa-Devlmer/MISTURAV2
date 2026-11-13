import { Product, Sale, SaleLine } from '../types';
import { calculateNetAndIva, CHILE_IVA_PERCENT, roundCLP } from './currency';

export interface SaleTotalsBreakdown {
  subtotal: number; // Neto sin IVA en CLP entero
  taxTotal: number; // IVA 19% desglosado en CLP entero
  total: number;    // Total bruto (subtotal + taxTotal) en CLP entero
}

/**
 * Calcula el total de una línea de venta aplicando descuento porcentual en CLP entero.
 */
export const computeLineTotal = (
  unitPrice: number,
  quantity: number,
  discountPercent: number = 0
): number => {
  const safePrice = roundCLP(unitPrice);
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safeDisc = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  return roundCLP(safePrice * safeQty * (1 - safeDisc / 100));
};

/**
 * Calcula los totales consolidados (Neto, IVA 19%, Total Bruto) de un arreglo de líneas.
 * Garantiza que subtotal + taxTotal === total en Pesos Chilenos enteros.
 */
export const calculateSaleTotals = (items: SaleLine[]): SaleTotalsBreakdown => {
  let subtotal = 0;
  let taxTotal = 0;
  let total = 0;

  items.forEach((item) => {
    const { net, iva, gross } = calculateNetAndIva(item.total, item.iva ?? CHILE_IVA_PERCENT);
    subtotal += net;
    taxTotal += iva;
    total += gross;
  });

  return {
    subtotal: roundCLP(subtotal),
    taxTotal: roundCLP(taxTotal),
    total: roundCLP(total),
  };
};

/**
 * Crea una línea de venta normalizada a CLP enteros.
 */
export const buildSaleLine = ({
  id,
  lineId,
  product,
  quantity,
  rateMultiplier = 1,
  extraPrice = 0,
  kitchenBlock,
  kitchenStatus,
  selectedOption,
  kitchenNotes,
  sentToKitchenAt,
  waiterId,
  waiterName,
  addedAtTime,
}: {
  id: string;
  lineId: number;
  product: Product;
  quantity: number;
  rateMultiplier?: number;
  extraPrice?: number;
  kitchenBlock?: number;
  kitchenStatus?: SaleLine['kitchenStatus'];
  selectedOption?: string;
  kitchenNotes?: string;
  sentToKitchenAt?: string;
  waiterId?: number;
  waiterName?: string;
  addedAtTime?: string;
}): SaleLine => {
  const baseUnitPrice = roundCLP(product.price * rateMultiplier);
  const unitPrice = roundCLP(baseUnitPrice + roundCLP(extraPrice));
  const total = computeLineTotal(unitPrice, quantity, 0);

  return {
    id,
    lineId,
    productId: product.id,
    productName: product.name,
    quantity,
    unitPrice,
    originalPrice: roundCLP(product.price),
    modifiersExtraPrice: roundCLP(extraPrice),
    iva: product.iva ?? CHILE_IVA_PERCENT,
    discount: 0,
    total,
    kitchenBlock: kitchenBlock || product.kitchenBlock || 1,
    kitchenStatus: kitchenStatus ?? (product.isKitchen ? 'pending' : 'ready'),
    selectedOption,
    kitchenNotes,
    sentToKitchenAt,
    waiterId,
    waiterName,
    addedAtTime,
  };
};

/**
 * Inserta o agrupa un producto dentro de las líneas actuales de una comanda.
 * Si existe una línea idéntica pendiente de envío sin notas ni opciones personalizadas, suma su cantidad.
 */
export const upsertProductIntoSaleLines = (
  currentItems: SaleLine[],
  params: {
    lineUniqueId: string;
    product: Product;
    quantity: number;
    rateMultiplier: number;
    optionName?: string;
    notes?: string;
    customBlock?: number;
    extraPrice?: number;
    waiterId?: number;
    waiterName?: string;
    addedAtTime?: string;
  }
): SaleLine[] => {
  const {
    lineUniqueId,
    product,
    quantity,
    rateMultiplier,
    optionName,
    notes,
    customBlock,
    extraPrice = 0,
    waiterId,
    waiterName,
    addedAtTime,
  } = params;

  const existingIndex = currentItems.findIndex(
    (item) =>
      item.productId === product.id &&
      !item.kitchenNotes &&
      !notes &&
      !item.selectedOption &&
      !optionName &&
      !extraPrice &&
      !item.modifiersExtraPrice &&
      item.kitchenStatus === 'pending' &&
      (item.waiterId === waiterId || !item.waiterId)
  );

  if (existingIndex > -1) {
    const nextItems = [...currentItems];
    const existing = nextItems[existingIndex];
    const newQty = existing.quantity + quantity;
    nextItems[existingIndex] = {
      ...existing,
      quantity: newQty,
      total: computeLineTotal(existing.unitPrice, newQty, existing.discount || 0),
      waiterId,
      waiterName,
      addedAtTime,
    };
    return nextItems;
  }

  const newLine = buildSaleLine({
    id: lineUniqueId,
    lineId: currentItems.length + 1,
    product,
    quantity,
    rateMultiplier,
    extraPrice,
    kitchenBlock: customBlock || product.kitchenBlock || 1,
    kitchenStatus: product.isKitchen ? 'pending' : 'ready',
    selectedOption: optionName,
    kitchenNotes: notes,
    waiterId,
    waiterName,
    addedAtTime,
  });

  return [...currentItems, newLine];
};

/**
 * Actualiza una línea de venta existente y recalcula su total en CLP enteros.
 */
export const applyLineUpdate = (
  items: SaleLine[],
  lineId: string,
  updates: Partial<SaleLine>
): SaleLine[] =>
  items.map((item) => {
    if (item.id !== lineId) return item;
    const updated: SaleLine = { ...item, ...updates };

    if (updates.modifiersExtraPrice !== undefined) {
      const basePrice = item.unitPrice - (item.modifiersExtraPrice || 0);
      updated.unitPrice = roundCLP(basePrice + roundCLP(updates.modifiersExtraPrice));
    }

    updated.total = computeLineTotal(updated.unitPrice, updated.quantity, updated.discount || 0);
    return updated;
  });

/**
 * Recalcula subtotal, IVA y total bruto (incluyendo costo de envío si hay ítems) sobre una venta.
 */
export const recalculateSaleWithItems = (
  sale: Sale,
  items: SaleLine[],
  actorWaiter?: { id: number; name: string }
): Sale => {
  const totals = calculateSaleTotals(items);
  const activeDeliveryFee = items.length > 0 ? roundCLP(sale.deliveryFee || 0) : 0;

  return {
    ...sale,
    ...(actorWaiter
      ? { currentWaiterId: actorWaiter.id, currentWaiterName: actorWaiter.name }
      : {}),
    items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: roundCLP(totals.total + activeDeliveryFee),
  };
};
