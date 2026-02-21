# Guía de Desarrollo — TienditaCampus

## Prerequisitos
- Docker v20+ y Docker Compose v2+
- Node.js 20+ (solo si trabajas sin Docker)
- Git

## Setup Rápido (Docker)

```bash
# 1. Clonar
git clone <repo-url> && cd proyecto_integrador

# 2. Configurar entorno
bash devops/scripts/setup-env.sh
bash devops/scripts/generate-secrets.sh

# 3. Levantar
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# 4. Verificar
bash devops/scripts/health-check.sh
```

## Setup Local (sin Docker)

```bash
# Backend
cd backend && npm install && npm run start:dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev
```

## Base de Datos

```bash
# Inicializar
bash database/scripts/init-db.sh

# Seeds de desarrollo
bash database/scripts/run-seeds.sh --dev

# Verificar integridad
bash database/scripts/verify-db.sh

# Backup
bash database/scripts/backup.sh

# Reset (¡solo desarrollo!)
bash database/scripts/reset-db.sh
```

## Estructura de URLs

| URL | Servicio |
|-----|---------|
| http://localhost:3000 | Frontend |
| http://localhost:3001/api | Backend |
| http://localhost:80 | Nginx (proxy) |
