# 🚀 Guía de Setup para el Equipo — TienditaCampus

> Sigue estos pasos para tener el proyecto funcionando en tu máquina desde cero.

---

## 📋 Requisitos Previos

Antes de empezar, instala lo siguiente:

| Herramienta | Versión | Descarga |
|-------------|---------|----------|
| **Git** | 2.40+ | https://git-scm.com/downloads |
| **Docker Desktop** | 4.x+ | https://www.docker.com/products/docker-desktop |
| **Node.js** | 20+ (solo si trabajas sin Docker) | https://nodejs.org |
| **VS Code** (recomendado) | Latest | https://code.visualstudio.com |

> ⚠️ **Docker Desktop debe estar CORRIENDO** antes de ejecutar cualquier comando.

---

## 1️⃣ Clonar los 3 Repositorios

Abre tu terminal y ejecuta estos comandos:

```bash
# Crear carpeta del proyecto
mkdir tienditacampus && cd tienditacampus

# Clonar los 3 repos
git clone https://github.com/EmilioJaras3/tienditacampus-frontend.git frontend
git clone https://github.com/EmilioJaras3/tienditacampus-backend.git backend
git clone https://github.com/EmilioJaras3/tienditacampus-database.git database
```

Después de clonar, tu estructura debe verse así:
```
tienditacampus/
├── frontend/     ← Next.js 14 (UI)
├── backend/      ← NestJS (API REST)
└── database/     ← PostgreSQL (scripts SQL)
```

---

## 2️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta raíz (`tienditacampus/`):

```bash
# Crear el archivo .env
```

Contenido del `.env`:
```env
# ── PostgreSQL (Base de datos relacional) ──────
POSTGRES_HOST=database
POSTGRES_PORT=5432
POSTGRES_DB=tienditacampus
POSTGRES_USER=tc_admin
POSTGRES_PASSWORD=TienditaCampus2026DB!

# ── Backend (NestJS API) ──────────────────────
NODE_ENV=development
BACKEND_PORT=3001
JWT_SECRET=mi-secreto-jwt-super-seguro-cambiar-en-produccion
JWT_EXPIRATION=7d

# ── Argon2 (Hashing de contraseñas) ──────────
ARGON2_MEMORY_COST=19456
ARGON2_TIME_COST=2
ARGON2_PARALLELISM=1

# ── Frontend ──────────────────────────────────
NEXT_PUBLIC_API_URL=/api

# ── Docker / Nginx ────────────────────────────
NGINX_HTTP_PORT=8080
```

---

## 3️⃣ Crear docker-compose.yml

Crea un archivo `docker-compose.yml` en la carpeta raíz (`tienditacampus/`):

```yaml
version: "3.9"

services:
  # ─── Frontend (Next.js 14) ─────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: tc-frontend
    restart: unless-stopped
    networks:
      - tc-network
    depends_on:
      backend:
        condition: service_healthy

  # ─── Backend (NestJS API) ──────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: tc-backend
    restart: unless-stopped
    environment:
      - NODE_ENV=${NODE_ENV}
      - BACKEND_PORT=${BACKEND_PORT}
      - POSTGRES_HOST=${POSTGRES_HOST}
      - POSTGRES_PORT=${POSTGRES_PORT}
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRATION=${JWT_EXPIRATION}
      - ARGON2_MEMORY_COST=${ARGON2_MEMORY_COST}
      - ARGON2_TIME_COST=${ARGON2_TIME_COST}
      - ARGON2_PARALLELISM=${ARGON2_PARALLELISM}
      - MONGO_URI=mongodb://mongodb:27017/tienditacampus_logs
    ports:
      - "${BACKEND_PORT}:${BACKEND_PORT}"
    networks:
      - tc-network
    depends_on:
      database:
        condition: service_healthy
      mongodb:
        condition: service_started
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:${BACKEND_PORT}/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 60s

  # ─── Database (PostgreSQL 16) ──────────────────
  database:
    image: postgres:16-alpine
    container_name: tc-database
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - tc-pgdata:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
    networks:
      - tc-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # ─── MongoDB (NoSQL — Logs de auditoría) ───────
  mongodb:
    image: mongo:7
    container_name: tc-mongodb
    restart: unless-stopped
    volumes:
      - tc-mongodata:/data/db
    networks:
      - tc-network

  # ─── Nginx (Reverse Proxy) ────────────────────
  nginx:
    image: nginx:alpine
    container_name: tc-nginx
    restart: unless-stopped
    ports:
      - "${NGINX_HTTP_PORT:-8080}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    networks:
      - tc-network
    depends_on:
      - frontend
      - backend

networks:
  tc-network:
    driver: bridge

volumes:
  tc-pgdata:
  tc-mongodata:
```

---

## 4️⃣ Crear configuración de Nginx

Crea un archivo `nginx.conf` en la carpeta raíz (`tienditacampus/`):

```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 10M;

    upstream frontend { server frontend:3000; }
    upstream backend  { server backend:3001;  }

    server {
        listen 80;

        # API → Backend
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Todo lo demás → Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

## 5️⃣ Levantar Todo con Docker

```bash
# Desde la carpeta raíz (tienditacampus/)
docker compose up --build

