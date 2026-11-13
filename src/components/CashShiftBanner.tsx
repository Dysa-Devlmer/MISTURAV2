import React from 'react';
import { usePOS } from '../context/POSContext';
import { Lock, Unlock, AlertCircle, Coins, ArrowRight, ShieldCheck, Monitor, Smartphone, ChefHat } from 'lucide-react';
import { sound } from '../utils/sound';
import { hasUserPermission } from '../utils/permissions';
import { formatCLP } from '../utils/currency';

export const CashShiftBanner: React.FC = () => {
  const {
    currentShift,
    setIsCashShiftModalOpen,
    setCashModalMode,
    stationMode,
    setStationMode,
    currency,
    waiter,
    themeMode
  } = usePOS();

  const isLight = themeMode === 'vibrant-light';
  const canOpenClose = hasUserPermission(waiter, 'canOpenCloseCash');
  const canMoveCash = hasUserPermission(waiter, 'canCashMovements');

  // Do not show banner on mobile waiter or kitchen screens
  if (stationMode === 'waiter-mobile' || stationMode === 'kitchen-kds' || waiter.role === 'waiter') {
    return null;
  }

  // If cash register is NOT open
  if (!currentShift || currentShift.status !== 'open') {
    return (
      <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white px-3.5 sm:px-4 py-2 shadow-sm flex items-center justify-between gap-2.5 text-xs z-20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Lock className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-xs sm:text-sm block truncate leading-tight">
              Caja Cerrada · Apertura requerida
            </span>
            <span className="hidden sm:block text-[11px] opacity-90 truncate">
              {canOpenClose
                ? 'Abra la caja para registrar el fondo inicial del turno.'
                : 'Solo Cajeras o Administradores pueden abrir caja.'}
            </span>
          </div>
        </div>

        {canOpenClose ? (
          <button
            onClick={() => {
              sound.playTap();
              setCashModalMode('open');
              setIsCashShiftModalOpen(true);
            }}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Abrir Caja</span>
          </button>
        ) : (
          <span className="text-[11px] font-bold bg-black/20 px-2.5 py-1 rounded-lg border border-white/20 text-white/95 whitespace-nowrap shrink-0">
            Esperando apertura
          </span>
        )}
      </div>
    );
  }

  // If cash register is open: compact helpful bar (hidden on < lg since mobile TopBar + Hub handle quick shift access cleanly)
  return (
    <div className={`hidden sm:flex px-4 py-1.5 border-b items-center justify-between text-xs gap-2 transition-colors shrink-0 ${
      isLight ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950' : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-200'
    }`}>
      {/* Left: Shift Status */}
      <div className="flex items-center gap-2 min-w-0">
        <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-bold whitespace-nowrap truncate">
          Caja Abierta: <span className="font-mono tabular-nums">{formatCLP(currentShift.initialCash, currency)}</span> (Fondo)
        </span>
        <span className="opacity-50 hidden md:inline">·</span>
        <span className="hidden md:inline text-[11px] opacity-80 truncate">
          Iniciada por <strong>{currentShift.openedBy}</strong> a las {currentShift.openedAtTime}
        </span>
      </div>

      {/* Right: Actions & Privileges */}
      <div className="flex items-center gap-2 shrink-0">
        {canMoveCash && (
          <button
            onClick={() => {
              sound.playTap();
              setCashModalMode('movement');
              setIsCashShiftModalOpen(true);
            }}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-emerald-100/50 border-emerald-300 text-emerald-800'
                : 'bg-emerald-900/60 hover:bg-emerald-800 border-emerald-700 text-emerald-100'
            }`}
          >
            <Coins className="w-3 h-3 text-emerald-500" />
            <span>Movimiento Caja</span>
          </button>
        )}

        {canOpenClose && (
          <button
            onClick={() => {
              sound.playTap();
              setCashModalMode('close');
              setIsCashShiftModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg border text-[11px] font-black transition-all flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white border-purple-500 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Lock className="w-3 h-3" />
            <span>Cerrar Caja (Z)</span>
          </button>
        )}

        {!canOpenClose && !canMoveCash && (
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border whitespace-nowrap ${
            isLight ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800' : 'bg-emerald-900/40 border-emerald-800 text-emerald-300'
          }`}>
            Caja: {currentShift.openedBy}
          </span>
        )}
      </div>
    </div>
  );
};
