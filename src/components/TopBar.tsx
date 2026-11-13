import React, { useState, useEffect } from 'react';
import { usePOS } from '../context/POSContext';
import {
  Clock,
  ChevronDown,
  LogOut,
  Unlock,
  Lock
} from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { UserSessionSheet } from './UserSessionSheet';
import { sound } from '../utils/sound';
import { hasUserPermission } from '../utils/permissions';

export const TopBar: React.FC = () => {
  const {
    activeView,
    waiter,
    terminal,
    warehouse,
    themeMode,
    isMobileDevice,
    stationMode,
    currentShift,
    setIsCashShiftModalOpen,
    setCashModalMode,
    logout
  } = usePOS();

  const isLight = themeMode === 'vibrant-light';
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isUserSheetOpen, setIsUserSheetOpen] = useState<boolean>(false);

  const canOpenCloseCash = waiter.role !== 'waiter' && hasUserPermission(waiter, 'canOpenCloseCash');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  // Title by Active View
  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Panel Ejecutivo', subtitle: 'Resumen en tiempo real' };
      case 'floor':
        return { title: 'Salón & Mesas', subtitle: 'Plano interactivo de salones' };
      case 'pos':
        return { title: 'Bar / TPV Comandas', subtitle: 'Toma ágil de pedidos' };
      case 'delivery':
        return { title: 'Delivery & Mostrador', subtitle: 'Envíos, mostrador y express' };
      case 'pending-sales':
        return { title: 'Ventas Abiertas', subtitle: 'Comandas activas por cobrar' };
      case 'kitchen':
        return { title: 'Cocina KDS', subtitle: 'Monitor de marchas y pase' };
      case 'menu':
        return { title: 'Carta Digital QR', subtitle: 'Catálogo y códigos de mesa' };
      case 'clients':
        return { title: 'Clientes CRM', subtitle: 'Cartera y fidelización' };
      case 'reports':
        return { title: 'Caja & Cierre Z', subtitle: 'Arqueo de turnos e informes' };
      case 'inventory':
        return { title: 'Almacén & Stock', subtitle: 'Existencias e insumos' };
      case 'admin':
        return { title: 'Administración', subtitle: 'Personal, roles y ajustes' };
      default:
        return { title: 'Dy Pos Gastrobar', subtitle: 'Gestión Gastronómica' };
    }
  };

  const { title, subtitle } = getViewTitle();

  // If on mobile / waiter taking orders, hide top bar for 100% full screen focus
  if ((isMobileDevice || stationMode === 'waiter-mobile') && activeView === 'pos') {
    return null;
  }

  return (
    <header className={`px-3.5 sm:px-5 h-13 sm:h-14 border-b select-none flex items-center justify-between gap-2.5 shrink-0 transition-colors ${
      isLight
        ? 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-800'
        : 'bg-slate-950/95 backdrop-blur-md border-slate-800 text-slate-100'
    }`}>
      {/* Left: View Title & Contextual Subtitle (Clean single row, no overlap) */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="min-w-0 flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate whitespace-nowrap">
            {title}
          </h2>
          <span className="hidden xl:inline-block text-xs text-slate-400 dark:text-slate-500 font-bold shrink-0">
            /
          </span>
          <span className="hidden xl:inline-block text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            {subtitle}
          </span>
        </div>
      </div>

      {/* Right: Terminal Status, Clock, Profile & Exit */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Compact Mobile Cash Trigger (easy 1-tap access without tall banners) */}
        {canOpenCloseCash && (
          <button
            type="button"
            onClick={() => {
              sound.playTap();
              setCashModalMode(currentShift ? 'close' : 'open');
              setIsCashShiftModalOpen(true);
            }}
            className={`lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-black transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 ${
              currentShift
                ? isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-emerald-950/70 border-emerald-700/70 text-emerald-300'
                : 'bg-rose-600 border-rose-500 text-white shadow-xs'
            }`}
          >
            {currentShift ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{currentShift ? 'Caja' : 'Abrir'}</span>
          </button>
        )}

        {/* Terminal Info (2XL+ so medium desktops never crowd) */}
        <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
          <span>{terminal.name}</span>
          <span className="opacity-40">·</span>
          <span>{warehouse.name}</span>
        </div>

        {/* Clock (sm+) */}
        <div className="hidden md:flex items-center gap-1.5 font-mono tabular-nums text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold whitespace-nowrap shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{currentTime || '14:30'}</span>
        </div>

        {/* Language Switcher (shown lg+ in TopBar; on mobile it lives cleanly inside UserSessionSheet & Mobile "Más" Hub) */}
        <div className="hidden lg:block shrink-0">
          <LanguageSelector variant="navbar" />
        </div>

        {/* User Profile Sheet Trigger */}
        <button
          type="button"
          onClick={() => { sound.playTap(); setIsUserSheetOpen(!isUserSheetOpen); }}
          title="Ver perfil de usuario y alternar turno"
          className="flex items-center gap-1.5 sm:gap-2 min-h-[36px] px-2 sm:px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <img
            src={waiter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={waiter.name}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-lg object-cover shrink-0"
          />
          <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[84px] hidden sm:inline-block whitespace-nowrap">
            {waiter.name.split(' ')[0]}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* Direct One-Click Logout Button (Desktop sm+, mobile uses UserSessionSheet / Hub Modal so header stays ultra clean) */}
        <button
          type="button"
          onClick={() => {
            sound.playTap();
            logout();
          }}
          title="Cerrar sesión / Bloquear terminal directamente"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white border border-rose-500/20 hover:border-rose-500 text-xs font-black transition-all cursor-pointer active:scale-95 whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>

      <UserSessionSheet
        isOpen={isUserSheetOpen}
        onClose={() => setIsUserSheetOpen(false)}
      />
    </header>
  );
};
