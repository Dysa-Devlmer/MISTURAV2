# Guía Maestra de Desarrollo e Ingeniería — Sistema POS Gastronómico (`Dy Pos / Mistura`)

> **Documento técnico completo en español** para comprender absolutamente todo lo que contiene y hace el sistema actual, y construirlo **desde cero, paso a paso, página por página y función por función** en cualquier lenguaje de programación (**Python/FastAPI, Node.js/NestJS, C#/.NET, Java/Spring Boot, Go, PHP/Laravel**) para **App Web**, **Software Desktop** y **App Mobile** listas para producción real.

---

## Índice General

1. [Visión Multiplataforma (Web, Software Desktop y App Mobile)](#1-visión-multiplataforma-web-software-desktop-y-app-mobile)
2. [Estado Actual del Prototipo vs. Arquitectura Objetivo de Producción](#2-estado-actual-del-prototipo-vs-arquitectura-objetivo-de-producción)
3. [Modelo de Datos Completo y Esquema SQL / Entidades](#3-modelo-de-datos-completo-y-esquema-sql--entidades)
4. [Reglas de Negocio Puras (Moneda CLP, IVA 19%, Ventas y Caja)](#4-reglas-de-negocio-puras-moneda-clp-iva-19-ventas-y-caja)
5. [Seguridad, Roles, Matriz Completa de 38 Permisos y Modos de Estación](#5-seguridad-roles-matriz-completa-de-38-permisos-y-modos-de-estación)
6. [Catálogo Completo de Endpoints REST API y Eventos WebSocket](#6-catálogo-completo-de-endpoints-rest-api-y-eventos-websocket)
7. [Inventario Completo de Páginas, Funciones y Modales](#7-inventario-completo-de-páginas-funciones-y-modales)
8. [Plan Paso a Paso para Construir y Probar Módulo por Módulo (Fases 0 a 10)](#8-plan-paso-a-paso-para-construir-y-probar-módulo-por-módulo-fases-0-a-10)
9. [Adaptación Específica para Software Desktop y App Mobile](#9-adaptación-específica-para-software-desktop-y-app-mobile)

---

## 1. Visión Multiplataforma (Web, Software Desktop y App Mobile)

Para que el sistema funcione en producción en **Web**, **PC/Windows/Mac/Linux (Software)** y **Android/iOS (Mobile)** sin duplicar reglas contables ni romper datos entre dispositivos:

```text
                    ┌──────────────────────────────────────────┐
                    │         BACKEND CENTRAL (API REST)       │
                    │  • Autenticación PIN/JWT + RBAC (38 perm)│
                    │  • Motor Contable CLP + IVA 19%          │
                    │  • Base de Datos SQL (PostgreSQL/MySQL)  │
                    │  • WebSockets (Mesas, KDS, Delivery, QR) │
                    └──────────────┬──────────────┬────────────┘
                                   │              │
         ┌─────────────────────────┼──────────────┼─────────────────────────┐
         ▼                         ▼              ▼                         ▼
┌─────────────────┐      ┌─────────────────┐ ┌─────────────────┐   ┌─────────────────┐
│   1. APP WEB    │      │ 2. SOFTWARE PC  │ │ 3. APP MOBILE   │   │ 4. PORTAL QR    │
│ Navegador/Tablet│      │ Electron/Tauri/ │ │ Flutter/RN/     │   │ Comensal Mesa N │
│ Admin, Caja,    │      │ .NET/JavaFX     │ │ Kotlin/Swift    │   │ Carta digital,  │
│ Dashboard, KDS  │      │ + Puente TCP    │ │ • Garzón Salón  │   │ modificar plato,│
│                 │      │   ESC/POS local │ │ • Repartidor    │   │ pedir y llamar  │
└─────────────────┘      └─────────────────┘ └─────────────────┘   └─────────────────┘
```

### Regla de Oro de Diseño Multi-lenguaje
1. **Ninguna pantalla calcula totales definitivos por su cuenta:** Las apps clientes (Web, PC, Móvil) pueden mostrar previsualizaciones instantáneas, pero **el Backend es la única fuente de verdad** para:
   - Stock descontado al confirmar pedido.
   - Subtotales netos e IVA (19%).
   - Asociación de venta cobrada a un turno de caja (`shiftId`).
   - Cálculo de Arqueo Z y diferencias de cajón.
2. **Todo dinero viaja como entero (CLP):** Nunca usar `float` o `double` para dinero. Usar enteros (`BIGINT` / `INTEGER` en SQL, `int`/`long`/`decimal(12,0)` en backend).

---

## 2. Estado Actual del Prototipo vs. Arquitectura Objetivo de Producción

### Qué hace actualmente el servidor y almacenamiento del repositorio
- **Servidor actual (`server.ts`):**
  - Corre en puerto `3000` (`0.0.0.0:3000`).
  - CORS habilitado + parseo JSON.
  - Único endpoint backend actual:
    - `GET /api/health` -> responde `{ status: 'ok', version: '5.4 PRO', system: 'SYSME TPV MISTURA', timestamp: ISO8601 }`.
  - En desarrollo monta Vite (`vite.middlewares`); en producción sirve `dist/index.html` (SPA fallback `*`).
- **Persistencia actual (`src/context/POSContext.tsx` y `src/utils/storageAdapter.ts`):**
  - Usa `localStorage` bajo 20 claves (`POS_STORAGE_KEYS`: `sysme_waiters`, `sysme_waiter`, `sysme_custom_roles`, `sysme_categories`, `sysme_products`, `sysme_tables`, `sysme_sales`, `sysme_active_sale`, `sysme_clients`, `sysme_current_shift`, `sysme_shift_history`, `sysme_reports`, `sysme_print_areas`, `sysme_modifier_groups`, `sysme_ticket_settings`, `sysme_system_modules`, `sysme_restaurant_settings`, `sysme_terminal`, `sysme_warehouse`, `sysme_catalog_seed_version`), más `sessionStorage['sysme_session_active']` y evento `window.addEventListener('storage', ...)` para sincronización básica entre pestañas del mismo navegador.
- **Lógica ya desacoplada y lista para portar (carpeta `src/utils/`):**
  - `currency.ts`: Aritmética CLP entera, IVA 19%, denominaciones Chile (`$20.000` a `$10`).
  - `cashShift.ts`: Cálculo determinista de turnos y Cierre Z aislado por `shiftId`.
  - `salesCalculator.ts`: Líneas de venta, descuentos %, extras de modificadores, neto + IVA + envío.
  - `permissions.ts`: Control de acceso RBAC por rol, vista, estación y permisos granulares.
  - `storageAdapter.ts`: Interfaz abstracta `KeyValueStorageAdapter` preparada para sustituir `localStorage` por llamadas HTTP/SQL.

> **Al pasar a producción real** con varios dispositivos simultáneos (PC Caja + Celulares de Garzones + Tablet Cocina KDS + Celulares de Clientes QR), sustituyes `localStorage` por las tablas SQL y endpoints REST + WebSockets detallados en este documento.

---

## 3. Modelo de Datos Completo y Esquema SQL / Entidades

Todas las entidades del dominio (`src/types.ts`) deben mapearse a tablas relacionales de la siguiente manera:

### 3.1 Seguridad, Personal, Roles y Configuración del Sistema
1. **`custom_roles` (`CustomRole`)**
   - `id` (VARCHAR PK, ej. `'role-admin'`, `'role-cashier'`, `'role-custom-123'`)
   - `name` (VARCHAR, único)
   - `description` (TEXT)
   - `base_role` (ENUM: `'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'delivery'`)
   - `is_waiter` (BOOLEAN)
   - `is_delivery_driver` (BOOLEAN)
   - `permissions_json` (JSONB/TEXT — mapa `{ "salon.view": true, ... }` con las 38 llaves de `PERMISSION_CATALOG`)

2. **`users` / `waiters` (`Waiter`)**
   - `id` (SERIAL / BIGINT PK)
   - `name` (VARCHAR NOT NULL)
   - `username` (VARCHAR NULL)
   - `pin_hash` (VARCHAR NOT NULL — en producción guardar hash bcrypt/argon2, nunca PIN en texto plano)
   - `role` (ENUM `'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'delivery'`)
   - `custom_role_id` (VARCHAR FK -> `custom_roles.id`, NULLABLE)
   - `avatar_url` (TEXT)
   - `email` (VARCHAR)
   - `phone` (VARCHAR)
   - `active` (BOOLEAN DEFAULT true)
   - `last_login_at` (TIMESTAMP NULL)
   - `permissions_override_json` (JSONB — estructura `UserPermissions`)

3. **`restaurant_settings` (`RestaurantSettings`)**
   - `id` (INT PK = 1)
   - `name`, `tagline`, `cif` (RUT/NIF), `address`, `phone`, `city`, `postal_code`
   - `currency` (VARCHAR DEFAULT `'$'`)
   - `tip_percentage` (INT DEFAULT `10`)
   - `ticket_footer` (TEXT)

4. **`system_modules_config` (`SystemModulesConfig` — 13 interruptores modulares)**
   - `id` (INT PK = 1)
   - `daily_cash_close` (BOOLEAN) — Arqueo de caja diario
   - `inventory_control` (BOOLEAN) — Control de inventario
   - `online_store` (BOOLEAN) — Tienda online
   - `qr_menu` (BOOLEAN) — Carta QR
   - `kitchen_kds` (BOOLEAN) — Monitor de cocina KDS
   - `invoicing` (BOOLEAN) — Emisión de boletas/facturas
   - `clients_and_suppliers` (BOOLEAN) — Gestión de clientes y proveedores
   - `expense_control` (BOOLEAN) — Control de gastos
   - `graphical_reports` (BOOLEAN) — Reportes gráficos y resultados
   - `whatsapp_agent` (BOOLEAN) — Agente de WhatsApp
   - `reservations` (BOOLEAN) — Reservas
   - `card_terminal` (BOOLEAN) — Terminal de pagos con tarjeta
   - `delivery_and_counter` (BOOLEAN) — Delivery y Mostrador Express

5. **`warehouses` (`Warehouse`) y `pos_terminals` (`POSTerminal`)**
   - `warehouses`: `id`, `name`, `description`
   - `pos_terminals`: `id`, `name`, `code`, `is_open`, `initial_cash` (INT CLP)

### 3.2 Salones, Mesas, Catálogo y Modificadores
6. **`salons` (`Salon`) y `dining_tables` (`Table`)**
   - `salons`: `id`, `name`, `icon` (ej. Salón Principal, Terraza Exterior, Barra & Tapas, Reservado VIP)
   - `dining_tables`:
     - `id` (INT PK), `number` (VARCHAR, ej. `'1'`, `'T1'`, `'B1'`, `'VIP1'`, `'PL'`), `name`, `salon_id` (FK -> `salons.id`)
     - `seats` (INT), `status` (ENUM `'free' | 'occupied' | 'kitchen' | 'billed'`)
     - `x`, `y`, `width`, `height` (coordenadas visuales en plano interactivo), `shape` (`'square' | 'round' | 'rectangle'`)
     - `current_sale_id` (BIGINT FK -> `sales.id`, NULLABLE), `ticket_number`, `preticket_printed` (BOOLEAN)
     - `diners` (INT), `opened_at` (VARCHAR/TIME), `waiter_id` (FK -> `users.id`), `waiter_name`, `current_waiter_name`, `total` (INT CLP)

7. **`categories` (`Category`) y `subcategories` (`Subcategory`)**
   - `categories`: `id`, `name`, `icon`, `color`, `image`, `sort_order`
   - `subcategories`: `id`, `category_id` (FK), `name`

8. **`products` (`Product`) y `product_options` (`ProductOption`)**
   - `products`:
     - `id` (VARCHAR PK, ej. `'ENT-01'`), `name`, `category_id` (FK), `subcategory_id` (NULLABLE)
     - `price` (INT CLP con IVA incluido), `buy_price` (INT CLP costo)
     - `iva` (INT — `19` en Chile general o `0` exento)
     - `stock` (INT), `min_stock` (INT), `image` (TEXT), `is_kitchen` (BOOLEAN)
     - `kitchen_block` (INT `1..4`: 1=Entradas/Bebidas, 2=Fondos, 3=Postres, 4=Barra)
     - `description` (TEXT), `allergens_json` (JSONB array), `available` (BOOLEAN)
     - `is_combination` (BOOLEAN), `combination_group` (VARCHAR)
   - `product_options`: `id`, `product_id` (FK), `name`, `price_extra` (INT CLP)

9. **`modifier_groups` (`ModifierGroup`) y `modifier_options` (`ModifierOptionItem`)**
   - `modifier_groups`: `id` (VARCHAR PK), `name`, `icon` (`'flame'|'utensils'|'package'|'alert'|'sparkles'`), `color`, `multi_select` (BOOLEAN), `required` (BOOLEAN), `category_ids_json` (JSONB array de `category_id`; vacío `[]` aplica a todas las categorías).
   - `modifier_options`: `id`, `group_id` (FK), `name`, `price_extra` (INT CLP), `active` (BOOLEAN).

10. **`rates` (`Rate`)**
    - `id` (`'standard'`, `'happy_hour'`, `'staff'`, `'vip'`), `name`, `multiplier` (DECIMAL `1.0`, `0.85`, etc.), `is_default` (BOOLEAN).

### 3.3 Clientes, Ventas, Líneas de Comanda y Canal Delivery
11. **`clients` (`CustomerClient`)**
    - `id` (VARCHAR PK), `name`, `email`, `phone`, `tax_id` (RUT), `address`, `fiscal_address`
    - `origin` (`'TPV'|'Delivery'|'Web'|'Manual'`), `client_group` (`'General'|'VIP'|'Frecuente'|'Empresa'`)
    - `notes`, `balance` (INT CLP cuenta corriente), `orders_count` (INT), `total_spent` (INT CLP), `created_at`, `active` (BOOLEAN).

12. **`sales` (`Sale`)**
    - `id` (BIGINT PK), `number` (VARCHAR), `ticket_number` (VARCHAR)
    - `date` (VARCHAR `dd-mm-aaaa`), `time` (VARCHAR `HH:mm`), `table_number`, `table_name`, `salon_id`, `salon_name`, `diners` (INT)
    - `waiter_id` (FK creador), `waiter_name`, `current_waiter_id`, `current_waiter_name`
    - `rate_id`, `rate_name`
    - `status` (ENUM `'open' | 'closed' | 'parked' | 'cancelled'`)
    - `order_type` (ENUM `'salon' | 'mostrador' | 'delivery' | 'express'`)
    - `delivery_status` (ENUM `'preparing' | 'ready' | 'dispatched' | 'delivered'`)
    - `customer_id` (FK -> `clients.id`), `customer_name`, `delivery_address`, `delivery_phone`
    - `driver_id` (FK -> `users.id`), `driver_name`, `delivery_fee` (INT CLP)
    - `subtotal` (INT CLP neto), `tax_total` (INT CLP IVA 19%), `total` (INT CLP bruto + envío)
    - `payment_method` (ENUM `'cash' | 'card' | 'crypto' | 'other'`)
    - `payment_details_json` (`cash_given`, `change`, `card_ref`, `crypto_tx`)
    - `observations`, `notes`, `preticket_printed` (BOOLEAN)
    - `shift_id` (VARCHAR FK -> `cash_shifts.id` — **obligatorio al cobrar para aislar Arqueo Z**)
    - `created_at` (TIMESTAMP), `closed_at` (TIMESTAMP NULL)

13. **`sale_lines` (`SaleLine`)**
    - `id` (VARCHAR PK), `sale_id` (BIGINT FK -> `sales.id` ON DELETE CASCADE), `line_id` (INT orden)
    - `product_id` (FK -> `products.id`), `product_name`, `quantity` (INT)
    - `unit_price` (INT CLP con tarifa + extras), `original_price` (INT CLP), `modifiers_extra_price` (INT CLP)
    - `iva` (INT `19` o `0`), `discount` (INT `0..100`), `total` (INT CLP)
    - `kitchen_notes`, `observations`, `kitchen_block` (`1..4`), `course_block`
    - `kitchen_status` (ENUM `'pending' | 'cooking' | 'ready' | 'served'`)
    - `selected_option` (TEXT), `sent_to_kitchen_at` (TIMESTAMP)
    - `waiter_id`, `waiter_name`, `added_at_time`, `sent_by_waiter_id`, `sent_by_waiter_name`

### 3.4 Caja, Movimientos, Informes Z e Impresoras
14. **`cash_shifts` (`CashShift`)**
    - `id` (VARCHAR PK, ej. `'SHIFT-20261113-001'`), `terminal_id`, `terminal_name`
    - `opened_by`, `opened_at_date`, `opened_at_time`, `opened_at_iso` (TIMESTAMP ISO exacto)
    - `initial_cash` (INT CLP), `status` (`'open' | 'closed'`)
    - `closed_by`, `closed_at_date`, `closed_at_time`, `cash_counted` (INT CLP), `difference` (INT CLP), `report_id`, `notes`

15. **`cash_movements` (`CashMovement`)**
    - `id` (VARCHAR PK), `shift_id` (VARCHAR FK -> `cash_shifts.id`)
    - `type` (`'in' | 'out'`), `amount` (INT CLP), `concept`, `category` (`'supplier'|'advance'|'deposit'|'petty_cash'|'change'|'other'`)
    - `user_name`, `date`, `time`, `receipt_number`, `notes`

16. **`cash_register_reports` (`CashRegisterReport` — Historial Fiscal Z)**
    - `id` (VARCHAR PK, ej. `'Z-20261113-001'`), `date`, `time`, `terminal_id`, `terminal_name`, `opened_by`, `closed_by`
    - `initial_cash`, `cash_sales`, `card_sales`, `crypto_sales`, `other_sales`, `total_sales`, `total_tax`, `cash_counted`, `difference` (todos INT CLP), `sales_count` (INT), `notes`

17. **`print_areas` (`PrintArea`) y `ticket_print_settings` (`TicketPrintSettings`)**
    - `print_areas`: `id`, `name`, `printer_name`, `connection_type` (`'network'|'usb'|'bluetooth'`), `ip_or_port`, `paper_width` (`'58mm'|'80mm'`), `copies`, `category_ids_json`, `auto_cut`, `active`, `notes`.
    - `ticket_print_settings`: dos registros (`'precuenta'` y `'comanda'`) con `print_logo`, `header_text`, `footer_text`, `show_currency_symbol`, `sale_id_format` (`'last4'|'full'|'none'`), `max_product_name_length`, `suggest_tip`, `tip_percentage`, `paper_width`, `font_size` (`'compact'|'normal'|'large'`), `show_waiter`, `show_table`, `show_time`, `show_diners`, `show_subtotal_tax`, `auto_print`, `copies`, `printer_area_id`.

---

## 4. Reglas de Negocio Puras (Moneda CLP, IVA 19%, Ventas y Caja)

Estas reglas deben implementarse de forma idéntica en tu **Backend** y validarse con pruebas unitarias antes de construir pantallas:

### 4.1 Aritmética CLP e IVA 19% (`src/utils/currency.ts`)
- `roundCLP(n)`: redondea al entero más cercano (`Math.round`), sin decimales.
- `calculateNetAndIva(grossTotal, ivaPercent = 19)`:
  ```text
  gross = roundCLP(grossTotal)
  si ivaPercent <= 0 -> net = gross, iva = 0
  si no:
    net = roundCLP(gross / (1 + ivaPercent / 100))
    iva = gross - net
  ```
  > **Identidad invariante:** `net + iva === gross` siempre se cumple al peso exacto.
- Formateo Chile (`es-CL`): `$15.900`, con signo `+$15.900` o `-$12.500`.
- Denominaciones oficiales CLP en arqueo: `[20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10]`.
- Billetes rápidos de cobro: `[5000, 10000, 20000, 40000, 50000]`.

### 4.2 Cálculo de Líneas y Comandas (`src/utils/salesCalculator.ts`)
1. **Total de línea:**
   ```text
   total_linea = roundCLP(roundCLP(unit_price) * quantity * (1 - discount / 100))
   ```
2. **Precio unitario con tarifa y modificadores:**
   ```text
   unit_price = roundCLP(roundCLP(product.price * rate.multiplier) + roundCLP(extra_price))
   ```
3. **Agrupación al añadir ítem (`upsertProductIntoSaleLines`):**
   - Solo se suma cantidad a una línea existente si coincide `product_id`, tiene `kitchen_status === 'pending'`, no tiene notas ni opciones ni extras de modificador, y pertenece al mismo garzón (o sin asignar). En caso contrario se crea línea nueva para preservar notas, tiempos de pase o autoría.
4. **Total de venta (`recalculateSaleWithItems`):**
   - `subtotal` = suma de `net` de todas las líneas.
   - `tax_total` = suma de `iva` de todas las líneas.
   - `active_delivery_fee` = `items.length > 0 ? roundCLP(sale.delivery_fee) : 0`.
   - `total` = `roundCLP(suma_bruta_lineas + active_delivery_fee)`.

### 4.3 Turnos de Caja y Arqueo Z (`src/utils/cashShift.ts`)
1. **Aislamiento estricto por turno (`getShiftClosedSales`):**
   - Nunca mezclar ventas cerradas de turnos anteriores.
   - Si no hay turno abierto (`status !== 'open'`), retorna lista vacía `[]`.
   - Solo suma ventas donde `sale.status === 'closed'` y `sale.shift_id === currentShift.id` (con respaldo temporal `sale.closed_at >= currentShift.opened_at_iso` para datos heredados sin `shift_id`).
2. **Fórmula de Efectivo Esperado en Cajón:**
   ```text
   entradas = suma(movements where type == 'in')
   salidas  = suma(movements where type == 'out')
   efectivo_esperado = initial_cash + ventas_efectivo_del_turno + entradas - salidas
   ```
   *(Las ventas con Tarjeta, Cripto/QR y Cargo a Habitación se registran en el Informe Z pero NO se suman al efectivo físico del cajón).*
3. **Cálculo de Diferencia / Descuadre:**
   - El conteo físico de billetes/monedas inicia **siempre en `$0`** al abrir el Arqueo Z (sin valores precargados ficticios).
   - `diferencia = roundCLP(total_contado_fisico - efectivo_esperado)`
   - `diferencia === 0`: Caja Cuadrada Exacta.
   - `diferencia > 0`: Sobrante en Caja.
   - `diferencia < 0`: Faltante / Descuadre en Caja.

### 4.4 Reglas de Stock e Inventario
- Al agregar ítem al pedido (TPV, Mostrador/Delivery o Pedido QR comensal): descontar `stock = max(0, stock - quantity)`.
- Al eliminar línea o anular comanda: devolver `stock = stock + quantity`.

---

## 5. Seguridad, Roles, Matriz Completa de 38 Permisos y Modos de Estación

### 5.1 Reglas Fundamentales de Seguridad
- **Prohibido el auto-registro libre:** Nadie puede crear su propia cuenta desde el Login. **Únicamente un Administrador autenticado** (con permiso `admin.users` / `canManageUsers`) puede dar de alta, editar o desactivar operadores desde `Administración -> Personal`.
- **Login sin exposición de PIN:** Los PINs nunca se muestran ni autocompletan en pantalla ni en listados públicos. El backend retorna usuarios **sin** `pin_hash`.
- **Autorización doble (Backend + Frontend):** Ocultar botones en la UI es solo comodidad visual; el backend debe rechazar con HTTP `403 Forbidden` cualquier llamada cuyo token no posea el permiso requerido.

### 5.2 Los 6 Roles Base (`UserRole`)
| Rol | Vista Inicial (`getDefaultViewForUser`) | Propósito y Alcance |
| :--- | :--- | :--- |
| **`admin`** | `dashboard` | Control total de salones, caja, catálogo, inventario, reportes, impresoras, roles, usuarios y BD. |
| **`manager`** | `dashboard` | Gestión operativa de salón, delivery, catálogo, inventario, KDS y reportes (sin gestión de usuarios salvo permiso). |
| **`cashier`** | `floor` | Apertura/cierre Z de caja, movimientos, cobros de mesas/delivery/express, precuentas, clientes y reportes del turno. |
| **`waiter`** | `floor` | Toma de pedidos en mesas, notas, envío a cocina y carta QR. En móvil/comandero queda bloqueado a `floor`, `pos`, `pending-sales` y `menu`. |
| **`kitchen`** | `kitchen` | Exclusivo para Monitor de Cocina KDS y consulta de carta. No ve caja, reportes ni administración. |
| **`delivery`** | `delivery` | Gestión de pedidos delivery asignados, estados (`ready -> dispatched -> delivered`) y consulta de carta. |

### 5.3 Los 38 Permisos Granulares del Catálogo (`PERMISSION_CATALOG`)
Cada rol personalizado (`CustomRole`) combina permisos de 9 áreas:
1. **Salón (`salon.*` — 7):** `salon.view`, `salon.open_table`, `salon.add_items`, `salon.send_kitchen`, `salon.transfer_table`, `salon.print_preticket`, `salon.edit_layout`
2. **Delivery (`delivery.*` — 5):** `delivery.view`, `delivery.create`, `delivery.assign_driver`, `delivery.change_status`, `delivery.express`
3. **Ventas (`ventas.*` — 5):** `ventas.view_open`, `ventas.charge`, `ventas.discounts`, `ventas.cancel`, `ventas.edit_prices`
4. **Productos (`productos.*` — 4):** `productos.view`, `productos.edit`, `productos.modifiers`, `productos.stock`
5. **Gastos y Proveedores (`gastos.*` — 2):** `gastos.view`, `gastos.create`
6. **Clientes (`clientes.*` — 3):** `clientes.view`, `clientes.edit`, `clientes.credit`
7. **Reportes (`reportes.*` — 3):** `reportes.view_sales`, `reportes.z_close`, `reportes.export`
8. **Finanzas (`finanzas.*` — 3):** `finanzas.open_close_cash`, `finanzas.cash_movements`, `finanzas.view_totals`
9. **Administración (`admin.*` — 5):** `admin.users`, `admin.roles`, `admin.printers`, `admin.modules`, `admin.settings`

Además, `mapCustomRoleToUserPermissions(role)` traduce esas 38 llaves a los flags rápidos de ejecución (`canOpenCloseCash`, `canCashMovements`, `canCancelSales`, `canApplyDiscounts`, `canEditCatalog`, `canManageUsers`, `canViewFinancialReports`, `canTransferTables`, `canCharge`, `canCloseBills`, `canPrintPrebill`, `canPrintPrebills`).

### 5.4 Modos de Estación y Detección de Dispositivo (`App.tsx` / `POSContext.tsx`)
| Parámetro URL / Contexto | Modo (`DeviceStationMode`) | Comportamiento |
| :--- | :--- | :--- |
| `/` (normal en PC/Tablet) | `master-pc` | Estación completa según permisos del usuario autenticado. |
| `/?station=waiter-mobile` o móvil con rol `waiter` | `waiter-mobile` | Interfaz táctil móvil optimizada para salón; acceso restringido a `floor`, `pos`, `pending-sales`, `menu`. Sin cobro ni cierre de caja. |
| `/?station=kitchen-kds` | `kitchen-kds` | Pantalla dedicada de Cocina KDS en tiempo real por bloques de marcha. |
| `/?mode=customer&table=N` | Portal Comensal QR (`CustomerPortal`) | Público sin login de empleado. Carta QR interactiva de la Mesa `N`, carrito con modificadores, envío directo a cocina y botón "Llamar al Garzón". |

---

## 6. Catálogo Completo de Endpoints REST API y Eventos WebSocket

> **Nota:** Hoy el backend (`server.ts`) expone únicamente `GET /api/health`. La siguiente especificación define el contrato completo a implementar en el backend de producción para conectar **App Web + Software Desktop + App Mobile**.

### 6.1 Salud y Sesión
| Método | Endpoint | Permiso / Acceso | Descripción y Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Público | *(Ya implementado)* Estado del servidor, versión y hora UTC. |
| `GET` | `/api/auth/operators` | Público (red local TPV) | Lista operadores activos (`id`, `name`, `role`, `avatar`) **sin PIN** para mostrar tarjetas de acceso en LoginScreen. |
| `POST` | `/api/auth/login` | Público | Recibe `{ operatorId?, pin, terminalId, warehouseId }`. Verifica PIN con hash. Retorna `{ tokenJWT, user, permissions, activeShift }`. |
| `POST` | `/api/auth/logout` | Autenticado | Cierra sesión actual y registra bitácora sin destruir el turno de caja abierto. |
| `POST` | `/api/auth/verify-pin` | Autenticado | Valida PIN de supervisor o dueño de mesa ocupada (`EmployeePasswordModal` / `LoginModal`). |

### 6.2 Administración: Usuarios, Roles, Módulos, Impresoras y Ajustes
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | `admin.users` o lectura TPV | Lista personal del local (`waiters`). |
| `POST` | `/api/users` | `admin.users` (Solo Admin) | Crea nuevo operador con `name`, `pin`, `role`, `customRoleId`, `email`, `phone`, `active`, `avatar`. |
| `PATCH` | `/api/users/:id` | `admin.users` (Solo Admin) | Edita operador, rol asignado, estado activo o resetea PIN. |
| `DELETE` | `/api/users/:id` | `admin.users` (Solo Admin) | Elimina o desactiva operador (protege no eliminar último admin). |
| `GET` | `/api/roles` | Autenticado | Lista roles personalizados (`CustomRole[]`). |
| `POST/PATCH/DELETE` | `/api/roles`, `/api/roles/:id` | `admin.roles` | Crea, edita matriz de 38 permisos o elimina rol personalizado. |
| `GET/PATCH` | `/api/settings/modules` | `GET` Auth / `PATCH admin.modules` | Lee o actualiza los 13 interruptores de `SystemModulesConfig`. |
| `GET/PATCH` | `/api/settings/brand` | `GET` Público/QR / `PATCH admin.settings` | Datos fiscales del local (`name`, `cif`, `address`, `currency`, `tipPercentage`, `ticketFooter`). |
| `GET/PATCH/POST` | `/api/settings/tickets` | `admin.printers` | Lee, guarda o restablece plantillas `precuenta` y `comanda`. |
| `GET/POST/PATCH/DELETE` | `/api/printers` | `admin.printers` | CRUD de áreas e impresoras térmicas (`PrintArea`: IP:puerto, USB, Bluetooth, categorías enrutadas). |
| `POST` | `/api/printers/:id/test` | `admin.printers` | Envía ticket de prueba ESC/POS al área seleccionada. |

### 6.3 Catálogo, Modificadores e Inventario
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/catalog` | Público (TPV + Carta QR) | Devuelve `categories`, `products` (con `options` y `allergens`), `modifierGroups` y `rates`. |
| `POST/PATCH/DELETE` | `/api/categories`, `/api/categories/:id` | `productos.edit` | Gestión de categorías y orden visual. |
| `POST/PATCH/DELETE` | `/api/products`, `/api/products/:id` | `productos.edit` | CRUD de platos/bebidas (valida `price >= 0` CLP entero, `iva` `19` o `0`, `kitchenBlock`). |
| `PATCH` | `/api/products/:id/stock` | `productos.stock` | Ajuste rápido de inventario o reposición masiva. |
| `POST/PATCH/DELETE` | `/api/modifiers`, `/api/modifiers/:id` | `productos.modifiers` | CRUD de grupos de modificadores y opciones con `priceExtra` en CLP. |

### 6.4 Salones, Mesas, Comandas y Cobros
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/salons` | `salon.view` | Lista salones y todas sus mesas con estado actual y totales en CLP. |
| `POST` | `/api/tables/:id/open` | `salon.open_table` | Abre mesa con `{ diners, waiterId }` (crea `Sale` abierta y cambia mesa a `occupied`). |
| `GET` | `/api/sales` | `ventas.view_open` / `salon.view` | Lista ventas filtrables por `status` (`open`, `closed`, `cancelled`), `orderType`, `shiftId`. |
| `POST` | `/api/sales` | `salon.add_items` o `delivery.create` | Crea venta directa, `delivery`, `mostrador` o `express`. |
| `POST` | `/api/sales/:id/items` | `salon.add_items` | Agrega producto(s) con cantidad, opciones, modificadores, nota y bloque; descuenta stock en transacción SQL. |
| `PATCH` | `/api/sales/:id/items/:lineId` | `salon.add_items` / `ventas.discounts` | Actualiza cantidad, nota, modificadores o descuento `%` (requiere `ventas.discounts` si `discount > 0`). |
| `DELETE` | `/api/sales/:id/items/:lineId` | `salon.add_items` / `ventas.cancel` | Elimina línea y devuelve stock (requiere `ventas.cancel` si la línea ya fue enviada a cocina). |
| `POST` | `/api/sales/:id/send-kitchen` | `salon.send_kitchen` | Marca líneas `pending -> cooking`, asigna `sentToKitchenAt`, imprime comanda por `PrintArea` y notifica KDS por WebSocket. |
| `POST` | `/api/sales/:id/transfer-table` | `salon.transfer_table` | Traspasa orden activa hacia mesa destino libre (`targetTableId`). |
| `POST` | `/api/sales/:id/preticket` | `salon.print_preticket` | Marca `preticketPrinted = true`, pasa mesa a `billed` y genera vista/impresión de precuenta. |
| `POST` | `/api/sales/:id/checkout` | `ventas.charge` | Cobra comanda (`cash`, `card`, `crypto`, `other`), calcula vuelto, asigna `shift_id` del turno activo, cierra venta, libera mesa. |
| `POST` | `/api/sales/:id/cancel` | `ventas.cancel` | Anula venta completa, devuelve stock de líneas y libera mesa. |

### 6.5 Cocina KDS, Delivery, Clientes y Portal QR Público
| Método | Endpoint | Permiso / Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/kitchen/queue` | Rol `kitchen`/`admin`/`manager` | Lista comandas abiertas con ítems `isKitchen` pendientes o en preparación agrupadas por bloque. |
| `PATCH` | `/api/kitchen/sales/:id/lines/:lineId/served` | Cocina KDS | Marca una línea individual como `served`. |
| `POST` | `/api/kitchen/sales/:id/serve-all` | Cocina KDS | Marca todos los platos de la comanda como listos/servidos y avisa al garzón por WebSocket. |
| `PATCH` | `/api/delivery/sales/:id/status` | `delivery.change_status` | Cambia `deliveryStatus`: `preparing -> ready -> dispatched -> delivered`. |
| `PATCH` | `/api/delivery/sales/:id/driver` | `delivery.assign_driver` | Asigna o reasigna repartidor a un pedido delivery. |
| `GET/POST/PATCH/DELETE` | `/api/clients`, `/api/clients/:id` | `clientes.view` / `clientes.edit` | Directorio CRM de clientes, RUT, dirección y saldo. |
| `POST` | `/api/public/qr/order` | Público (Carta QR) | Recibe pedido del comensal `{ tableNumber, items[] }`; crea o anexa a la venta abierta de esa mesa, descuenta stock y dispara KDS. |
| `POST` | `/api/public/qr/call-waiter` | Público (Carta QR) | Registra solicitud (`cuenta`, `cubiertos`, `atencion`, `agua`) y emite alerta en tiempo real al garzón. |

### 6.6 Caja, Movimientos, Informes Z y Base de Datos
| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cash-shifts/current` | `finanzas.view_totals` / caja | Devuelve turno abierto actual + resumen calculado exclusivamente para este turno. |
| `POST` | `/api/cash-shifts/open` | `finanzas.open_close_cash` | Abre nuevo turno con `initialCash` CLP y `openedAtIso`. |
| `POST` | `/api/cash-shifts/current/movements` | `finanzas.cash_movements` | Registra entrada (`in`) o salida/gasto (`out`) de efectivo en el turno activo. |
| `POST` | `/api/cash-shifts/current/close` | `finanzas.open_close_cash` | Recibe `billCounts` / `cashCounted` y `notes`, calcula resumen oficial del `shiftId`, genera `CashRegisterReport` Z y cierra el turno. |
| `GET` | `/api/reports/z-closes` | `reportes.z_close` | Historial completo de informes Z y turnos cerrados. |
| `GET/POST` | `/api/database/backup`, `/api/database/restore` | `admin.settings` | Exporta dump JSON/SQL completo o restaura respaldo bajo transacción controlada. |

### 6.7 Eventos WebSocket en Tiempo Real (Recomendado Socket.IO / WS nativo)
- `table:updated` -> actualiza color/estado y total de mesa en plano de salón web y app móvil del garzón.
- `kitchen:order_received` -> agrega comanda al Monitor KDS y reproduce timbre sonoro (`sound.playBell()`).
- `kitchen:order_served` -> notifica al garzón móvil que los platos de su mesa están listos para retirar.
- `qr:waiter_called` -> alerta emergente en Salón y App Garzón indicando Mesa + motivo (`cuenta`, `ayuda`, etc.).
- `cash_shift:state_changed` -> actualiza el indicador global "Caja Abierta / Caja Cerrada" en todas las pantallas.

---

## 7. Inventario Completo de Páginas, Funciones y Modales

### 7.1 Pantallas Principales (12 Vistas)
1. **Control de Acceso (`LoginScreen.tsx`):** Selección visual de operador (sin exponer PIN), selección de Almacén y Terminal TPV, teclado numérico de PIN de 4 dígitos, selector de idioma (`es/en/nl/fr/de`), cambio de tema visual y acceso a Carta Digital QR para pruebas. **No permite crear cuentas.**
2. **Panel Ejecutivo (`DashboardView.tsx`):** KPIs en vivo en CLP (ventas cerradas, ventas abiertas, ocupación de mesas, ticket promedio, cocina en preparación, platos más vendidos), estado de turno y accesos directos según permisos.
3. **Plano de Salones y Mesas (`FloorPlanView.tsx`):** Pestañas por salón (`Salón`, `Terraza Exterior`, `Barra & Tapas`, `Reservado VIP`), mapa interactivo con código visual por estado (libre, ocupada, cocina, cuenta impresa), apertura de mesa con número de comensales y validación por PIN si la mesa pertenece a otro garzón (`EmployeePasswordModal`).
4. **Punto de Venta / Comandero Táctil (`POSOrderTerminal.tsx`):**
   - **Desktop:** Panel dividido: a la izquierda ticket/líneas con keypad de cantidades, botones de acción (`Dejar Pendiente`, `Asignar a Cliente`, `Asignar a Mesa`, `Observaciones`, `Enviar a Cocina`, `Insertar Cupón`, `Precuenta`, `Cobrar`, `Anular`); a la derecha categorías paginadas, productos con foto/precio CLP, selector de bloque de marcha (`1..4`), búsqueda por texto o código de barras (`F6`) y tarifas. En pantallas pequeñas (`< lg`) cambia automáticamente a pestañas móviles (`Catálogo` / `Comanda`) para no mezclar ni ocultar categorías.
   - **Mobile Garzón (`stationMode === 'waiter-mobile'`):** Interfaz táctil fullscreen orientada al pulgar, categorías horizontales, carrito deslizable y botón prominente `Marchar a Cocina`.
5. **Ventas Abiertas (`PendingSalesView.tsx`):** Tabla filtrable por garzón, estado de precuenta impresa y búsqueda por mesa/producto/ticket, ordenable por columna, con vista previa lateral de líneas e IVA 19% y botones directos de **Reabrir**, **Precuenta** o **Cobrar** (respetando permisos `canCharge` / `canPrintPrebill`).
6. **Delivery y Mostrador (`DeliveryAndCounterView.tsx`):** Sub-canales (`Delivery`, `Mostrador`, `Mostrador Express`), creación rápida de pedido con cliente, teléfono, dirección, repartidor asignado y costo de envío CLP, y tablero de progreso (`Preparando -> Listo -> En camino -> Entregado`).
7. **Monitor de Cocina KDS (`KitchenDisplay.tsx`):** Tarjetas ordenadas por antigüedad con indicador de tiempo transcurrido, filtro por bloque de marcha (`1º Entradas/Bebidas`, `2º Fondos`, `3º Postres`, `4º Barra`), notas y modificadores resaltados, marcar plato individual o comanda completa como servida, con alerta sonora al llegar nuevos pedidos.
8. **Carta Digital QR (`DigitalMenu.tsx` + `digital-menu/*`):** Vista administrativa para previsualizar toda la carta filtrada por categorías con descripciones y fotos, probar vista móvil de cliente y generar códigos QR imprimibles por mesa (`QRStandModal`).
9. **Portal Público de Comensal QR (`CustomerPortal.tsx`):** Modo sin login accesible vía `?mode=customer&table=N`. Catálogo por categoría, ficha detallada del plato (`DishDetailModal`), personalización con modificadores, carrito móvil (`MobileOrderDrawer`) que envía orden directo a cocina, y modal para llamar al garzón (`CallWaiterModal`).
10. **Clientes CRM (`ClientsView.tsx`):** Alta, edición, búsqueda, filtros por grupo (`VIP`, `Frecuente`, `Empresa`), historial de consumo en CLP y saldo en cuenta corriente.
11. **Caja & Informes Z (`CashReports.tsx`):** Resumen en tiempo real **exclusivo del turno activo**, gráficos horarios y por método de pago (`Recharts`), listado de movimientos de efectivo del turno e histórico auditable de todos los Informes Z cerrados.
12. **Control de Inventario (`InventoryManager.tsx`):** Monitoreo de stock actual vs stock mínimo, alertas de reposición, valorización de inventario a costo/venta CLP y ajustes rápidos de unidades.
13. **Administración (`AdminPanel.tsx` + `admin/*` — Solo Administrador / permisos administrativos):** Sub-pestañas modulares:
    - **Personal (`UsersDirectoryManager.tsx`):** Creación, edición, activación y eliminación de personal (único lugar autorizado para crear cuentas).
    - **Roles y Permisos (`RolesPermissionsManager.tsx`):** Constructor visual de roles con las 38 casillas agrupadas en 9 módulos.
    - **Catálogo (`AdminPanel`):** CRUD de categorías y platos/bebidas con precio CLP, costo, IVA, bloque de cocina y opciones.
    - **Opciones y Modificadores (`ModifiersManager.tsx`):** CRUD de grupos (`Términos de Carnes`, `Guarniciones`, etc.) y extras en CLP vinculados por categoría.
    - **Personalización de Tickets (`TicketCustomizationSettings.tsx`):** Editor WYSIWYG en vivo de Precuenta y Comanda (58/80mm, logo, cabecera, propina sugerida 10%, largo de nombre, copias, impresora).
    - **Áreas de Impresión (`PrintAreasManager.tsx`):** Gestión de impresoras Cocina/Barra/Caja (Red IP:9100, USB, Bluetooth) y mapeo de categorías por área.
    - **Módulos del Sistema (`SystemModulesSettings.tsx`):** Activación/desactivación en vivo de los 13 módulos del restaurante.
    - **Base de Datos (`DatabaseManager.tsx`):** Explorador CRUD tabla por tabla, exportación Backup JSON, generación de Dump SQL DDL/INSERT con `DECIMAL(12,0)`, restauración desde archivo y herramientas protegidas de purga/reset.
    - **Ajustes Generales (`AdminPanel`):** Datos fiscales del local, propina, tema y enlaces/QR para terminales adicionales (`waiter-mobile`, `kitchen-kds`).

### 7.2 Modales y Barras Globales
- **`Sidebar.tsx` y `TopBar.tsx`:** Barra lateral animada colapsable filtrada estrictamente según roles y módulos activos + cabecera superior con reloj `es-CL`, tema, sonido, selector de estación, estado de caja y hoja de sesión.
- **`UserSessionSheet.tsx`:** Información del turno activo, botón de cambio rápido de operador (`LoginModal`) y botón de cierre de sesión (`logout`) siempre visible en el área fija superior/inferior.
- **`CashShiftBanner.tsx` y `CashShiftModal.tsx`:** Banner de estado + modal de 3 modos (`Apertura de Caja`, `Entrada / Salida de Efectivo` y `Cierre de Caja & Arqueo Z` con contador de billetes CLP desde `$0` y resumen aislado por `shiftId`).
- **`PaymentModal.tsx`:** Cobro por Efectivo (presets `$5.000..$50.000` + teclado numérico + cálculo de vuelto exacto), Tarjeta/TPV, Cripto/QR y Cargo a Habitación, con opción de auto-imprimir ticket.
- **`TicketPrintModal.tsx`:** Previsualización térmica 58mm/80mm con desglose Neto + IVA 19% + Propina sugerida e impresión vía `window.print()` (o servicio ESC/POS en Desktop).
- **`ProductOptionsModal.tsx`:** Selector al tocar producto para elegir opciones/modificadores activos de la categoría y observaciones de cocina.

---

## 8. Plan Paso a Paso para Construir y Probar Módulo por Módulo (Fases 0 a 10)

> **Metodología obligatoria:** No programes todo junto. Completa una fase, verifica su checklist de pruebas (backend + UI) y recién pasa a la siguiente.

### Fase 0 — Cimientos: Proyecto, Base de Datos y Motor Matemático CLP
- **Qué construir:**
  1. Inicializar repositorio backend (FastAPI / NestJS / .NET / Go / Spring) + PostgreSQL/MySQL + `/api/health`.
  2. Crear las primeras tablas base (`restaurant_settings`, `custom_roles`, `users`, `warehouses`, `pos_terminals`) y script de datos semilla.
  3. Portar el módulo puro de dinero (`currency.ts`: `roundCLP`, `calculateNetAndIva`, `formatCLP`) y crear tests unitarios automáticos.
- **Cómo probar antes de continuar:**
  - `GET /api/health` responde `200 OK`.
  - Test unitario confirma que `calculateNetAndIva(15900, 19)` da `net = 13361`, `iva = 2539`, `net + iva === 15900`.

### Fase 1 — Autenticación por PIN, Sesión y Motor RBAC
- **Qué construir:**
  1. Endpoints `GET /api/auth/operators`, `POST /api/auth/login`, `POST /api/auth/verify-pin`.
  2. Middleware de autorización JWT + verificación de permisos (`hasUserPermission`).
  3. Pantalla `LoginScreen` (Web y Móvil) sin registro público y sin mostrar PINs.
- **Cómo probar antes de continuar:**
  - Login con PIN incorrecto devuelve `401 Unauthorized`.
  - `GET /api/auth/operators` **no** incluye el campo `pin` ni `pin_hash` en el JSON.
  - Entrar como Garzón y verificar que redirige a `floor`; entrar como Cocina redirige a `kitchen`; entrar como Admin redirige a `dashboard`.

### Fase 2 — Panel Administrativo de Usuarios, Roles (38 Permisos) y Módulos
- **Qué construir:**
  1. Endpoints `/api/users/*`, `/api/roles/*`, `/api/settings/modules`, `/api/settings/brand`.
  2. Pantallas: `AdminPanel`, `UsersDirectoryManager`, `RolesPermissionsManager`, `SystemModulesSettings`, además del menú `Sidebar` dinámico filtrado por permisos y módulos.
- **Cómo probar antes de continuar:**
  - Intentar llamar `POST /api/users` logueado como Garzón o Cajera -> el backend debe responder `403 Forbidden`.
  - Crear un nuevo usuario como Admin, asignarle un rol personalizado (ej. sin descuentos ni cierre Z) e iniciar sesión con ese usuario para comprobar que sus botones y rutas se ocultan y bloquean correctamente.
  - Desactivar un módulo (ej. `kitchenKDS`) en `SystemModulesSettings` y verificar que desaparece del menú lateral.

### Fase 3 — Catálogo Gastronómico, Modificadores e Inventario
- **Qué construir:**
  1. Tablas y endpoints `/api/categories`, `/api/products`, `/api/products/:id/stock`, `/api/modifiers`, `/api/catalog`.
  2. Pestaña Catálogo en `AdminPanel`, `ModifiersManager`, `InventoryManager` y el modal `ProductOptionsModal`.
- **Cómo probar antes de continuar:**
  - Crear categoría + producto con precio `$14.900` CLP e IVA `19%`.
  - Crear grupo de modificadores con extra `$1.500` CLP asignado solo a una categoría y verificar en el modal de opciones que suma `$14.900 + $1.500 = $16.400`.
  - Bajar stock debajo de `minStock` y verificar la alerta visual en `InventoryManager`.

### Fase 4 — Salones, Mapa de Mesas y WebSockets de Salón
- **Qué construir:**
  1. Tablas `salons` y `dining_tables` + endpoints `/api/salons`, `/api/tables/:id/open`.
  2. Vista `FloorPlanView` (Desktop mapa con coordenadas + vista responsive en móvil) conectada al evento WebSocket `table:updated`.
- **Cómo probar antes de continuar:**
  - Abrir Mesa 1 desde el PC y verificar en otra pestaña/celular que la Mesa 1 cambia de inmediato a estado `occupied` (ocupada) con comensales y total `$0`.

### Fase 5 — Toma de Pedidos (TPV Desktop & Comandero Garzón Mobile)
- **Qué construir:**
  1. Tablas `sales` y `sale_lines` + lógica pura portada de `salesCalculator.ts`.
  2. Endpoints `/api/sales`, `/api/sales/:id/items`, `/api/sales/:id/transfer-table`, `/api/sales/:id/cancel`.
  3. Vista `POSOrderTerminal` en modo desktop y móvil (`waiter-mobile`), con selector de bloques de marcha (`1..4`), notas y traspaso de mesa.
- **Cómo probar antes de continuar:**
  - Agregar 2 platos idénticos sin notas -> se agrupan en una línea con cantidad 2 y se descuentan 2 unidades de stock.
  - Agregar 1 plato con nota "Sin cebolla" -> crea línea separada.
  - Eliminar línea -> devuelve stock exacto al producto y recalcula `subtotal`, `taxTotal` y `total` al peso CLP.
  - Traspasar comanda de Mesa 1 a Mesa 5 -> Mesa 1 queda `free` y Mesa 5 pasa a `occupied`.

### Fase 6 — Monitor de Cocina KDS, Áreas de Impresión y Tickets
- **Qué construir:**
  1. Tablas `print_areas` y `ticket_print_settings`.
  2. Endpoints `/api/sales/:id/send-kitchen`, `/api/kitchen/queue`, `/api/kitchen/.../served`, `/api/printers/*`, `/api/settings/tickets`.
  3. Pantallas `KitchenDisplay`, `PrintAreasManager`, `TicketCustomizationSettings` y `TicketPrintModal`.
- **Cómo probar antes de continuar:**
  - Pulsar "Enviar a Cocina" en TPV/Móvil -> la tarjeta aparece instantáneamente en `KitchenDisplay` (`/?station=kitchen-kds`) con sonido de campana.
  - Marcar platos servidos en KDS -> la mesa actualiza su estado visual.
  - Editar texto de precuenta o ancho `58mm`/`80mm` en `TicketCustomizationSettings` y comprobar que `TicketPrintModal` refleja el cambio en vivo.

### Fase 7 — Ventas Abiertas, Precuentas y Módulo de Cobros (`PaymentModal`)
- **Qué construir:**
  1. Endpoints `/api/sales/:id/preticket` y `/api/sales/:id/checkout`.
  2. Pantalla `PendingSalesView` y modal `PaymentModal` (Efectivo con vuelto CLP, Tarjeta, QR/Cripto, Cargo).
- **Cómo probar antes de continuar:**
  - Imprimir precuenta -> mesa cambia a estado `billed` (`preticketPrinted = true`).
  - Cobrar cuenta de `$26.300` con billete de `$30.000` -> vuelto exacto `$3.700`, venta pasa a `closed`, mesa queda `free` y ticket final listo para imprimir.
  - Verificar que un usuario con rol `waiter` (sin permiso `ventas.charge`) **no** puede cobrar ni desde el modal ni llamando directo al endpoint `/checkout` (`403`).

### Fase 8 — Turnos de Caja, Movimientos y Arqueo Ciego / Cierre Z
- **Qué construir:**
  1. Tablas `cash_shifts`, `cash_movements`, `cash_register_reports` + lógica pura portada de `cashShift.ts`.
  2. Endpoints `/api/cash-shifts/*` y `/api/reports/z-closes`.
  3. Componentes `CashShiftBanner`, `CashShiftModal` y `CashReports`.
- **Cómo probar antes de continuar (Prueba crítica de cuadratura):**
  - Abrir Turno 1 con Fondo Inicial `$50.000`.
  - Cobrar 1 venta en Efectivo (`$15.000`) y 1 venta con Tarjeta (`$20.000`).
  - Registrar 1 salida de efectivo a proveedor (`$5.000`).
  - Abrir Cierre Z:
    - Conteo físico inicia en `$0`.
    - Efectivo Teórico Esperado debe ser exactamente `$50.000 + $15.000 - $5.000 = $60.000` (la tarjeta no entra al cajón).
    - Ingresar billetes por `$60.000` -> Diferencia `$0` (`¡Caja Cuadrada Exacta!`). Cerrar Turno 1.
  - **Abrir Turno 2** con `$50.000` -> Verificar inmediatamente que "Ventas Efectivo" del Turno 2 es **`$0`** (cero contaminación del Turno 1).

### Fase 9 — Delivery, Mostrador Express y Clientes CRM
- **Qué construir:**
  1. Tabla `clients` + endpoints `/api/clients/*`, `/api/delivery/*`.
  2. Pantallas `DeliveryAndCounterView` (Delivery, Mostrador, Mostrador Express) y `ClientsView`, más asignación de cliente en `POSOrderTerminal`.
- **Cómo probar antes de continuar:**
  - Crear pedido Delivery con cliente, dirección y envío `$2.500` -> verificar que `total` incluye el envío (`subtotal_bruto + 2500`).
  - Asignar repartidor y avanzar estado: `preparing -> ready -> dispatched -> delivered`.
  - Cobrar desde caja y confirmar asociación al `shiftId` activo.

### Fase 10 — Carta QR Pública, Respaldos BD y Despliegue Multi-plataforma
- **Qué construir:**
  1. Endpoints públicos `/api/public/qr/order` y `/api/public/qr/call-waiter` + protección anti-spam (rate limit).
  2. Pantallas `DigitalMenu`, `QRStandModal`, `CustomerPortal` (`?mode=customer&table=N`) y `DatabaseManager` (`/api/database/backup`, `/restore`).
  3. Configurar HTTPS, variables de entorno, backups automáticos diarios de PostgreSQL y empaquetar clientes Desktop y Mobile.
- **Cómo probar antes de continuar:**
  - Escanear QR de Mesa 7 -> añadir plato con modificador -> enviar pedido -> verificar llegada a KDS y suma al total de Mesa 7 sin cerrar sesión del personal en PC.
  - Exportar Backup JSON y Dump SQL desde `DatabaseManager`.

---

## 9. Adaptación Específica para Software Desktop y App Mobile

### 9.1 Software Desktop Instalable (Windows / macOS / Linux)
- **Opciones recomendadas:** **Tauri (Rust + Web)** o **Electron (Node + Chromium)** envolviendo el frontend Web, o cliente nativo en **C# (.NET MAUI/WPF)** / **JavaFX** consumiendo los mismos endpoints REST.
- **Ventaja clave en Desktop (Impresión térmica directa):**
  - El navegador web solo imprime vía diálogo `window.print()`. En el Software Desktop agregas un módulo local que conecta directamente por **TCP socket (puerto `9100`)**, **USB** o **Puerto Serie/COM** a las impresoras declaradas en `PrintArea` usando comandos **ESC/POS** para:
    - Cortar papel automáticamente (`autoCut`).
    - Abrir cajón portamonedas al finalizar pago en efectivo.
    - Imprimir simultáneamente comandas en Cocina y Barra según `categoryIds`.
- **Resiliencia Offline:** SQLite local como caché de catálogo + cola de sincronización si cae temporalmente el Wi-Fi local.

### 9.2 App Mobile (Android / iOS)
- **Opciones recomendadas:** **Flutter** o **React Native / Expo** (o **Kotlin/Swift** nativo) consumiendo exactamente la misma API REST + WebSocket:
  1. **Modo Comandero Garzón (`waiter`):** Carga directa a `FloorPlanView` móvil + toma rápida de comandas (`POSOrderTerminal` táctil) + notificaciones push/socket cuando Cocina marca `served` o cuando una mesa presiona **"Llamar al Garzón"** desde la Carta QR.
  2. **Modo Repartidor (`delivery`):** Lista de pedidos asignados a su `user.id`, acceso rápido a teléfono/dirección del cliente para abrir Google Maps/Waze y botón grande **"Marcar como Entregado"**.
  3. **Carta QR Comensal:** No requiere instalar app; abre directo en el navegador del celular del cliente (`https://tudominio.com/?mode=customer&table=N`).

---

## Resumen de Portabilidad de Archivos Actuales

| Módulo Actual | Qué contiene | Destino al portar a otro lenguaje |
| :--- | :--- | :--- |
| `src/types.ts` | Todos los modelos de dominio | Tablas SQL + DTOs / Structs / Classes del Backend |
| `src/utils/currency.ts` | Reglas CLP enteros e IVA 19% | Servicio de Contabilidad (`MoneyService`) en Backend |
| `src/utils/salesCalculator.ts` | Cálculos de líneas, descuentos y totales | Servicio de Pedidos (`OrderCalculatorService`) en Backend |
| `src/utils/cashShift.ts` | Lógica de turnos, movimientos y Cierre Z | Servicio de Caja (`CashShiftService`) en Backend |
| `src/utils/permissions.ts` + `defaultConfigs.ts` | 6 roles base y matriz de 38 permisos | Middleware Auth/RBAC (`PermissionGuard`) en Backend |
| `src/utils/storageAdapter.ts` | Contrato abstracto clave-valor | Sustituir implementación por Cliente HTTP (`ApiClient`) |
