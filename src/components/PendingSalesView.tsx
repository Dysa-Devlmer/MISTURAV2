import React, { useState, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { Sale } from '../types';
import { INITIAL_WAITERS } from '../data/mockData';
import {
  ArrowRight, Printer, CreditCard, Search,
  ShoppingBag, ArrowLeft, X, ChevronRight, ReceiptText, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../utils/sound';
import { CHILE_IVA_PERCENT, calculateNetAndIva, formatCLP } from '../utils/currency';
import { hasUserPermission } from '../utils/permissions';

export const PendingSalesView: React.FC = () => {
  const {
    sales = [], setActiveSale, setSelectedRateId,
    setActiveView, waiters = INITIAL_WAITERS, waiter,
    setIsPaymentModalOpen, printPreTicket, themeMode, stationMode, currency
  } = usePOS();

  const isLight = themeMode === 'vibrant-light';
  const isWaiterUser = waiter.role === 'waiter' || stationMode === 'waiter-mobile';
  const canCharge = hasUserPermission(waiter, 'canCharge') && !isWaiterUser;
  const canPrintPrebill = hasUserPermission(waiter, 'canPrintPrebill') && !isWaiterUser;
  const waiterList = waiters && waiters.length > 0 ? waiters : INITIAL_WAITERS;

  // Filters
  const [selectedWaiterId, setSelectedWaiterId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPreticket, setFilterPreticket] = useState<'all' | 'printed' | 'not_printed'>('all');
  const [sortField, setSortField] = useState<'id' | 'date' | 'time' | 'table' | 'total'>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [modalSaleId, setModalSaleId] = useState<number | null>(null);

  // Filter open sales only
  const openSales = useMemo(() => {
    return (sales || []).filter(s => s && s.status === 'open');
  }, [sales]);

  // Apply filters
  const filteredSales = useMemo(() => {
    return openSales.filter(s => {
      if (selectedWaiterId !== 'all' && s.waiterId !== selectedWaiterId) {
        return false;
      }
      if (filterPreticket === 'printed' && !s.preticketPrinted) return false;
      if (filterPreticket === 'not_printed' && s.preticketPrinted) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = (s.number || '').toLowerCase().includes(q) || String(s.id).includes(q);
        const matchesTable = (s.tableName || '').toLowerCase().includes(q) || (s.tableNumber || '').toLowerCase().includes(q);
        const matchesWaiter = (s.waiterName || '').toLowerCase().includes(q);
        const matchesProduct = (s.items || []).some(i => (i.productName || '').toLowerCase().includes(q));
        if (!matchesNumber && !matchesTable && !matchesWaiter && !matchesProduct) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') comparison = a.id - b.id;
      else if (sortField === 'table') comparison = (a.tableName || '').localeCompare(b.tableName || '');
      else if (sortField === 'total') comparison = (a.total || 0) - (b.total || 0);
      else if (sortField === 'time') comparison = (a.time || '').localeCompare(b.time || '');
      else if (sortField === 'date') comparison = (a.date || '').localeCompare(b.date || '');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [openSales, selectedWaiterId, filterPreticket, searchQuery, sortField, sortDirection]);

  // Aggregate stats
  const totalAmount = openSales.reduce((acc, s) => acc + s.total, 0);
  const totalPreticketPrinted = openSales.filter(s => s.preticketPrinted).length;
  const filteredTotal = filteredSales.reduce((acc, s) => acc + s.total, 0);

  const handleOpenSale = (sale: Sale) => {
    sound.playTap();
    setModalSaleId(null);
    setActiveSale(sale);
    setSelectedRateId(sale.rateId);
    setActiveView('pos');
  };

  const handleDirectCharge = (sale: Sale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.playTap();
    setModalSaleId(null);
    setActiveSale(sale);
    setSelectedRateId(sale.rateId);
    setIsPaymentModalOpen(true);
  };

  const handlePrintPreticket = (sale: Sale, e?: React.MouseEvent) => {
    e?.stopPropagation();
    sound.playPrint();
    printPreTicket(sale);
  };

  const handleSort = (field: 'id' | 'date' | 'time' | 'table' | 'total') => {
    sound.playTap();
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRowSelect = (sale: Sale) => {
    sound.playTap();
    setSelectedSaleId(sale.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1280) {
      setModalSaleId(sale.id);
    }
  };

  const activeSelectedSale = openSales.find(s => s.id === selectedSaleId) || filteredSales[0] || null;
  const activeModalSale = modalSaleId !== null ? openSales.find(s => s.id === modalSaleId) || null : null;

  const renderDetailContent = (sale: Sale, isModal: boolean) => {
    const breakdown = calculateNetAndIva(sale.total, CHILE_IVA_PERCENT);
    const cleanWaiter = (sale.waiterName || 'Sin asignar').replace(/\s*\([^)]*\)/g, '').trim();

    return (
      <>
        {/* Top Preview Header */}
        <div className={`px-4 py-3.5 border-b flex items-center justify-between gap-3 shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
        }`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums">
                Venta #{sale.number || sale.id}
              </span>
              <span className="bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-lg">
                {sale.tableName || `Mesa ${sale.tableNumber}`}
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium truncate">
              {cleanWaiter} <span aria-hidden="true">·</span> {sale.time} <span aria-hidden="true">·</span> {(sale.items || []).length} ítems
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <div className="text-lg font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCLP(sale.total, currency)}
              </div>
              <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                Neto {formatCLP(breakdown.net, currency)}
              </div>
            </div>

            {isModal && (
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setModalSaleId(null);
                }}
                aria-label="Cerrar detalle"
                className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center cursor-pointer ${
                  isLight ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Products in Sale */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Detalle de Comanda</span>
            <span className="tabular-nums">IVA 19%: {formatCLP(breakdown.iva, currency)}</span>
          </div>

          {(!sale.items || sale.items.length === 0) ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs font-medium">
              Sin productos añadidos en esta mesa
            </div>
          ) : (
            (sale.items || []).map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 text-xs ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-800/60 border-slate-700/60 text-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-[11px] tabular-nums shrink-0">
                    {item.quantity}
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.productName}</div>
                    {(item.selectedOption || item.kitchenNotes) && (
                      <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mt-0.5 truncate">
                        {item.selectedOption ? `Opción: ${item.selectedOption}` : `Nota: ${item.kitchenNotes}`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="font-mono font-black tabular-nums text-slate-900 dark:text-slate-200 shrink-0">
                  {formatCLP(item.total, currency)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Direct Action Buttons */}
        <div className={`p-3.5 border-t flex flex-col gap-2 shrink-0 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <button
            type="button"
            onClick={() => handleOpenSale(sale)}
            className="w-full min-h-[48px] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.98] cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>ENTRAR A LA COMANDA</span>
          </button>

          {(canPrintPrebill || canCharge) && (
            <div className="grid grid-cols-2 gap-2">
              {canPrintPrebill && (
                <button
                  type="button"
                  onClick={(e) => handlePrintPreticket(sale, e)}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-95 ${
                    sale.preticketPrinted
                      ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                      : isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-900'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>{sale.preticketPrinted ? 'Re-imprimir' : 'Pre-ticket'}</span>
                </button>
              )}

              {canCharge && (
                <button
                  type="button"
                  onClick={(e) => handleDirectCharge(sale, e)}
                  className="min-h-[44px] py-2.5 px-3 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cobrar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none font-sans min-w-0 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>

      {/* ========================================================
          1. DESKTOP/TABLET COMPACT HEADER & MOBILE BANKING SUMMARY HERO
      ======================================================== */}
      {/* Desktop/Tablet Header (md+) */}
      <div className={`hidden md:flex px-4 py-3 border-b items-center justify-between gap-3 shrink-0 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setActiveView('floor');
            }}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-black transition-all shrink-0 cursor-pointer active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Plano de Mesas</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base lg:text-lg font-black tracking-tight text-blue-700 dark:text-blue-400 truncate">
                Ventas Abiertas
              </h1>
              <span className="bg-blue-600 text-white font-black text-xs px-2 py-0.5 rounded-full tabular-nums">
                {openSales.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
              Gestión centralizada de comandas y cuentas activas
            </p>
          </div>
        </div>

        {/* Global Stats Summary */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold whitespace-nowrap ${
            isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
          }`}>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">Total Activo:</span>
            <span className="font-mono font-black text-sm tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCLP(totalAmount, currency)}
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold whitespace-nowrap ${
            isLight ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-amber-950/50 border-amber-800 text-amber-300'
          }`}>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">Pre-tickets:</span>
            <span className="font-mono font-black text-sm tabular-nums text-amber-700 dark:text-amber-400">
              {totalPreticketPrinted}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Banking-App Hero Summary Card (< md) */}
      <div className="md:hidden px-3.5 pt-3 pb-2 shrink-0">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white shadow-lg border border-white/10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-blue-200/90">
              Por cobrar en salones
            </span>
            <button
              type="button"
              onClick={() => { sound.playTap(); setActiveView('floor'); }}
              className="px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Salón</span>
            </button>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3">
            <div className="text-2xl font-black font-mono tabular-nums tracking-tight">
              {formatCLP(totalAmount, currency)}
            </div>
            <div className="text-xs text-blue-200 font-semibold tabular-nums whitespace-nowrap">
              {openSales.length} abiertas · {totalPreticketPrinted} pre-ticket
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. FILTER & SEARCH BAR
      ======================================================== */}
      <div className={`px-3.5 sm:px-4 py-2.5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs shrink-0 ${
        isLight ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-slate-800/80'
      }`}>
        {/* Waiters Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <button
            type="button"
            onClick={() => { sound.playTap(); setSelectedWaiterId('all'); }}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl font-black text-xs transition-all shrink-0 cursor-pointer whitespace-nowrap ${
              selectedWaiterId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : isLight
                ? 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Todos ({openSales.length})
          </button>

          {waiterList.map(w => {
            const count = openSales.filter(s => s.waiterId === w.id).length;
            if (count === 0 && selectedWaiterId !== w.id) return null;
            const cleanName = w.name.replace(/\s*\([^)]*\)/g, '').trim();
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => { sound.playTap(); setSelectedWaiterId(w.id); }}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                  selectedWaiterId === w.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isLight
                    ? 'bg-white text-slate-800 hover:bg-slate-200 border border-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <span>{cleanName}</span>
                <span className="opacity-75 font-mono tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Preticket filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <div className={`flex items-center rounded-xl p-0.5 border shrink-0 ${
            isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700'
          }`}>
            <button
              type="button"
              onClick={() => { sound.playTap(); setFilterPreticket('all'); }}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap ${
                filterPreticket === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => { sound.playTap(); setFilterPreticket('printed'); }}
              className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-black transition-colors cursor-pointer whitespace-nowrap ${
                filterPreticket === 'printed'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pre-ticket
            </button>
          </div>

          <div className="relative flex-1 lg:w-52">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar mesa, ticket o garzón..."
              className={`w-full min-h-[36px] pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold ${
                isLight ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400'
              }`}
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          3A. MOBILE BANKING-APP CARD FEED (< md)
      ======================================================== */}
      <div className="md:hidden flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5">
        {filteredSales.length === 0 ? (
          <div className="py-14 text-center text-slate-400 space-y-2">
            <ShoppingBag className="w-10 h-10 mx-auto opacity-40" />
            <p className="font-bold text-sm">No hay comandas con los filtros aplicados</p>
          </div>
        ) : (
          filteredSales.map(sale => {
            const cleanWaiter = (sale.waiterName || 'Sin asignar').replace(/\s*\([^)]*\)/g, '').trim();
            return (
              <motion.button
                key={sale.id}
                type="button"
                whileTap={{ scale: 0.985 }}
                onClick={() => {
                  sound.playTap();
                  setModalSaleId(sale.id);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
                    : 'bg-slate-900 border-slate-800 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                    sale.preticketPrinted
                      ? 'bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                      : 'bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}>
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                        {sale.tableName || `Mesa ${sale.tableNumber}`}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-400 tabular-nums">
                        #{sale.number || sale.id}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {cleanWaiter} · {sale.time} · {(sale.items || []).length} prod.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-black text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatCLP(sale.total, currency)}
                    </div>
                    {sale.preticketPrinted && (
                      <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                        Pre-ticket
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* ========================================================
          3B. DESKTOP / TABLET RESPONSIVE TABLE + XL INSPECTOR (md+)
      ======================================================== */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden min-w-0">
        {/* Left/Main Column: Non-clipping responsive table */}
        <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${
          isLight ? 'bg-white text-slate-900' : 'bg-slate-950 text-slate-100'
        }`}>
          <div className="flex-1 overflow-auto min-w-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`sticky top-0 z-10 font-black tracking-wide uppercase text-[11px] select-none ${
                isLight ? 'bg-slate-100 text-slate-800 border-b border-slate-200' : 'bg-slate-900 text-slate-300 border-b border-slate-800'
              }`}>
                <tr>
                  <th onClick={() => handleSort('id')} className="py-2.5 px-3 cursor-pointer hover:text-blue-600 whitespace-nowrap">
                    Nro. {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('date')} className="py-2.5 px-3 cursor-pointer hover:text-blue-600 hidden 2xl:table-cell whitespace-nowrap">
                    Fecha {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('time')} className="py-2.5 px-3 cursor-pointer hover:text-blue-600 whitespace-nowrap">
                    Hora {sortField === 'time' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('table')} className="py-2.5 px-3 cursor-pointer hover:text-blue-600 font-black text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    Mesa {sortField === 'table' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    Garzón
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    Pre-ticket
                  </th>
                  <th className="py-2.5 px-3 text-right hidden 2xl:table-cell whitespace-nowrap">
                    Neto
                  </th>
                  <th className="py-2.5 px-3 text-right hidden 2xl:table-cell whitespace-nowrap">
                    IVA
                  </th>
                  <th onClick={() => handleSort('total')} className="py-2.5 px-3 text-right cursor-pointer hover:text-blue-600 font-black whitespace-nowrap">
                    Total {sortField === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody className={`divide-y font-medium ${isLight ? 'divide-slate-200 text-slate-900' : 'divide-slate-800/60 text-slate-100'}`}>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-sm">No se encontraron ventas con los filtros aplicados</p>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, idx) => {
                    const isSelected = activeSelectedSale?.id === sale.id;
                    const cleanWaiter = (sale.waiterName || 'Sin asignar').replace(/\s*\([^)]*\)/g, '').trim();
                    return (
                      <tr
                        key={sale.id}
                        onClick={() => handleRowSelect(sale)}
                        onDoubleClick={() => handleOpenSale(sale)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? isLight
                              ? 'bg-blue-50/90 font-bold text-slate-950 ring-1 ring-inset ring-blue-400/50'
                              : 'bg-blue-950/50 font-bold ring-1 ring-inset ring-blue-500/40'
                            : idx % 2 === 0
                            ? isLight ? 'bg-white hover:bg-slate-50' : 'bg-slate-950 hover:bg-slate-900/80'
                            : isLight ? 'bg-slate-50/50 hover:bg-slate-100/70' : 'bg-slate-900/40 hover:bg-slate-900/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-black tabular-nums whitespace-nowrap">
                          {sale.number || sale.id}
                        </td>

                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 hidden 2xl:table-cell font-mono text-[11px] font-bold tabular-nums whitespace-nowrap">
                          {sale.date}
                        </td>

                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold tabular-nums whitespace-nowrap">
                          {sale.time}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-black text-xs ${
                            sale.tableNumber === 'BARRA' || !sale.tableNumber
                              ? isLight ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
                              : 'bg-blue-600 text-white shadow-xs'
                          }`}>
                            {sale.tableName || `Mesa ${sale.tableNumber}`}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 max-w-[140px] truncate">
                          {cleanWaiter}
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {sale.preticketPrinted ? (
                            <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md">
                              <Printer className="w-3 h-3" />
                              <span>IMPRESO</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">No</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-400 hidden 2xl:table-cell font-bold whitespace-nowrap">
                          {formatCLP(sale.subtotal, currency)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-400 hidden 2xl:table-cell font-bold whitespace-nowrap">
                          {formatCLP(sale.taxTotal, currency)}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatCLP(sale.total, currency)}
                        </td>

                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                sound.playTap();
                                setSelectedSaleId(sale.id);
                                setModalSaleId(sale.id);
                              }}
                              title="Ver detalle de comanda"
                              className={`xl:hidden p-1.5 rounded-lg border transition-transform active:scale-95 cursor-pointer ${
                                isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSale(sale);
                              }}
                              title="Entrar a la comanda"
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-transform active:scale-95 shadow-xs flex items-center gap-1 text-xs cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Ver</span>
                            </button>
                            {canCharge && (
                              <button
                                type="button"
                                onClick={(e) => handleDirectCharge(sale, e)}
                                title="Cobrar directo"
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-transform active:scale-95 shadow-xs cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Table Summary Bar */}
          <div className={`px-4 py-2.5 border-t flex flex-wrap items-center justify-between text-xs font-bold gap-3 shrink-0 ${
            isLight ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              <span>Registros: <strong className="font-mono tabular-nums font-black">{filteredSales.length}</strong></span>
              <span className="hidden lg:inline opacity-40">·</span>
              <span className="hidden lg:inline text-slate-500 dark:text-slate-400">
                Clic en fila para inspeccionar · Doble clic para abrir
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span className="text-slate-600 dark:text-slate-300 font-bold">
                Neto: <strong className="text-slate-900 dark:text-white font-black">{formatCLP(calculateNetAndIva(filteredTotal, CHILE_IVA_PERCENT).net, currency)}</strong>
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 text-sm font-black bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                Total: {formatCLP(filteredTotal, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column Inspector: Visible cleanly ONLY on xl+ (>=1280px) so medium/laptop screens NEVER clip columns */}
        {activeSelectedSale && (
          <div className={`hidden xl:flex w-88 2xl:w-96 flex-col shrink-0 border-l overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            {renderDetailContent(activeSelectedSale, false)}
          </div>
        )}
      </div>

      {/* ========================================================
          4. ANIMATED DETAIL MODAL / BOTTOM SHEET (Mobile & Tablet/Laptop < xl)
      ======================================================== */}
      <AnimatePresence>
        {activeModalSale && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setModalSaleId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet on Mobile, Centered Card Modal on Tablet/Laptop */}
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className={`relative w-full md:max-w-md max-h-[88vh] rounded-t-3xl md:rounded-3xl border shadow-2xl flex flex-col overflow-hidden z-10 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Drag affordance on mobile */}
              <div className="md:hidden w-full pt-2.5 pb-1 flex justify-center shrink-0">
                <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {renderDetailContent(activeModalSale, true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
