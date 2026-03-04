# CHANGES_IMPLEMENTED

**Fecha:** 2026-03-02

## Resumen técnico

Se implementaron los gaps funcionales críticos en backend:

1. Calculadora de punto de equilibrio por producto con validación de margen positivo.
2. Módulo de reportes semanales con persistencia operativa en `weekly_reports`.
3. Módulo de dashboard comparativo temporal (semana/mes) con rentabilidad por producto.
4. Endpoint de analítica de ventas por día de semana con agregaciones.
5. Alineación de módulos activos en `AppModule` y desactivación definitiva de `synchronize`.

## Archivos creados/modificados

### Creados
- `src/modules/break-even/break-even.module.ts`
- `src/modules/break-even/break-even.controller.ts`
- `src/modules/break-even/break-even.service.ts`
- `src/modules/break-even/dto/calculate-break-even.dto.ts`
- `src/modules/reports/reports.module.ts`
- `src/modules/reports/reports.controller.ts`
- `src/modules/reports/reports.service.ts`
- `src/modules/reports/entities/weekly-report.entity.ts`
- `src/modules/reports/dto/get-weekly-reports.dto.ts`
- `src/modules/dashboard/dashboard.module.ts`
- `src/modules/dashboard/dashboard.controller.ts`
- `src/modules/dashboard/dashboard.service.ts`
- `src/modules/dashboard/dto/dashboard-comparison-query.dto.ts`

### Modificados
- `src/app.module.ts`
- `src/config/database.config.ts`
- `src/modules/sales/sales.controller.ts`
- `src/modules/sales/sales.service.ts`
- `src/modules/sales/entities/daily-sale.entity.ts`

## Justificación funcional

- Se cubre cálculo de break-even por producto con fórmula explícita y protección de margen no positivo.
- Se habilita generación y consulta de reportes semanales para utilidad neta real y porcentaje de pérdida.
- Se incorpora comparación temporal operativa para toma de decisiones en dashboard.
- Se expone analítica por día de semana como endpoint funcional de negocio.
- Se evita dependencia de sincronización automática de esquema en runtime, priorizando migraciones.

## Riesgos mitigados

- Riesgo de cálculos financieros inconsistentes por margen <= 0 en break-even.
- Riesgo de ausencia de persistencia semanal para indicadores operativos.
- Riesgo de desalineación entre expectativas de dashboard y datos agregados reales.
- Riesgo de deriva de esquema por `synchronize` en entornos no controlados.