# Espera ~3-5 minutos para que todo compile y arranque
```

### Verificar que funciona:

| Servicio | URL | Qué debería mostrar |
|----------|-----|---------------------|
| 🌐 **Frontend** | http://localhost:8080 | Página de login |
| ⚙️ **API Health** | http://localhost:8080/api/health | `{"status": "ok"}` |
| 🔐 **API Login** | POST http://localhost:8080/api/auth/login | Token JWT |

---

## 6️⃣ Crear tu Primer Usuario

Como la base de datos empieza vacía, necesitas registrar un usuario:

### Opción A: Desde el navegador
1. Ve a http://localhost:8080/register
2. Llena el formulario con tus datos
3. ¡Listo! Ya puedes hacer login

### Opción B: Desde la terminal
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu_matricula@ids.upchiapas.edu.mx",
    "password": "TuPassword123!",
    "firstName": "Tu Nombre",
    "lastName": "Tu Apellido",
    "phone": "9611234567"
  }'
```

---

## 7️⃣ Estructura del Proyecto

```
tienditacampus/
├── frontend/                 ← Repo: tienditacampus-frontend
│   ├── src/
│   │   ├── app/              ← Páginas (App Router Next.js 14)
│   │   ├── components/       ← Componentes React (UI, layout)
│   │   ├── services/         ← Clientes HTTP para la API
│   │   ├── store/            ← Estado global (Zustand)
│   │   └── types/            ← Interfaces TypeScript
│   ├── package.json
│   └── Dockerfile
│
├── backend/                  ← Repo: tienditacampus-backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         ← Login, registro, JWT
│   │   │   ├── products/     ← CRUD de productos
│   │   │   ├── sales/        ← Ventas diarias
│   │   │   ├── inventory/    ← Control de stock
│   │   │   ├── audit/        ← Logs en MongoDB (NoSQL)
│   │   │   └── users/        ← Perfiles de usuario
│   │   └── common/           ← Guards, decorators, health
│   ├── package.json
│   └── Dockerfile
│
├── database/                 ← Repo: tienditacampus-database
│   ├── init/                 ← Scripts de inicialización
│   ├── migrations/           ← Migraciones SQL
│   ├── seeds/                ← Datos de prueba
│   └── scripts/              ← Utilidades (backup, reset)
│
├── docker-compose.yml        ← Orquestación (lo creas tú)
├── nginx.conf                ← Reverse proxy (lo creas tú)
└── .env                      ← Variables de entorno (lo creas tú)
```

---

## 🛠️ Comandos Útiles

| Comando | Qué hace |
|---------|----------|
| `docker compose up --build` | Construir y arrancar todo |
| `docker compose up -d` | Arrancar en background |
| `docker compose down` | Detener todo |
| `docker compose logs backend --tail 20` | Ver logs del backend |
| `docker compose logs frontend --tail 20` | Ver logs del frontend |
| `docker compose exec database psql -U tc_admin -d tienditacampus` | Conectar a PostgreSQL |
| `docker exec tc-mongodb mongosh tienditacampus_logs` | Conectar a MongoDB |

---

## 🗄️ Bases de Datos

El proyecto usa **2 bases de datos**:

| BD | Tipo | Puerto | Uso |
|----|------|--------|-----|
| **PostgreSQL 16** | Relacional (SQL) | 5432 | Usuarios, productos, ventas, inventario |
| **MongoDB 7** | No relacional (NoSQL) | 27017 | Logs de auditoría (documentos JSON) |

---

## 🔑 Endpoints de la API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Registrar usuario |
| POST | `/api/auth/login` | No | Iniciar sesión |
| GET | `/api/auth/profile` | Sí | Perfil del usuario |
| GET | `/api/products` | Sí | Lista de productos |
| POST | `/api/products` | Sí | Crear producto |
| GET | `/api/products/:id` | Sí | Detalle de producto |
| PATCH | `/api/products/:id` | Sí | Actualizar producto |
| DELETE | `/api/products/:id` | Sí | Eliminar producto |
| GET | `/api/products/marketplace` | No | Catálogo público |
| POST | `/api/inventory` | Sí | Registrar stock |
| GET | `/api/inventory/product/:id` | Sí | Historial de stock |
| GET | `/api/sales/today` | Sí | Venta del día |
| POST | `/api/sales/prepare` | Sí | Preparar jornada |
| POST | `/api/sales/track` | Sí | Registrar venta |
| POST | `/api/sales/close-day` | Sí | Cerrar día |
| GET | `/api/sales/history` | Sí | Historial de ventas |
| GET | `/api/sales/roi` | Sí | ROI acumulado |
| GET | `/api/audit/recent` | Sí | Logs recientes (MongoDB) |
| GET | `/api/health` | No | Estado del servicio |

---

## ❓ Problemas Comunes

### "El puerto 8080 ya está en uso"
Cambia `NGINX_HTTP_PORT=8080` a otro puerto en tu `.env` (ej: `NGINX_HTTP_PORT=9090`).

### "El frontend no carga datos"
Revisa que la API esté corriendo: http://localhost:8080/api/health

### "Error 500 en login"
Es probable que el hash de contraseña esté corrupto. Registra un usuario nuevo desde `/register`.

### "Docker tarda mucho en construir"
La primera vez tarda ~5-8 minutos. Las siguientes veces es más rápido gracias al cache.

---

## 🔄 Cómo Actualizar

Cuando alguien del equipo suba cambios:

```bash
# Desde la carpeta raíz (tienditacampus/)
cd frontend && git pull origin main && cd ..
cd backend && git pull origin main && cd ..
cd database && git pull origin main && cd ..

# Reconstruir con los cambios
docker compose up --build -d
```

---

> 📝 **¿Dudas?** Revisa el archivo `docs/CONTEXTO_PROYECTO.md` en cualquiera de los repos para más detalles.
