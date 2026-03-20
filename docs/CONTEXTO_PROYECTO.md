# 🧠 Contexto del Proyecto — TienditaCampus

> Documento maestro de referencia. Aquí está TODO lo que necesitas saber para continuar trabajando en el proyecto, sin perder contexto.

---

## 1. ¿Qué es TienditaCampus?

**TienditaCampus** es un sistema web de gestión de ventas diseñado para estudiantes universitarios que venden productos dentro del campus (snacks, bebidas, comida, etc.). Funciona como un **micro-ERP + Marketplace** que permite:

- 📦 Gestionar productos e inventario
- 💰 Rastrear ventas diarias en tiempo real
- 📊 Calcular ROI y rentabilidad
- 🏪 Publicar un catálogo público para compradores
- 📱 Funcionar como PWA (Progressive Web App) para uso en celular

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Puerto |
|------|-----------|---------|--------|
| Frontend | Next.js + TypeScript + TailwindCSS | 14.x | 3000 |
| Backend | NestJS + TypeScript + TypeORM | 10.x | 3001 |
| Base de Datos | PostgreSQL | 16 | 5432 |
| Proxy | Nginx | Alpine | 80/443 |
| Contenedores | Docker + Docker Compose | 3.9 | — |
| Validación FE | Zod + React Hook Form | — | — |
| Validación BE | class-validator + class-transformer | — | — |
| Estado FE | Zustand | 4.x | — |
| Auth | JWT + Argon2 (@node-rs/argon2) | — | — |

---

## 3. Repositorios

| Nombre | URL | Contenido |
|--------|-----|-----------|
| Frontend | https://github.com/EmilioJaras3/tienditacampus-frontend | Next.js, componentes UI, servicios HTTP, store |
| Backend | https://github.com/EmilioJaras3/tienditacampus-backend | NestJS, módulos, DTOs, entities, guards |
| Database | https://github.com/EmilioJaras3/tienditacampus-database | Scripts SQL, migraciones, seeds, backups |
| Monorepo (backup) | Local: `pi_privado_backup/` | Todo junto (referencia, no se despliega) |

---

## 4. Cómo Levantar el Proyecto

### Opción A: Docker Compose (recomendado)
```bash
cd pi_privado_backup
docker compose up --build
# → Frontend: http://localhost:8080
# → API: http://localhost:8080/api
# → Health: http://localhost:8080/api/health
```

### Opción B: Local sin Docker
```bash
# Terminal 1 — Backend
cd backend && npm install && npm run start:dev

# Terminal 2 — Frontend  
cd frontend && npm install && npm run dev
```

### Credenciales de Prueba
| Email | Contraseña | Rol |
|-------|-----------|-----|
| `243697@ids.upchiapas.edu.mx` | `TienditaCampus2026!` | seller |
| `testadmin@upchiapas.edu.mx` | `TienditaCampus2026!` | admin |

> ⚠️ Si el login falla con error 500 "Invalid hash", es porque el hash en la BD está corrupto. La solución es registrar un usuario nuevo vía `/api/auth/register` y copiar su `password_hash` al usuario afectado.

---

## 5. Arquitectura del Sistema

```
Cliente (Browser)
    │
    ▼  HTTPS
┌─────────┐
│  Nginx  │ ← Reverse proxy, rate limiting, security headers
│  :80    │
└────┬────┘
     │
     ├── /api/*  ──→  Backend (NestJS :3001)  ──→  PostgreSQL (:5432)
     │                         │
     │                    JWT + Argon2
     │                    TypeORM queries
     │
     └── /*      ──→  Frontend (Next.js :3000)
                       SSR + PWA
```

---

## 6. Módulos del Backend

| Módulo | Controlador | Endpoints | Auth | Descripción |
|--------|------------|-----------|------|-------------|
| **Auth** | `auth.controller.ts` | POST register, POST login, GET profile | Parcial | Registro, login JWT, perfil |
| **Products** | `products.controller.ts` | CRUD + marketplace | Parcial | Gestión de productos del vendedor |
| **Sales** | `sales.controller.ts` | today, prepare, track, close-day, history, roi, prediction | Sí | Ventas diarias, reportes |
| **Inventory** | `inventory.controller.ts` | POST stock, GET history | Sí | Control de inventario |
| **Users** | `users.controller.ts` | GET public/:id | No | Perfil público de vendedores |
| **Health** | `health.controller.ts` | GET /api/health | No | Estado del servicio |

---

## 7. Estructura de la Base de Datos

