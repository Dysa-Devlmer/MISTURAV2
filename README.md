# Mistura TPV — Sistema POS Gastrobar (CLP / IVA 19% Chile)

Sistema completo de Punto de Venta (POS / TPV) y gestión operativa para restaurantes, bares y gastrobares, adaptado integralmente a **Pesos Chilenos (CLP)** enteros y **IVA chileno del 19%**.

## Módulos principales

- **Control de Acceso y Roles (RBAC):** Perfiles diferenciados (Administrador, Cajero/a, Garzón/Mesero, Cocina y roles personalizados con permisos granulares) mediante PIN de operador. La creación de personal está restringida al panel de Administración.
- **Plano de Salones y Mesas:** Vista interactiva de salones, barra, terraza y VIP con estados en tiempo real (libre, ocupada, en cocina, precuenta impresa) y modo comandero móvil optimizado.
- **Punto de Venta (TPV):** Toma de pedidos rápida, búsqueda, categorías responsive, grupos de opciones y modificadores, notas de cocina, bloques/tiempos de pase, tarifas y traspaso de mesa.
- **Monitor de Cocina (KDS) y Áreas de Impresión:** Distribución por partidas (Cocina caliente, Barra, Cuarto frío, etc.) y personalización de tickets de precuenta y comanda (58 mm / 80 mm).
- **Gestión de Caja & Cierre Z:** Apertura de turno, entradas/salidas de efectivo, conteo físico por denominaciones CLP y emisión de Informe Z aislado estrictamente por turno (`shiftId`).
- **Delivery, Mostrador y Carta Digital QR:** Flujo de pedidos por canal, clientes, repartidores y carta QR interactiva.
- **Inventario, Recetas y Catálogo:** Control de stock, categorías e ítems de carta gastronómica en CLP.

## Requisitos e instalación local

- **Node.js** 18 o superior
- **npm** 9 o superior

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno (opcional si usa servicios externos)
cp .env.example .env

# 3. Iniciar servidor de desarrollo (puerto 3000)
npm run dev

# 4. Compilar para producción
npm run build
npm run start
```

## Arquitectura, API y guía paso a paso multiplataforma

- Consulta [`GUIA_DESARROLLO_COMPLETA.md`](./GUIA_DESARROLLO_COMPLETA.md) para ver la especificación completa del sistema en español: todas las entidades SQL, reglas CLP/IVA 19%, los 38 permisos RBAC, catálogo completo de endpoints REST + WebSockets, inventario de pantallas y el **plan paso a paso por fases (Fases 0 a 10)** para recrearlo y probarlo en otro lenguaje (Web, Software Desktop y App Mobile).
- Consulta [`ARCHITECTURE.md`](./ARCHITECTURE.md) para el mapa rápido de carpetas y módulos puros del código actual.
