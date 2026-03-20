# 📋 CHANGELOG — TienditaCampus

Registro cronológico de todos los cambios, decisiones y progreso del proyecto.

---

## [2026-02-20] — Separación SOA y Corrección de Autenticación

### 🏗️ Arquitectura
- **Separación en 3 repositorios independientes** (SOA):
  - [`tienditacampus-frontend`](https://github.com/EmilioJaras3/tienditacampus-frontend) — Next.js 14 PWA
  - [`tienditacampus-backend`](https://github.com/EmilioJaras3/tienditacampus-backend) — NestJS API
  - [`tienditacampus-database`](https://github.com/EmilioJaras3/tienditacampus-database) — PostgreSQL scripts
- Cada repo tiene su propio `.git`, `.gitignore` y commit inicial independiente
- El monorepo original (`pi_privado_backup`) se mantiene como backup/referencia

### 🐛 Bugs Corregidos
- **Error 500 en login** (`Invalid hashed password: password hash string missing field`):
  - **Causa raíz:** El hash Argon2 almacenado en PostgreSQL estaba corrupto. Al intentar insertar el hash manualmente desde la consola de Windows, los caracteres `$` se escaparon incorrectamente, dejando el campo `password_hash` con un formato inválido.
  - **Solución:** Se usó el endpoint `/api/auth/register` para crear un usuario temporal con hash válido generado por el backend. Luego se copió ese hash válido al usuario original vía SQL.
  - **Archivos afectados:** Tabla `users` en PostgreSQL (campo `password_hash`)

- **Errores de TypeScript en Docker build del frontend**:
  - `useForm` sin genérico causaba error de tipos con `zodResolver`
  - **Solución:** Se agregó `as any` al `zodResolver()` en:
    - `frontend/src/app/(dashboard)/products/[id]/page.tsx`
    - `frontend/src/app/(dashboard)/products/[id]/stock/page.tsx`
  - Se agregó la dependencia faltante `@radix-ui/react-checkbox`

- **Backend no compilaba localmente** (`nest build` fallaba):
  - **Causa:** `@nestjs/cli` no estaba instalado localmente, solo como dependencia global
  - **Solución:** Se agregó `@node-rs/argon2` al `package.json` del backend

### 📄 Documentación
- Creado `ACT4-C2_ARQUITECTURA_SOA.md` con diagrama de arquitectura, contrato de API (18 endpoints), links de repos, y estrategia de despliegue

---

## [2026-02-17] — Corrección de Docker Compose y Creación de Productos

### 🐛 Bugs Corregidos
- **Contenedores no arrancaban correctamente:**
  - Health checks fallaban porque `wget` no estaba instalado en la imagen Alpine del backend
  - Conflictos de puertos con otras instancias de PostgreSQL en la máquina local
  - **Solución:** Se ajustaron los health checks y se verificaron los puertos disponibles

- **Error 500 al crear productos** (`seller_id constraint violation`):
  - **Causa raíz:** El frontend enviaba los datos del formulario sin el `seller_id`, y el backend no lo asignaba automáticamente desde el JWT
  - **Solución:** El backend ahora extrae el `user.id` del token JWT y lo asigna como `seller_id` antes de insertar

### 🔧 Mejoras
- Refactorización del `api-client.ts` en el frontend para mejor manejo de errores y validación de variables de entorno
- Se dejó de hardcodear la URL de la API (`http://localhost:3001`) y se usa `NEXT_PUBLIC_API_URL` desde `.env`

---

## [2026-02-16] — Marketplace y Perfil de Vendedor

### ✨ Funcionalidades Nuevas
- **Catálogo público `/marketplace`**: Vista pública donde cualquier estudiante (sin login) puede ver los productos disponibles con stock > 0
- **Perfil de vendedor `/seller/[id]`**: Página pública que muestra la información del vendedor y sus productos activos
- **Botón "Me interesa"**: Enlace a WhatsApp del vendedor para contactar directamente

### 🔧 Implementación
- `GET /api/products/marketplace` — endpoint público sin autenticación con búsqueda por query `?q=` y filtro por vendedor `?seller=`
- `GET /api/users/public/:id` — perfil público del vendedor (solo nombre y avatar)

---

## [2026-02-10] — Módulo de Ventas e Inventario

### ✨ Funcionalidades Nuevas
- **Sistema de ventas diarias:**
  - Preparar jornada (`POST /api/sales/prepare`) — seleccionar qué productos llevar a vender
  - Trackear ventas (`POST /api/sales/track`) — registrar cada venta unitaria
  - Cerrar día (`POST /api/sales/close-day`) — registrar merma y generar reporte
- **Control de inventario:**
  - Agregar stock (`POST /api/inventory`) — registrar entradas con costo unitario
  - Historial (`GET /api/inventory/product/:id`) — ver movimientos por producto
- **Reportes:**
  - ROI (`GET /api/sales/roi`) — retorno de inversión acumulado
  - Historial de ventas (`GET /api/sales/history`) — todas las jornadas pasadas
  - Predicción de demanda (`GET /api/sales/prediction`) — sugerencia basada en datos

---

## [2026-02-07] — Autenticación y Seguridad

### ✨ Funcionalidades Nuevas
- **Sistema de autenticación completo:**
  - Registro con validación de email universitario
  - Login con JWT + Argon2 para hashing de contraseñas
  - Guard `JwtAuthGuard` para proteger rutas
  - Decorator `@CurrentUser()` para acceder al usuario en los controladores
- **Account Lockout:** Bloqueo temporal después de múltiples intentos fallidos de login
- **Trazabilidad UX:** Se registra `lastLoginAt`, `loginCount`, `failedLoginAttempts`

### 🔒 Seguridad
- Contraseñas hasheadas con Argon2id (memory: 19456, time: 2, parallelism: 1)
- JWT con expiración configurable vía `JWT_EXPIRATION`
- CORS configurado para permitir solo orígenes conocidos
- Rate limiting en Nginx: 10r/s general, 5r/min para login
- Variables de entorno para todos los secretos (nunca hardcodeados)

---

## [2026-02-04] — Setup Inicial del Proyecto

### 🏗️ Infraestructura
- Proyecto monorepo creado con estructura `frontend/`, `backend/`, `database/`, `devops/`
- Docker Compose con 4 servicios: frontend, backend, database, nginx
- Multi-stage Dockerfiles para optimización de imágenes
- Red Docker bridge `tienditacampus-network`
- Volumen persistente `tienditacampus-pgdata` para PostgreSQL

### ✨ Funcionalidades Base
- Backend NestJS con prefijo global `/api`, ValidationPipe, y CORS
- Frontend Next.js 14 con App Router, TailwindCSS, y soporte PWA
- PostgreSQL 16 con extensiones `uuid-ossp` y `pgcrypto`
- Nginx como reverse proxy con headers de seguridad

---
