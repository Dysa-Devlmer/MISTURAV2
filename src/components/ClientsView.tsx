import React, { useState } from 'react';
import { usePOS } from '../context/POSContext';
import { CustomerClient } from '../types';
import { sound } from '../utils/sound';
import { formatCLP, normalizeCurrencySymbol } from '../utils/currency';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Plus, Download, Users, Edit2, Trash2, Check, X, Phone, Mail, MapPin, FileText, Truck, ChevronRight
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
    createChannelSale,
    currency,
    themeMode
  } = usePOS();

  const isLight = themeMode === 'vibrant-light';
  const curr = normalizeCurrencySymbol(currency);

  const [search, setSearch] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [mobileDetailClientId, setMobileDetailClientId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<CustomerClient | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    email: string;
    phone: string;
    taxId: string;
    address: string;
    fiscalAddress: string;
    group: CustomerClient['group'];
    notes: string;
  }>({
    name: '',
    email: '',
    phone: '',
    taxId: '',
    address: '',
    fiscalAddress: '',
    group: 'General',
    notes: '',
  });

  const filteredClients = clients.filter(c => {
    const matchGroup = groupFilter === 'all' || c.group === groupFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.taxId || '').toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const totalRevenue = clients.reduce((acc, c) => acc + c.totalSpent, 0);

  const openNewModal = () => {
    sound.playTap();
    setEditingClientId(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      taxId: '',
      address: '',
      fiscalAddress: '',
      group: 'General',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: CustomerClient) => {
    sound.playTap();
    setEditingClientId(c.id);
    setForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      taxId: c.taxId || '',
      address: c.address || '',
      fiscalAddress: c.fiscalAddress || '',
      group: c.group || 'General',
      notes: c.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    sound.playTap();
    if (editingClientId) {
      updateClient(editingClientId, form);
    } else {
      const created = addClient({
        ...form,
        origin: 'Manual',
        balance: 0,
        active: true,
      });
      setSelectedClientId(created.id);
    }
    setIsModalOpen(false);
  };

  const handleExportCsv = () => {
    sound.playTap();
    const header = ['Nombre', 'Correo', 'Teléfono', 'RUT/NIF', 'Dirección', 'Grupo', 'Pedidos', 'Total Gastado'];
    const rows = filteredClients.map(c => [
      c.name, c.email || '', c.phone || '', c.taxId || '', c.address || '', c.group || 'General', c.ordersCount, c.totalSpent
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes_gastrobar.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatMoney = (amount: number) => formatCLP(amount, currency);

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden select-none p-4 sm:p-6 space-y-4 ${
      isLight ? 'bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            <span>Clientes</span>
          </h1>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Directorio de clientes frecuentes, datos fiscales, historial de compras y despacho a domicilio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isLight ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
          <button
            type="button"
            onClick={openNewModal}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo cliente</span>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
        <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-[11px] font-bold text-slate-500">Total Clientes</div>
          <div className="text-xl font-black tabular-nums mt-0.5">{clients.length}</div>
        </div>
        <div className={`p-3.5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-[11px] font-bold text-slate-500">VIP / Empresa</div>
          <div className="text-xl font-black tabular-nums mt-0.5">
            {clients.filter(c => c.group === 'VIP' || c.group === 'Empresa').length}
          </div>
        </div>
        <div className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
          <div className="text-[11px] font-bold text-slate-500">Consumo Histórico</div>
          <div className="text-xl font-black font-mono tabular-nums mt-0.5 truncate">{formatMoney(totalRevenue)}</div>
        </div>
      </div>

      {/* Main Split: Left List + Right Detail Card (Desktop lg+) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col space-y-3 min-h-0">
          {/* Search + Group Filter */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, correo, teléfono o RUT..."
                className={`w-full min-h-[40px] rounded-xl border pl-9 pr-3 py-2 text-xs font-medium ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                }`}
              />
            </div>

            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className={`min-h-[40px] rounded-xl border px-3 py-2 text-xs font-medium ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <option value="all">Todos los grupos</option>
              <option value="VIP">VIP</option>
              <option value="Frecuente">Frecuente</option>
              <option value="Empresa">Empresa</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Mobile Card Feed (< md) */}
          <div className="md:hidden flex-1 overflow-y-auto space-y-2 pb-2">
            {filteredClients.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSelectedClientId(client.id);
                  setMobileDetailClientId(client.id);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer ${
                  isLight ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-black text-sm truncate">{client.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                    {client.group || 'General'} · {client.phone || client.email || 'Sin contacto'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-mono font-black text-xs tabular-nums">
                      {formatMoney(client.totalSpent)}
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {client.ordersCount} pedidos
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
            {filteredClients.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs">
                No se encontraron clientes.
              </div>
            )}
          </div>

          {/* Desktop/Tablet Table (md+) */}
          <div className={`hidden md:block flex-1 rounded-2xl border overflow-auto ${
            isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
          }`}>
            <table className="w-full text-left text-xs">
              <thead className={`sticky top-0 ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                <tr>
                  <th className="px-4 py-2.5 font-bold">Nombre</th>
                  <th className="px-4 py-2.5 font-bold hidden xl:table-cell">Correo</th>
                  <th className="px-4 py-2.5 font-bold">Teléfono</th>
                  <th className="px-4 py-2.5 font-bold">RUT / ID</th>
                  <th className="px-4 py-2.5 font-bold text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredClients.map(client => {
                  const isSelected = selectedClientId === client.id;
                  return (
                    <tr
                      key={client.id}
                      onClick={() => {
                        sound.playTap();
                        setSelectedClientId(client.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setMobileDetailClientId(client.id);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? isLight
                            ? 'bg-amber-50/90 text-slate-950 font-bold'
                            : 'bg-orange-950/40 text-white font-bold'
                          : isLight
                          ? 'hover:bg-slate-50'
                          : 'hover:bg-slate-800/60'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold">{client.name}</td>
                      <td className="px-4 py-3 truncate max-w-[160px] text-slate-500 dark:text-slate-400 hidden xl:table-cell">{client.email || '—'}</td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">{client.phone || '—'}</td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{client.taxId || '—'}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        client.balance < 0 ? 'text-rose-600' : ''
                      }`}>
                        {formatMoney(client.balance)}
                      </td>
                    </tr>
                  );
                })}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No se encontraron clientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT INSPECTOR CARD (Desktop lg+) */}
        <div className={`hidden lg:flex lg:col-span-4 rounded-2xl border p-5 flex-col overflow-y-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
        }`}>
          {selectedClient ? (
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black">{selectedClient.name}</h3>
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    Grupo: {selectedClient.group || 'General'} · Origen: {selectedClient.origin || 'Manual'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(selectedClient)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                    title="Editar cliente"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setClientToDelete(selectedClient);
                    }}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Eliminar cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs flex-1">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{selectedClient.email || 'Sin correo registrado'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="tabular-nums">{selectedClient.phone || 'Sin teléfono'}</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{selectedClient.address || 'Sin dirección de entrega'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono">{selectedClient.taxId || 'Sin RUT / NIF'}</span>
                </div>

                {selectedClient.notes && (
                  <div className={`p-3 rounded-lg border mt-2 ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}>
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Preferencias / Notas</div>
                    <p>{selectedClient.notes}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-500">Pedidos</div>
                    <div className="text-sm font-black tabular-nums">{selectedClient.ordersCount}</div>
                  </div>
                  <div className={`p-2.5 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                    <div className="text-[10px] text-slate-500">Total acumulado</div>
                    <div className="text-sm font-black font-mono tabular-nums">{formatMoney(selectedClient.totalSpent)}</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  createChannelSale({
                    orderType: 'delivery',
                    customerId: selectedClient.id,
                    customerName: selectedClient.name,
                    deliveryPhone: selectedClient.phone,
                    deliveryAddress: selectedClient.address,
                    deliveryFee: 2500,
                    openInPos: true,
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Nuevo Pedido Delivery para este Cliente</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Users className="w-10 h-10 opacity-40" />
              <p className="text-xs">Selecciona un cliente para ver sus datos y consumo</p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE / TABLET CLIENT INSPECTOR BOTTOM SHEET (< lg) */}
      <AnimatePresence>
        {mobileDetailClientId && selectedClient && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDetailClientId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className={`relative w-full md:max-w-md rounded-t-3xl md:rounded-3xl border shadow-2xl p-5 space-y-4 z-10 ${
                isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="md:hidden w-full pb-1 flex justify-center">
                <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-black">{selectedClient.name}</h3>
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {selectedClient.group || 'General'} · {selectedClient.taxId || 'Sin RUT'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDetailClientId(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-slate-400" /><span>{selectedClient.phone || 'Sin teléfono'}</span></div>
                <div className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-slate-400" /><span>{selectedClient.email || 'Sin correo'}</span></div>
                <div className="flex items-start gap-2.5"><MapPin className="w-4 h-4 text-slate-400 mt-0.5" /><span>{selectedClient.address || 'Sin dirección'}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDetailClientId(null);
                    openEditModal(selectedClient);
                  }}
                  className="min-h-[44px] py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const c = selectedClient;
                    setMobileDetailClientId(null);
                    setClientToDelete(c);
                  }}
                  className="min-h-[44px] py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileDetailClientId(null);
                  createChannelSale({
                    orderType: 'delivery',
                    customerId: selectedClient.id,
                    customerName: selectedClient.name,
                    deliveryPhone: selectedClient.phone,
                    deliveryAddress: selectedClient.address,
                    deliveryFee: 2500,
                    openInPos: true,
                  });
                }}
                className="w-full min-h-[48px] py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Nuevo Pedido Delivery</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NON-BLOCKING DELETE CONFIRMATION MODAL */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <h3 className="font-black text-sm">Confirmar eliminación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¿Eliminar al cliente <strong className="text-slate-900 dark:text-white">{clientToDelete.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteClient(clientToDelete.id);
                  if (selectedClientId === clientToDelete.id) setSelectedClientId('');
                  setClientToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-sm">
                {editingClientId ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nombre completo / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">RUT / ID Fiscal</label>
                  <input
                    type="text"
                    value={form.taxId}
                    onChange={e => setForm({ ...form, taxId: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Grupo</label>
                  <select
                    value={form.group}
                    onChange={e => setForm({ ...form, group: e.target.value as CustomerClient['group'] })}
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                    }`}
                  >
                    <option value="General">General</option>
                    <option value="Frecuente">Frecuente</option>
                    <option value="VIP">VIP</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Dirección de entrega</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Notas / Preferencias</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-xs font-medium ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-700 text-white'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
