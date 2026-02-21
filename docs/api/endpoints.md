# API Endpoints — TienditaCampus

## Base URL
`/api`

## Autenticación
| Método | Endpoint | Descripción |
|--------|----------|------------|
| POST | `/api/auth/register` | Registrar usuario nuevo |
| POST | `/api/auth/login` | Iniciar sesión (retorna JWT) |

## Usuarios
| Método | Endpoint | Descripción |
|--------|----------|------------|
| GET | `/api/users/me` | Perfil del usuario actual |
| PUT | `/api/users/me` | Actualizar perfil |

## Productos
| Método | Endpoint | Descripción |
|--------|----------|------------|
| GET | `/api/products` | Listar productos del vendedor |
| POST | `/api/products` | Crear producto |
| GET | `/api/products/:id` | Detalle de producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

## Ventas
| Método | Endpoint | Descripción |
|--------|----------|------------|
| GET | `/api/sales` | Listar ventas diarias |
| POST | `/api/sales` | Registrar venta del día |
| GET | `/api/sales/:id` | Detalle de venta |

## Reportes
| Método | Endpoint | Descripción |
|--------|----------|------------|
| GET | `/api/reports/weekly` | Resumen semanal |
| GET | `/api/reports/demand` | Predicción de demanda |

## Health
| Método | Endpoint | Descripción |
|--------|----------|------------|
| GET | `/api/health` | Estado del servicio |
