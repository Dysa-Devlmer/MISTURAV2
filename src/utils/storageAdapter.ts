/**
 * Diccionario centralizado de claves de persistencia del sistema POS.
 * Facilita el mapeo 1:1 hacia tablas SQL, colecciones NoSQL o endpoints REST
 * al migrar el frontend a cualquier backend (Node, Python, Go, C#, Java, etc.).
 */
export const POS_STORAGE_KEYS = {
  // Seguridad y sesión
  waiters: 'sysme_waiters',
  waiter: 'sysme_waiter',
  customRoles: 'sysme_custom_roles',
  sessionActive: 'sysme_session_active',
  language: 'sysme_lang',
  theme: 'sysme_theme',

  // Estación y catálogo
  warehouse: 'sysme_warehouse',
  terminal: 'sysme_terminal',
  categories: 'sysme_categories',
  products: 'sysme_products',
  catalogSeedVersion: 'sysme_catalog_seed_version',
  modifierGroups: 'sysme_modifier_groups',
  printAreas: 'sysme_print_areas',
  ticketSettings: 'sysme_ticket_settings',
  systemModules: 'sysme_system_modules',
  restaurantSettings: 'sysme_restaurant_settings',

  // Operación y caja
  tables: 'sysme_tables',
  sales: 'sysme_sales',
  activeSale: 'sysme_active_sale',
  activeView: 'sysme_active_view',
  clients: 'sysme_clients',
  currentShift: 'sysme_current_shift',
  shiftHistory: 'sysme_shift_history',
  reports: 'sysme_reports',
} as const;

/**
 * Contrato genérico de persistencia clave-valor.
 * Permite reemplazar localStorage por una API HTTP, IndexedDB o SQLite/SQL
 * sin modificar los componentes visuales ni las reglas de negocio.
 */
export interface KeyValueStorageAdapter {
  getItem<T>(key: string, fallback: T): T;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clearAll(): void;
}

export const browserStorageAdapter: KeyValueStorageAdapter = {
  getItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignorar errores de cuota llena en almacenamiento local
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },

  clearAll(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}
  },
};