### Tablas principales
```
users
├── id (uuid, PK)
├── email (varchar, unique)
├── password_hash (varchar) ← Argon2id
├── first_name, last_name, phone
├── avatar_url
├── role (enum: seller, admin, buyer)
├── is_active, is_email_verified
├── last_login_at, login_count
├── failed_login_attempts, locked_until
└── created_at, updated_at

products
├── id (uuid, PK)
├── seller_id (uuid, FK → users.id)
├── name, description, category
├── purchase_price, sale_price
├── current_stock
├── image_url
├── is_active
└── created_at, updated_at

daily_sales
├── id (uuid, PK)
├── seller_id (uuid, FK → users.id)
├── date
├── status (enum: open, closed)
└── created_at

sale_details
├── id (uuid, PK)
├── daily_sale_id (FK → daily_sales.id)
├── product_id (FK → products.id)
├── planned_quantity, sold_quantity, waste_quantity
├── unit_price, unit_cost
└── created_at

inventory_records
├── id (uuid, PK)
├── product_id (FK → products.id)
├── quantity, unit_cost
└── created_at
```

---

## 8. Páginas del Frontend

| Ruta | Auth | Descripción |
|------|------|-------------|
| `/` | No | Landing page / redirección |
| `/login` | No | Formulario de inicio de sesión |
| `/register` | No | Formulario de registro |
| `/dashboard` | Sí | Panel principal del vendedor |
| `/dashboard/products` | Sí | Lista de productos del vendedor |
| `/dashboard/products/[id]` | Sí | Editar producto |
| `/dashboard/products/[id]/stock` | Sí | Gestión de stock del producto |
| `/dashboard/sales` | Sí | Control de ventas diarias |
| `/marketplace` | No | Catálogo público |
| `/seller/[id]` | No | Perfil público del vendedor |

---

## 9. Variables de Entorno Importantes

```env
# Backend
NODE_ENV=development
BACKEND_PORT=3001
POSTGRES_HOST=database          # En Docker: nombre del servicio
POSTGRES_PORT=5432
POSTGRES_DB=tienditacampus
POSTGRES_USER=tc_admin
POSTGRES_PASSWORD=<secreto>
JWT_SECRET=<secreto>
JWT_EXPIRATION=7d
ARGON2_MEMORY_COST=19456
ARGON2_TIME_COST=2
ARGON2_PARALLELISM=1

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8080/api  # En Docker va a Nginx

# Docker Compose
NGINX_HTTP_PORT=8080
```

---

## 10. Problemas Conocidos y Soluciones

### ❌ Login devuelve 500 "Invalid hashed password"
**Causa:** Hash Argon2 corrupto en la BD (caracteres `$` escapados incorrectamente al insertar manualmente).
**Solución:**
1. Registrar un usuario temporal: `POST /api/auth/register`
2. Copiar su hash al usuario real:
```sql
UPDATE users SET password_hash = (
  SELECT password_hash FROM users WHERE email='temp@mail.com'
) WHERE email='usuario_real@mail.com';
```

### ❌ Docker build del frontend falla por TypeScript
**Causa:** `useForm` con `zodResolver` da error de tipos complejos.
**Solución:** Usar `zodResolver(schema) as any` en los formularios.

### ❌ `nest build` falla localmente
**Causa:** `@nestjs/cli` no instalado localmente.
**Solución:** `npm install @nestjs/cli --save-dev` o usar `npx nest build`.

### ❌ Docker Compose health checks fallan
**Causa:** `wget`/`curl` no disponible en imagen Alpine.
**Solución:** Agregar `RUN apk add --no-cache curl` en el Dockerfile.

---

## 11. Decisiones Técnicas Importantes

| Decisión | Razón |
|----------|-------|
| **Argon2 en vez de bcrypt** | Más seguro, ganador de la Password Hashing Competition |
| **TypeORM en vez de Prisma** | Mejor integración con NestJS decorators |
| **Zustand en vez de Redux** | Más simple para un proyecto de este tamaño |
| **App Router en vez de Pages** | Next.js 14 recomienda App Router como estándar |
| **3 repos separados** | Requerimiento de la materia (SOA) + buena práctica |
| **Nginx como proxy** | Centraliza CORS, SSL, rate limiting en un solo punto |
| **Docker multi-stage builds** | Imágenes de producción ~3x más livianas |

---

## 12. Entregables Académicos

| Actividad | Archivo | Estado |
|-----------|---------|--------|
| ACT4-C2: Arquitectura SOA | `ACT4-C2_ARQUITECTURA_SOA.md` | ✅ Completado |
| Diagrama de Arquitectura | Incluido en ACT4-C2 | ✅ Completado |
| Contrato de API (endpoints) | Incluido en ACT4-C2 | ✅ Completado |
| 3 Repositorios de GitHub | Frontend, Backend, Database | ✅ Completados |
| Estrategia de Despliegue | Incluido en ACT4-C2 | ✅ Completado |

---
