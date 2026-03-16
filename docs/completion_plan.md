# Plan de Finalización del Proyecto TienditaCampus 🚀

Este plan detalla los pasos para llevar el proyecto del estado actual (~60%) al 100% de cumplimiento con la especificación técnica.

## 📅 Fase 1: Experiencia del Comprador (Prioridad Alta)
*Esta fase habilita la parte pública de la plataforma, permitiendo que los estudiantes vean qué se vende.*

### HU-05: Catálogo Público
- [ ] **Backend**: Crear `ProductsController.getPublicCatalog` (filtrar `stock > 0`, búsqueda).
- [ ] **Frontend**: Crear vista `/marketplace` (fuera del dashboard).
- [ ] **Frontend**: Implementar barra de búsqueda y tarjetas de producto.

### HU-06: Perfil de Vendedor
- [ ] **Backend**: Crear `UsersController.getSellerProfile` (info pública + productos activos).
- [ ] **Frontend**: Crear vista dinámica `/seller/[id]`.
- [ ] **Frontend**: Mostrar "Badge" de estado (Activo/Inactivo) basado en stock.

## 📈 Fase 2: Inteligencia de Negocio (Prioridad Media)
*Esta fase aporta el valor diferencial de "analítica" para el vendedor.*

### HU-02: Dashboard ROI Avanzado
- [ ] **Backend**: Implementar lógica de ROI (Ventas - Inversión) por rango de fechas.
- [ ] **Frontend**: Integrar librería de gráficos (Recharts/Chart.js) en `/dashboard`.
- [ ] **Frontend**: Mostrar gráfico de barras "Inversión vs Ganancia".

### HU-03: Predicción de Demanda
- [ ] **Backend**: Implementar algoritmo IQR en `SalesService` para sugerir stock.
- [ ] **Frontend**: Crear widget de alerta "Sugerencia del día" en el Dashboard.

## 🛠️ Fase 3: Funcionalidades de Cierre y PWA (Prioridad Baja/Polish)
*Refinamiento de flujos existentes.*

### HU-04: Cierre de Caja
- [ ] **Frontend**: Crear modal "Cerrar Día" en `/dashboard/inventory`.
- [ ] **Backend**: Endpoint para registrar mermas masivas y cerrar sesión con reporte.

### HU-07: Validación PWA
- [ ] **QA**: Auditar con Lighthouse y ajustar `manifest.json` / `sw.js` si es necesario.

---
**Estrategia de Ejecución:**
Comenzaremos inmediatamente con la **Fase 1**, ya que sin ella el sistema es solo un ERP personal y no un Marketplace.
