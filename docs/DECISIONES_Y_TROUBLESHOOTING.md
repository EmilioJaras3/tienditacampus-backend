# 🔧 Decisiones Técnicas y Troubleshooting — TienditaCampus

> Registro de todas las decisiones de diseño, problemas encontrados y cómo se resolvieron. Sirve como guía para no repetir errores.

---

## Índice
1. [Decisiones de Arquitectura](#1-decisiones-de-arquitectura)
2. [Problemas de Docker](#2-problemas-de-docker)
3. [Problemas de Autenticación](#3-problemas-de-autenticación)
4. [Problemas de TypeScript](#4-problemas-de-typescript)
5. [Problemas de Base de Datos](#5-problemas-de-base-de-datos)
6. [Configuración de Red](#6-configuración-de-red)
7. [Lecciones Aprendidas](#7-lecciones-aprendidas)

---

## 1. Decisiones de Arquitectura

### 1.1 ¿Por qué SOA con 3 repos?
- **Requerimiento académico:** La rúbrica del Proyecto Integrador exige 3 repositorios independientes + 3 instancias Docker.
- **Beneficio real:** Permite CI/CD independiente. El frontend se puede actualizar sin redeployar el backend.
- **Implementación:** Se partió del monorepo `pi_privado_backup` y se extrajo cada carpeta (`frontend/`, `backend/`, `database/`) a su propio repo Git.

### 1.2 ¿Por qué Nginx como Reverse Proxy?
- **Problema:** Si el frontend llama directamente al backend en otro puerto, hay problemas de CORS y no se puede tener una URL unificada.
- **Solución:** Nginx escucha en el puerto 80/443 y redirige:
  - `/api/*` → backend:3001
  - `/*` → frontend:3000
- **Bonus:** Rate limiting (10r/s general, 5r/min login), headers de seguridad (X-Frame-Options, XSS-Protection), y compresión Gzip.

### 1.3 ¿Por qué Docker multi-stage builds?
- **Problema:** La imagen de Node.js con todos los `devDependencies` pesa ~1.5GB.
- **Solución:** El Dockerfile tiene 3 stages:
  1. `deps` — solo instala dependencias
  2. `builder` — compila TypeScript y hace `npm prune --production`
  3. `runner` — imagen limpia Alpine solo con el código compilado
- **Resultado:** Imagen de producción ~200MB.

---

## 2. Problemas de Docker

### 2.1 Backend health check falla
```
❌ ERROR: wget: command not found
```
**Causa:** La imagen `node:20-alpine` no incluye `wget` ni `curl`.
**Solución:** Agregar en el Dockerfile del backend:
```dockerfile
RUN apk add --no-cache curl
```
Y cambiar el health check a usar `wget --spider` (que sí está en Alpine por defecto con BusyBox).

### 2.2 Frontend Dockerfile copia `.next/standalone`
```
❌ COPY failed: stat /app/.next/standalone: file not found
```
**Causa:** `next build` solo genera `standalone` si `next.config.mjs` tiene `output: 'standalone'`.
**Solución:** Verificar que `next.config.mjs` contenga:
```js
const nextConfig = {
  output: 'standalone',
  // ...
};
```

### 2.3 PostgreSQL conflicto de puertos
```
❌ port 5432 is already in use
```
**Causa:** Otra instancia de PostgreSQL corre en la máquina local.
**Solución:** No exponer el puerto 5432 de la base de datos al host. Solo los servicios dentro de la red Docker necesitan acceder a la BD. Si necesitas acceso local, mapear a otro puerto:
```yaml
ports:
  - "5433:5432"  # Usar 5433 en el host
```

---

## 3. Problemas de Autenticación

### 3.1 Login retorna 500: "Invalid hashed password"
```
Error: Invalid hashed password: password hash string missing field
```
**Causa raíz:** Al insertar el hash Argon2 manualmente en PostgreSQL desde PowerShell, los caracteres `$` se interpretan como variables de entorno y se eliminan. El hash queda corrupto (ej. `argon2id` en vez de `$argon2id$v=19$m=...`).

**Cómo diagnosticar:**
```sql
SELECT email, password_hash FROM users;
-- Si el hash NO empieza con $argon2id$v=19$, está corrupto
```

**Solución probada (la que funciona):**
1. Registrar un usuario temporal vía API:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"temp@mail.com","password":"MiPassword123!","firstName":"Temp","lastName":"User","phone":"1234567890"}'
```
2. Copiar su hash al usuario con problemas:
```sql
UPDATE users SET password_hash = (
  SELECT password_hash FROM users WHERE email='temp@mail.com'
) WHERE email='usuario_real@mail.com';
```
3. (Opcional) Eliminar el usuario temporal:
```sql
DELETE FROM users WHERE email='temp@mail.com';
```

**Prevención:** JAMÁS insertar hashes manualmente. Siempre usar el endpoint de registro o un script Node.js que use `@node-rs/argon2`.

### 3.2 JWT expirado no redirige al login
**Causa:** El frontend no interceptaba errores 401 del backend.
**Solución:** El `api-client.ts` tiene un interceptor de Axios que detecta `401` y limpia el store de autenticación + redirige a `/login`.

---

## 4. Problemas de TypeScript

### 4.1 `useForm` + `zodResolver` error de tipos
```
❌ TS2322: Type 'ZodType<...>' is not assignable to type 'Resolver<...>'
```
**Causa:** Incompatibilidad de tipos entre `@hookform/resolvers/zod` y `react-hook-form` cuando se usa `z.coerce.number()` en el schema.

**Solución:** Castear el resolver a `any`:
```typescript
const form = useForm<FormValues>({
  resolver: zodResolver(schema) as any,
  defaultValues: { ... }
});
```
**Archivos afectados:**
- `frontend/src/app/(dashboard)/products/[id]/page.tsx`
- `frontend/src/app/(dashboard)/products/[id]/stock/page.tsx`

### 4.2 Falta `@radix-ui/react-checkbox`
```
❌ Module not found: Can't resolve '@radix-ui/react-checkbox'
```
**Solución:** `npm install @radix-ui/react-checkbox` en el frontend.

### 4.3 Backend: `@nestjs/cli` no encontrado
```
❌ Cannot find module '@nestjs/cli/bin/nest.js'
```
**Causa:** `@nestjs/cli` está instalado globalmente en la máquina local pero no como dependencia del proyecto.
**Solución:** Usar `npx nest build` en vez de `nest build`, o agregar `@nestjs/cli` a `devDependencies`.

---

## 5. Problemas de Base de Datos

### 5.1 Esquema de la tabla `users` — nombres de columnas
La tabla usa **snake_case** en PostgreSQL, pero TypeORM las mapea a **camelCase** en el código:

| PostgreSQL (DB) | TypeScript (código) |
|-----------------|---------------------|
| `password_hash` | `passwordHash` |
| `first_name` | `firstName` |
| `is_active` | `isActive` |
| `is_email_verified` | `isEmailVerified` |
| `last_login_at` | `lastLoginAt` |
| `login_count` | `loginCount` |
| `failed_login_attempts` | `failedLoginAttempts` |
| `locked_until` | `lockedUntil` |

⚠️ **Al escribir SQL directo** contra la BD, usar snake_case. En el código TypeScript, usar camelCase.

### 5.2 Extensiones requeridas
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- Para uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- Para gen_random_bytes()
```
Estas se crean en `database/init/00-create-extensions.sql`.

### 5.3 TypeORM `synchronize: true` en desarrollo
En desarrollo, TypeORM auto-crea/modifica las tablas basándose en las entities. En producción, esto debe estar **desactivado** (`synchronize: false`) y usar migraciones.

---

## 6. Configuración de Red

### 6.1 Puertos en uso
| Servicio | Puerto interno (Docker) | Puerto externo (host) |
|----------|------------------------|----------------------|
| Frontend | 3000 | — (solo vía Nginx) |
| Backend | 3001 | 3001 (directo) |
| PostgreSQL | 5432 | — (no expuesto) |
| Nginx | 80 | 8080 |

### 6.2 URLs de acceso
| Ambiente | Frontend | API |
|----------|----------|-----|
| Docker local | http://localhost:8080 | http://localhost:8080/api |
| Sin Docker | http://localhost:3000 | http://localhost:3001/api |

### 6.3 CORS Configuration (main.ts)
```typescript
app.enableCors({
  origin: [
    'http://localhost:3000',    // Frontend directo
    'http://localhost:8080',    // Nginx
    'http://127.0.0.1:8080',
  ],
  credentials: true,
});
```

---

## 7. Lecciones Aprendidas

1. **Nunca insertar hashes manualmente** en la BD desde la consola. Siempre usar la API o un script.
2. **PowerShell escapa `$` de forma diferente** a Bash. Al ejecutar comandos con caracteres especiales, usar `cmd.exe /c "..."` o variables de PowerShell.
3. **`Copy-Item -Exclude` en PowerShell** no excluye subdirectorios recursivamente como se esperaría. Para copiar sin `node_modules`, usar `xcopy /EXCLUDE:archivo.txt` o `robocopy /XD node_modules`.
4. **Docker health checks** son críticos para que `depends_on: condition: service_healthy` funcione. Sin ellos, los servicios arrancan antes de que la BD esté lista.
5. **Variables de entorno en Docker Compose** se pasan desde un `.env` en la raíz del proyecto. El archivo `.env.example` sirve como plantilla.
6. **Los formularios con Zod + React Hook Form** pueden dar problemas de tipos cuando se usa `z.coerce`. La solución más pragmática es `as any` en el resolver.
7. **Nginx rate limiting** protege contra ataques de fuerza bruta al login. La zona `login` limita a 5 intentos por minuto por IP.

---
