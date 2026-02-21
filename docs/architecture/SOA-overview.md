# Arquitectura SOA — TienditaCampus

## Visión General

TienditaCampus utiliza una **Arquitectura Orientada a Servicios (SOA)**, donde cada servicio es independiente, desplegable y escalable por separado.

## Servicios

| Servicio | Tecnología | Responsabilidad |
|----------|-----------|----------------|
| **Frontend** | Next.js 14 | PWA, interfaz de usuario, SSR |
| **Backend** | NestJS | API REST, lógica de negocio, autenticación |
| **Database** | PostgreSQL 16 | Persistencia, migraciones, integridad |
| **Proxy** | Nginx | Reverse proxy, SSL, rate limiting |

## Principios

1. **Desacoplamiento total**: Cada servicio tiene su propio `package.json`, Dockerfile, y configuración
2. **Seguridad por defecto**: Sin credenciales hardcodeadas, roles PostgreSQL, validación de env vars
3. **Contenedores**: Todo corre en Docker, orquestado con Docker Compose
4. **CI/CD**: GitHub Actions para lint, test, build y deploy automático
