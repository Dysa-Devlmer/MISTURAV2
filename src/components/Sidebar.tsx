import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import {
  LayoutDashboard,
  LayoutGrid,
  ShoppingBag,
  ChefHat,
  QrCode,
  ReceiptText,
  Boxes,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Utensils,
  Unlock,
  Lock,
  Grid2x2,
  X,
  Bike,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveView } from '../types';
import { sound } from '../utils/sound';
import { isViewAllowedForUser, hasUserPermission, getRoleMetadata } from '../utils/permissions';
import { formatCLP } from '../utils/currency';
import { LanguageSelector } from './LanguageSelector';

export const Sidebar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    waiter,
    restaurantBrand,
    themeMode,
    setThemeMode,
    currentShift,
    setIsCashShiftModalOpen,
    setCashModalMode,
    logout,
    tables,
    sales,
    stationMode,
    isMobileDevice,
    systemModules,
    customRoles,
    clients,
    currency
  } = usePOS();

  const isLight = themeMode === 'vibrant-light';

  // Collapsible state (expanded by default on desktop)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sysme_sidebar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  const [isMobileHubOpen, setIsMobileHubOpen] = useState<boolean>(false);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(true);

  const toggleCollapse = () => {
    sound.playTap();
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sysme_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleToggleSound = () => {
    const newVal = sound.toggleSound();
    setIsSoundOn(newVal);
  };

  const handleNavClick = (view: ActiveView) => {
    sound.playTap();
    setActiveView(view);
    setIsMobileHubOpen(false);
  };

  // Live Counts for Badges
  const occupiedCount = tables.filter(t => t.status === 'occupied' || t.status === 'kitchen' || t.status === 'billed').length;
  const openSalesCount = sales.filter(s => s.status === 'open').length;
  const kitchenOrdersCount = sales.filter(s => s.status === 'open' && s.items.some(i => i.kitchenStatus === 'cooking' || i.kitchenStatus === 'pending')).length;
  const deliveryOrdersCount = sales.filter(s => s.status === 'open' && (s.orderType === 'delivery' || s.orderType === 'mostrador' || s.orderType === 'express')).length;

  const getRoleBadge = () => {
    const customRole = waiter.customRoleId
      ? customRoles.find(r => r.id === waiter.customRoleId)
      : undefined;
    const meta = getRoleMetadata(waiter.role);
    const title = customRole ? customRole.name : meta.label;

    switch (waiter.role) {
      case 'admin':
        return {
          title,
          badge: isLight ? 'bg-purple-100 text-purple-900 border-purple-200' : 'bg-purple-950/80 text-purple-200 border-purple-800/80',
          dot: 'bg-purple-500'
        };
      case 'manager':
        return {
          title,
          badge: isLight ? 'bg-indigo-100 text-indigo-900 border-indigo-200' : 'bg-indigo-950/80 text-indigo-200 border-indigo-800/80',
          dot: 'bg-indigo-500'
        };
      case 'cashier':
        return {
          title,
          badge: isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-emerald-950/80 text-emerald-200 border-emerald-800/80',
          dot: 'bg-emerald-500'
        };
      case 'waiter':
        return {
          title,
          badge: isLight ? 'bg-blue-100 text-blue-900 border-blue-200' : 'bg-blue-950/80 text-blue-200 border-blue-800/80',
          dot: 'bg-blue-500'
        };
      case 'kitchen':
        return {
          title,
          badge: isLight ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-amber-950/80 text-amber-200 border-amber-800/80',
          dot: 'bg-amber-500'
        };
      case 'delivery':
        return {
          title,
          badge: isLight ? 'bg-orange-100 text-orange-900 border-orange-200' : 'bg-orange-950/80 text-orange-200 border-orange-800/80',
          dot: 'bg-orange-500'
        };
      default:
        return {
          title,
          badge: 'bg-slate-800 text-slate-200',
          dot: 'bg-slate-400'
        };
    }
  };

  // Navigation Items with role-specific customization & short mobile tab captions
  const navItems: {
    id: ActiveView;
    label: string;
    mobileLabel: string;
    description: string;
    icon: React.ReactNode;
    mobileIcon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
    mobilePriority: number;
  }[] = [
    {
      id: 'dashboard',
      label: waiter.role === 'admin' ? 'Panel Ejecutivo' : 'Panel de Control',
      mobileLabel: 'Inicio',
      description: 'Métricas y facturación',
      icon: <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <LayoutDashboard className="w-5 h-5" />,
      mobilePriority: 3
    },
    {
      id: 'floor',
      label: 'Salón & Mesas',
      mobileLabel: 'Mesas',
      description: 'Plano interactivo de salones',
      icon: <LayoutGrid className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <LayoutGrid className="w-5 h-5" />,
      badge: occupiedCount > 0 ? occupiedCount : undefined,
      badgeColor: 'bg-amber-400 text-slate-950',
      mobilePriority: 1
    },
    {
      id: 'pos',
      label: 'Bar / TPV Comandas',
      mobileLabel: 'TPV',
      description: 'Toma ágil de pedidos',
      icon: <ShoppingBag className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <ShoppingBag className="w-5 h-5" />,
      mobilePriority: 2
    },
    {
      id: 'pending-sales',
      label: waiter.role === 'waiter' ? 'Mis Pedidos Activos' : 'Ventas Abiertas',
      mobileLabel: 'Cuentas',
      description: 'Cuentas en curso de cobro',
      icon: <ReceiptText className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <ReceiptText className="w-5 h-5" />,
      badge: openSalesCount > 0 ? openSalesCount : undefined,
      badgeColor: 'bg-blue-500 text-white',
      mobilePriority: 2
    },
    {
      id: 'delivery',
      label: 'Delivery & Mostrador',
      mobileLabel: 'Delivery',
      description: 'Envíos, mostrador y express',
      icon: <Bike className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <Bike className="w-5 h-5" />,
      badge: deliveryOrdersCount > 0 ? deliveryOrdersCount : undefined,
      badgeColor: 'bg-orange-500 text-white',
      mobilePriority: 4
    },
    {
      id: 'kitchen',
      label: 'Cocina / KDS',
      mobileLabel: 'Cocina',
      description: 'Monitor de marchas',
      icon: <ChefHat className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <ChefHat className="w-5 h-5" />,
      badge: kitchenOrdersCount > 0 ? kitchenOrdersCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
      mobilePriority: waiter.role === 'kitchen' ? 1 : 5
    },
    {
      id: 'menu',
      label: 'Carta QR & Mesas',
      mobileLabel: 'Carta QR',
      description: 'Catálogo y códigos QR',
      icon: <QrCode className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <QrCode className="w-5 h-5" />,
      mobilePriority: 6
    },
    {
      id: 'clients',
      label: 'Clientes CRM',
      mobileLabel: 'Clientes',
      description: 'Cartera y fidelización',
      icon: <Users className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <Users className="w-5 h-5" />,
      badge: clients.length > 0 ? clients.length : undefined,
      badgeColor: 'bg-indigo-500 text-white',
      mobilePriority: 7
    },
    {
      id: 'reports',
      label: 'Caja & Cierre Z',
      mobileLabel: 'Caja Z',
      description: 'Arqueo de turnos',
      icon: <ReceiptText className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <ReceiptText className="w-5 h-5" />,
      mobilePriority: waiter.role === 'cashier' ? 3 : 8
    },
    {
      id: 'inventory',
      label: 'Almacén & Stock',
      mobileLabel: 'Stock',
      description: 'Existencias e insumos',
      icon: <Boxes className="w-4.5 h-4.5 shrink-0" />,
      mobileIcon: <Boxes className="w-5 h-5" />,
      mobilePriority: 9
    },
    {
      id: 'admin',
      label: 'Administración',
      mobileLabel: 'Admin',
      description: 'Personal, roles y ajustes',
      icon: <ShieldCheck className="w-4.5 h-4.5 shrink-0 text-violet-400" />,
      mobileIcon: <ShieldCheck className="w-5 h-5" />,
      mobilePriority: 10
    }
  ];

  // Filter items allowed specifically for the user's role & active system modules
  const allowedNavItems = navItems.filter(item =>
    isViewAllowedForUser(item.id, waiter, stationMode, isMobileDevice, systemModules)
  );

  // Pick top 4 primary tabs for Mobile Banking Bottom Bar
  const primaryMobileTabs = [...allowedNavItems]
    .sort((a, b) => a.mobilePriority - b.mobilePriority)
    .slice(0, 4);

  const hideMobileBottomNav = (isMobileDevice || stationMode === 'waiter-mobile') && activeView === 'pos';
  const canOpenCloseCash = waiter.role !== 'waiter' && hasUserPermission(waiter, 'canOpenCloseCash');
  const roleInfo = getRoleBadge();

  return (
    <>
      {/* ========================================================
          1. DESKTOP COLLAPSIBLE SIDEBAR (lg+)
      ======================================================== */}
      <aside
        className={`hidden lg:flex inset-y-0 left-0 z-40 flex-col justify-between transition-all duration-300 ease-in-out border-r select-none shrink-0 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isLight
            ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
            : 'bg-slate-950 border-slate-800 text-slate-100'
        }`}
      >
        {/* Top Header: Brand Logo & Collapse Toggle */}
        <div className={`px-3.5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
          isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/80 bg-slate-900/50'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 shrink-0">
              <Utensils className="w-4.5 h-4.5 text-white" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 transition-opacity duration-200">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-sm tracking-tight text-slate-900 dark:text-white truncate">
                    {restaurantBrand.name}
                  </h1>
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 uppercase shrink-0">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium">
                  TPV Gastronómico
                </p>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className="flex p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer shrink-0"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Role Card inside Sidebar */}
        <div className={`px-3 py-2.5 border-b shrink-0 ${
          isLight ? 'border-slate-100 bg-slate-50/40' : 'border-slate-800/80 bg-slate-900/30'
        }`}>
          <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative shrink-0">
              <img
                src={waiter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={waiter.name}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-xl object-cover border-2 border-indigo-500/40 shadow-xs"
              />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                  {waiter.name.split(' ')[0]}
                </div>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider border ${roleInfo.badge}`}>
                    {roleInfo.title}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation List - Optimized compact height so ALL modules stay visible/reachable effortlessly */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 no-scrollbar">
          {!isCollapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Módulos Habilitados
            </div>
          )}

          {allowedNavItems.map(item => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-bold text-xs transition-all relative cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
              >
                <div className={`transition-transform duration-150 group-hover:scale-105 ${
                  isActive ? 'text-white' : isLight ? 'text-slate-500 group-hover:text-slate-900' : 'text-slate-400 group-hover:text-white'
                }`}>
                  {item.icon}
                </div>

                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate font-black text-xs leading-tight">
                      {item.label}
                    </div>
                    <div className={`text-[10px] truncate leading-tight ${
                      isActive ? 'text-indigo-100' : 'text-slate-400 opacity-85'
                    }`}>
                      {item.description}
                    </div>
                  </div>
                )}

                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black min-w-[18px] text-center shadow-xs shrink-0 tabular-nums ${
                    item.badgeColor || 'bg-amber-400 text-slate-950'
                  } ${isCollapsed ? 'absolute top-0.5 right-1.5' : ''}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Actions & Status Section */}
        <div className={`p-2.5 border-t shrink-0 space-y-2 ${
          isLight ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800/80 bg-slate-900/40'
        }`}>
          {canOpenCloseCash && (
            <button
              onClick={() => {
                sound.playTap();
                setCashModalMode(currentShift ? 'close' : 'open');
                setIsCashShiftModalOpen(true);
              }}
              title={currentShift ? 'Caja activa (Clic para arqueo o cierre Z)' : 'Caja cerrada (Clic para abrir)'}
              className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all flex items-center justify-between cursor-pointer ${
                currentShift
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              } ${isCollapsed ? 'justify-center' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                {currentShift ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {!isCollapsed && <span>{currentShift ? 'Caja Abierta' : 'Caja Cerrada'}</span>}
              </div>
              {!isCollapsed && currentShift && (
                <span className="font-mono text-[10px] font-black tabular-nums">
                  {formatCLP(currentShift.initialCash, currency)}
                </span>
              )}
            </button>
          )}

          <div className={`flex items-center gap-1.5 ${isCollapsed ? 'flex-col' : 'justify-between'}`}>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setThemeMode(isLight ? 'vibrant-dark' : 'vibrant-light');
                }}
                title={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {isLight ? <Moon className="w-3.5 h-3.5 text-sky-500" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={handleToggleSound}
                title={isSoundOn ? 'Sonido FX activado' : 'Sonido silenciado'}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                {isSoundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 opacity-40" />}
              </button>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                logout();
              }}
              title="Cerrar sesión / Bloquear terminal"
              className={`p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:text-rose-400 border border-rose-500/20 hover:border-rose-500 transition-all cursor-pointer flex items-center gap-1.5 ${
                !isCollapsed ? 'px-3 text-xs font-black' : ''
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================
          2. MOBILE BANKING-APP BOTTOM NAVIGATION BAR (< lg)
      ======================================================== */}
      {!hideMobileBottomNav && (
        <nav
          aria-label="Navegación principal móvil"
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl pb-safe transition-colors ${
            isLight
              ? 'bg-white/95 border-slate-200 text-slate-700 shadow-[0_-4px_24px_rgba(15,23,42,0.08)]'
              : 'bg-slate-950/95 border-slate-800 text-slate-300 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
            {primaryMobileTabs.map(tab => {
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleNavClick(tab.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? isLight
                        ? 'text-blue-600 font-black'
                        : 'text-blue-400 font-black'
                      : isLight
                      ? 'text-slate-500 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="mobile-bottom-indicator"
                      className="absolute top-0.5 w-8 h-1 rounded-full bg-blue-600 dark:bg-blue-400"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <div className="relative">
                    {tab.mobileIcon}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center tabular-nums shadow-xs">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] leading-tight tracking-tight truncate max-w-[68px]">
                    {tab.mobileLabel}
                  </span>
                </button>
              );
            })}

            {/* 5th Slot: "Menú / Más" Banking Hub Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                setIsMobileHubOpen(true);
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[48px] rounded-xl transition-all active:scale-95 cursor-pointer ${
                isMobileHubOpen || !primaryMobileTabs.some(t => t.id === activeView)
                  ? 'text-indigo-600 dark:text-indigo-400 font-black'
                  : isLight
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid2x2 className="w-5 h-5" />
              <span className="text-[10px] leading-tight tracking-tight">Menú</span>
            </button>
          </div>
        </nav>
      )}

      {/* ========================================================
          3. ANIMATED MOBILE BANKING HUB MODAL SHEET (< lg)
      ======================================================== */}
      <AnimatePresence>
        {isMobileHubOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsMobileHubOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340 }}
              className={`relative w-full max-h-[88vh] rounded-t-3xl border-t shadow-2xl flex flex-col overflow-hidden ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              {/* Drag Handle */}
              <div className="w-full pt-2.5 pb-1 flex justify-center shrink-0">
                <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Header: User Card & Close */}
              <div className="px-5 py-3 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={waiter.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={waiter.name}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-2xl object-cover border-2 border-indigo-500/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-black text-sm truncate">{waiter.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                      {roleInfo.title} · {restaurantBrand.name}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setIsMobileHubOpen(false);
                  }}
                  className={`min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center cursor-pointer ${
                    isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'
                  }`}
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Sheet Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Quick Cash Shift Card */}
                {canOpenCloseCash && (
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setIsMobileHubOpen(false);
                      setCashModalMode(currentShift ? 'close' : 'open');
                      setIsCashShiftModalOpen(true);
                    }}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer ${
                      currentShift
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-emerald-950/50 border-emerald-800 text-emerald-100'
                        : 'bg-gradient-to-r from-rose-600 to-amber-600 border-rose-500 text-white shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        currentShift ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-white/20 text-white'
                      }`}>
                        {currentShift ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-xs sm:text-sm">
                          {currentShift ? 'Turno de Caja Abierto' : 'Caja Central Cerrada'}
                        </div>
                        <div className="text-[11px] opacity-80 truncate">
                          {currentShift
                            ? `Fondo ${formatCLP(currentShift.initialCash, currency)} · Tocar para Arqueo / Cierre Z`
                            : 'Tocar aquí para abrir caja ahora'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                  </button>
                )}

                {/* Banking Grid of ALL Permitted Modules */}
                <div>
                  <div className="px-1 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Todos los Módulos ({allowedNavItems.length})
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {allowedNavItems.map(item => {
                      const isActive = activeView === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 min-h-[88px] text-center transition-all active:scale-95 cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-500 text-white shadow-md'
                              : isLight
                              ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100 shadow-2xs'
                              : 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                          }`}
                        >
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className={`absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums ${
                              isActive ? 'bg-white text-blue-700' : item.badgeColor || 'bg-amber-400 text-slate-950'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : isLight
                              ? 'bg-slate-100 text-blue-600'
                              : 'bg-slate-900 text-blue-400'
                          }`}>
                            {item.mobileIcon}
                          </div>
                          <span className="text-[11px] font-extrabold leading-tight line-clamp-2">
                            {item.mobileLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preferences & Session Controls */}
                <div className={`p-3 rounded-2xl border space-y-2.5 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playTap();
                        setThemeMode(isLight ? 'vibrant-dark' : 'vibrant-light');
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {isLight ? <Moon className="w-4 h-4 text-sky-500" /> : <Sun className="w-4 h-4 text-amber-400" />}
                      <span>{isLight ? 'Oscuro' : 'Claro'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer active:scale-95 ${
                        isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      {isSoundOn ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 opacity-50" />}
                      <span>{isSoundOn ? 'Sonido On' : 'Silencio'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Idioma</span>
                    <LanguageSelector variant="menu" className="scale-90 origin-right" />
                  </div>
                </div>

                {/* Logout Full Button */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setIsMobileHubOpen(false);
                    logout();
                  }}
                  className="w-full min-h-[48px] py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-[0.98] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión / Cambiar Terminal</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
