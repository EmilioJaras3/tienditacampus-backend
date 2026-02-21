# Guía de Despliegue — TienditaCampus

## Despliegue Rápido

```bash
bash devops/scripts/deploy.sh
```

## Despliegue Manual

```bash
# 1. Configurar .env para producción
cp .env.example .env
bash devops/scripts/generate-secrets.sh

# 2. Build y deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Verificar
bash devops/scripts/health-check.sh
```

## SSL/HTTPS

Coloca los certificados en `devops/docker/nginx/ssl/`:
- `certificate.crt`
- `private.key`

## Backups

Los backups se crean automáticamente antes de cada despliegue. Para backup manual:
```bash
bash devops/scripts/backup-db.sh
```
