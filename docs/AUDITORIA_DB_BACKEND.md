# Auditoría de Arquitectura y Lógica de Negocio - Tiendita Campus

> **Auditor:** Staff Engineer / Arquitecto de Datos  
> **Fecha:** 2026-03-07  
> **Versión de Migraciones Analizadas:** V001–V011  
> **Alcance:** SQL Ground Truth vs TypeORM ORM vs Lógica de Negocio (Services)  
> **Metodología:** Las migraciones SQL se tratan como fuente de verdad absoluta. El ORM y los servicios son evaluados contra ellas.

---

## 1. Discrepancias SQL vs TypeORM

### 1.1 — `products`: Relación `category_id` completamente huérfana

**Severidad: 🔴 CRÍTICA**

**SQL (V002):**
```sql
category_id UUID REFERENCES categories(id) ON DELETE SET NULL
```
La tabla `categories` existe con su propio DDL, `name`, `description`, `icon`, `is_active`. La columna `category_id` es una FK válida en producción.

**TypeORM (`product.entity.ts`):**  
La propiedad `categoryId` **no existe**. No hay `@ManyToOne` a una entidad `Category`. Tampoco existe `category.entity.ts` en ningún lugar del proyecto.

**Consecuencia real:**  
- Cualquier `INSERT` de producto vía ORM ignora la categoría — se guarda como `NULL` en BD.  
- No es posible filtrar productos por categoría desde el ORM.  
- El campo `icon` de `categories` (pensado para la UI) nunca se puede leer.  
- La tabla `categories` en base de datos queda como infraestructura muerta.

---

### 1.2 — `sale_details.waste_reason`: ENUM nativo sin `enumName` — **bomba de tiempo en producción**

**Severidad: 🔴 CRÍTICA**

**SQL (V011):**
```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'waste_reason_type') THEN
    CREATE TYPE waste_reason_type AS ENUM ('expired', 'damaged', 'other');
  END IF;
END $$;

ALTER TABLE sale_details ADD COLUMN IF NOT EXISTS waste_reason waste_reason_type NULL;
```
El tipo `waste_reason_type` es un **ENUM nativo de PostgreSQL registrado en el catálogo del sistema (`pg_type`)**.

**TypeORM (`sale-detail.entity.ts`):**
```typescript
@Column({
  type: 'enum',
  enum: ['expired', 'damaged', 'other'],
  nullable: true,
  name: 'waste_reason',
})
wasteReason: 'expired' | 'damaged' | 'other' | null;
```
Falta el campo **`enumName: 'waste_reason_type'`**.

**Consecuencia real:**  
Sin `enumName`, TypeORM asume que debe gestionar su propio tipo llamado `sale_details_waste_reason_enum`. Al intentar persistir o hacer migraciones automáticas, TypeORM intentará crear ese tipo que no existe, o al leer datos intentará castearlo y fallará con un error de tipo. En producción esto se manifiesta como un `QueryFailedError: operator does not exist: waste_reason_type = text`.

Este mismo patrón ya está documentado en `ORM_DB_COLLISIONS.md` para `user_role` — **el problema se repitió en V011 sin corregirse**.

---

### 1.3 — `inventory_records.status`: VARCHAR con CHECK vs type: 'enum' de TypeORM

**Severidad: 🔴 ALTA**

**SQL (V004):**
```sql
status VARCHAR(20) DEFAULT 'active'
       CHECK (status IN ('active', 'sold_out', 'expired', 'closed'))
```
Es un `VARCHAR` con constraint `CHECK`. **No es un ENUM nativo de PostgreSQL.**

**TypeORM (`inventory-record.entity.ts`):**
```typescript
@Column({
  type: 'enum',
  enum: ['active', 'sold_out', 'expired', 'closed'],
  default: 'active',
})
status: 'active' | 'sold_out' | 'expired' | 'closed';
```
TypeORM-postgres con `type: 'enum'` sobre una columna `VARCHAR` creará o buscará un tipo `inventory_records_status_enum` en el catálogo de PostgreSQL. Este tipo **no existe** porque la columna es un `VARCHAR`. El comportamiento en runtime con `synchronize: false` es impredecible: puede funcionar en lectura (PostgreSQL hace un cast silencioso) pero fallar en escritura si el driver valida el tipo.

---

### 1.4 — `weekly_reports`: Tipos TypeScript financieros declarados como `string`

**Severidad: 🔴 ALTA**

**SQL (V005):**  
`total_investment`, `total_revenue`, `total_profit`, `avg_profit_margin`, `loss_percentage` son `DECIMAL(10,2)` — numéricos.

**TypeORM (`weekly-report.entity.ts`):**
```typescript
totalInvestment: string;  // ← DEBE SER number
totalRevenue: string;     // ← DEBE SER number
totalProfit: string;      // ← DEBE SER number
avgProfitMargin: string;  // ← DEBE SER number
lossPercentage: string;   // ← DEBE SER number
```
El driver `pg` de Node.js devuelve `DECIMAL`/`NUMERIC` como `string` para evitar pérdida de precisión flotante. TypeORM **no hace el casteo automático** a `number`. El efecto en el código que consuma estas entidades: al intentar sumar `totalRevenue + totalProfit`, JavaScript ejecuta **concatenación de strings** en lugar de suma numérica. Esto es un bug aritmético silencioso.

---

### 1.5 — `products.image_url`: Tipo de columna inconsistente

**Severidad: 🟡 MEDIA**

**SQL (V002):** `image_url VARCHAR(500)`  
**TypeORM:** `@Column({ type: 'text', nullable: true, name: 'image_url' })`

`TEXT` no tiene límite de longitud. `VARCHAR(500)` sí. El ORM permitirá guardar URLs de más de 500 caracteres que a nivel de BD serán rechazadas por el constraint. Aunque en la práctica las URLs raramente superan 500 chars, el tipo declarado en el schema y en el ORM debería ser el mismo.

---

### 1.6 — `orders.status`: Valor `'accepted'` perdido en la entidad

**Severidad: 🟡 MEDIA**

**SQL (V009):**
```sql
CHECK (status IN ('requested', 'pending', 'accepted', 'completed', 'cancelled', 'rejected'))
```

**TypeORM (`order.entity.ts`):**
```typescript
status: string; // Comentario: 'requested', 'pending', 'completed', 'cancelled', 'rejected'
```
El valor `'accepted'` **está definido en SQL pero no está en el comentario de la entidad**. Más grave: al usar `type: 'varchar'` sin enum TypeScript, no hay ninguna validación en el ORM. Un servicio que haga `status = 'acepted'` (typo) pasará la validación del ORM y solo fallará en base de datos si hay un constraint CHECK activo.

---

### 1.7 — `daily_sales.break_even_units`: Columna existente, sin lógica de persistencia

**Severidad: 🟡 MEDIA (funcional)**

**SQL (V011):**
```sql
ALTER TABLE daily_sales
  ADD COLUMN IF NOT EXISTS break_even_units NUMERIC(10,2) NULL;
```

**TypeORM:** La columna está correctamente mapeada en `daily-sale.entity.ts`.

**Servicio:** `SalesService.closeDay()` no calcula ni persiste `break_even_units`. `BreakEvenService.calculate()` computa el punto de equilibrio ad-hoc y **descarta el resultado sin guardarlo**.

El campo existe en la base de datos pero siempre contiene `NULL`. Los reportes históricos de punto de equilibrio por día son imposibles.

---

### Tabla Resumen de Discrepancias

| # | Tabla / Campo | SQL Ground Truth | TypeORM | Impacto |
|---|---------------|-----------------|---------|---------|
| 1 | `products.category_id` | FK a `categories` | **AUSENTE** | Relación completamente rota |
| 2 | `sale_details.waste_reason` | ENUM nativo `waste_reason_type` | Falta `enumName` | Error de tipo en producción |
| 3 | `inventory_records.status` | `VARCHAR(20)` con CHECK | `type: 'enum'` | Inconsistencia de tipo |
| 4 | `weekly_reports.*` (5 campos) | `DECIMAL(10,2)` | `string` en TypeScript | Bugs aritméticos silenciosos |
| 5 | `products.image_url` | `VARCHAR(500)` | `type: 'text'` | Diferente límite de longitud |
| 6 | `orders.status` | Incluye `'accepted'` | Sin validación enum | Valor silenciosamente perdido |
| 7 | `daily_sales.break_even_units` | Columna existe en DB | Nunca se persiste | KPI histórico siempre NULL |

---

## 2. Evaluación de Lógica Financiera y Merma

### 2.1 — Punto de Equilibrio: El cálculo existe pero no cierra el ciclo

El `BreakEvenService` usa aritmética de centavos con `BigInt` para evitar errores de punto flotante. Eso es **correcto y bien implementado**. El problema es estructural:

```
BreakEvenService.calculate()
  → Recibe: fixedCosts, unitCost, unitPrice
  → Calcula: break_even_units = fixedCosts / (unitPrice - unitCost)
  → Retorna: el resultado al cliente
  → Persiste: NADA ← aquí está el fallo
```

**El modelo asume `fixedCosts` como parámetro de entrada del usuario**, no como un dato derivado del sistema. Esto tiene dos problemas contables graves:

1. **`fixedCosts` no está en la base de datos.** No hay tabla de costos fijos (renta, electricidad, etc.). El sistema permite al estudiante ingresar un número arbitrario en cada consulta, sin histórico. Esto no es un cálculo de punto de equilibrio real — es una calculadora de bolsillo.

2. **El modelo usa precio y costo unitario de `products`**, pero en `sale_details` hay snapshots históricos (`unit_cost`, `unit_price`) que pueden diferir del producto actual si el precio cambió. El `BreakEvenService` usa `product.salePrice` (precio actual), no el precio histórico de la venta.

**Veredicto: La lógica matemática del break-even es correctamente calculada pero contablemente vacía. No existe ningún mecanismo para que el resultado sea útil a lo largo del tiempo.**

---

### 2.2 — Merma: La trazabilidad existe a medias

La columna `waste_reason` (V011) está bien pensada conceptualmente. El problema es el flujo de datos:

**Flujo actual:**
```
SalesService.closeDay(wastes)
  → Para cada producto: detail.quantityLost = waste
  → detail.quantitySold = quantityPrepared - waste
  → saleDetailRepository.save(detail)
  ← waste_reason: NUNCA SE ASIGNA ← bug crítico
  ← waste_cost:   NUNCA SE CALCULA ← bug crítico
```

`closeDay()` recibe `{ productId, waste: number }` — solo el número de unidades perdidas. **No recibe ni persiste `waste_reason`** (si fue por vencimiento, daño o causa desconocida). La columna `waste_reason_type` que costó crear en V011 queda siempre en `NULL`.

Adicionalmente, `waste_cost` debería calcularse como `quantity_lost × unit_cost`. Este cálculo **no ocurre en `closeDay()`**. En `recalculateHeader()` se intenta leer `detail.wasteCost` para acumular `totalWasteCost`, pero como nunca se calcula, siempre suma cero.

**El resumen del problema:**  
`daily_sales.total_waste_cost` siempre es `0`.  
`sale_details.waste_reason` siempre es `NULL`.  
`sale_details.waste_cost` siempre es `0`.

**Esto significa que el objetivo central del proyecto — reducir el 15-20% de merma — carece actualmente de los datos para medirse.**

---

### 2.3 — `total_profit` en `daily_sales`: Generada por PostgreSQL pero calculada dos veces

`total_profit` es una columna `GENERATED ALWAYS AS (total_revenue - total_investment) STORED`. PostgreSQL la mantiene automáticamente.

Sin embargo, en `recalculateHeader()`:
```typescript
const profit = totalRevenue - Number(sale.totalInvestment);
sale.profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
```

La entidad `DailySale.totalProfit` está declarada como `generatedType: 'STORED'` con `insert: false, update: false`. Eso es correcto. Pero el `profitMargin` se calcula en Node.js con `Number(sale.totalInvestment)`, lo que convierte un `DECIMAL` a un `float64`. Para valores que superen los 15 dígitos significativos habrá errores de representación. En el contexto de ventas universitarias pequeñas esto es bajo riesgo, pero la inconsistencia de usar `BigInt` en `BreakEvenService` y `Number()` en `SalesService` revela falta de una estrategia unificada de precisión numérica.

---

### 2.4 — Reporte Semanal: Ignora completamente la merma en el cálculo de rentabilidad

`ReportsService.generateWeeklyReport()` agrega:
- `total_revenue` ✅
- `total_investment` ✅
- `total_profit` ✅
- `avg_profit_margin` ✅
- `total_units_lost` ✅
- `loss_percentage` ✅

**Ausente del reporte semanal:**
- `total_waste_cost` (el costo económico real de la merma) ❌
- `break_even_units` promedio o acumulado ❌

Un reporte de rentabilidad que no incluye el **costo económico de la merma** como línea separada no es un reporte de rentabilidad real — es un reporte de margen bruto. La pérdida por merma queda oculta dentro de `total_profit` (porque la inversión ya incluye todo lo comprado, vendido o no), pero no se puede ver de forma aislada. El estudiante vendedor no puede saber cuánto dinero específicamente perdió por vencimientos esa semana.

---

### 2.5 — `InventoryService`: Lógica incompleta

`InventoryService` solo tiene dos métodos: `addStock` y `getHistoryByProduct`. No tiene:

- Método para decrementar `quantity_remaining` al vender (eso lo hace `SalesService` sobre `InventoryRecord` directamente con `dataSource.getRepository(InventoryRecord)`).
- Ninguna operación de "foto de cierre diario" (snapshot). Al final del día, `status` cambia a `closed`/`expired` pero la foto queda enterrada en el registro que se muta, no en un snapshot histórico inmutable.

El servicio de inventario y el servicio de ventas **están acoplados implícitamente**: ventas modifica entidades de inventario sin pasar por el `InventoryService`. Esto quiebra la separación de responsabilidades y hace el flujo difícil de auditar.

---

## 3. Riesgos de Rendimiento

### 3.1 — `SalesService.closeDay()`: Bucle con múltiples queries síncronos (N+1 garantizado)

```typescript
for (const item of wastes) {
  // Query 1: findOne(InventoryRecord)  ← dentro del bucle
  const activeInventory = await dataSource.getRepository(InventoryRecord).findOne(...);
  // Query 2: save(detail)             ← dentro del bucle
  await saleDetailRepository.save(detail);
  // Query 3: save(activeInventory)    ← dentro del bucle
  await dataSource.getRepository(InventoryRecord).save(activeInventory);
}
```

Para un vendedor con 10 productos: **30 queries secuenciales** dentro de una transacción implícita. No se usa `QueryRunner` para esto (sí se usa en `prepareDay` pero no en `closeDay`). Si la BD tiene latencia mínima de 2ms por query, el cierre de día tarda mínimo 60ms solo en I/O de BD, sin contar la lógica de aplicación.

**Fix:** Usar un `QueryRunner` con transacción explícita, cargar todos los `InventoryRecord` en un solo `WHERE product_id IN (...)` antes del bucle, operar en memoria, y hacer `save` masivo al final.

---

### 3.2 — `recalculateHeader()`: Bucle de operaciones en memoria sobre relaciones no cargadas

```typescript
private async recalculateHeader(dailySaleId: string) {
  const sale = await this.dailySaleRepository.findOne({
    where: { id: dailySaleId },
    relations: ['details']  // ← SIN details.product
  });

  for (const detail of sale.details) {
    totalRevenue += Number(detail.unitPrice) * detail.quantitySold;
    // ...
    totalWasteCost += Number(detail.wasteCost || 0);
  }

  await this.dailySaleRepository.save(sale);
  // Y luego OTRA query:
  await this.dailySaleRepository.update(sale.id, { ... }); // ← Query duplicada
}
```

Hay **dos writes a la misma fila** de `daily_sales` en la misma operación: primero `save(sale)` (que escribe todo el objeto) y luego `update(sale.id, {...})` (que escribe los mismos campos otra vez). Esto es un doble write innecesario — una transacción que debería ser atómica hace dos round-trips a la BD.

---

### 3.3 — `SalesService.getPrediction()`: Raw query sin límite por producto

```sql
SELECT sd.product_id, p.name, sd.quantity_sold
FROM sale_details sd
INNER JOIN daily_sales ds ON ds.id = sd.daily_sale_id
INNER JOIN products p ON p.id = sd.product_id
WHERE ds.seller_id = $1 
AND EXTRACT(DOW FROM ds.sale_date) = $2
AND ds.sale_date < CURRENT_DATE
ORDER BY sd.product_id, ds.sale_date DESC
LIMIT 100
```

El `LIMIT 100` es sobre el resultado total, no por producto. Un vendedor con 20 productos solo obtendrá datos de los primeros 5 productos (100 rows / ~20 semanas de histórico = 5 productos). Los demás no tendrán suficientes datos (`sales.length < 3`) y retornan `null`. La predicción IQR es estadísticamente inválida con datos truncados.

**Index faltante:** No existe índice en `(seller_id, sale_date)` en `sale_details`. La query hace un `INNER JOIN daily_sales` que usa `idx_daily_sales_seller_date`, pero el join también depende de `sale_details.daily_sale_id` — el índice `idx_sale_details_daily` existe. Sin embargo, `EXTRACT(DOW FROM ds.sale_date)` es una función sobre una columna indexada, lo que **invalida el uso del índice** — PostgreSQL hará un sequential scan sobre `daily_sales` para este predicado.

**Fix:** Agregar índice funcional:
```sql
CREATE INDEX IF NOT EXISTS idx_daily_sales_dow ON daily_sales (seller_id, EXTRACT(DOW FROM sale_date));
```

---

### 3.4 — `ReportsService.generateWeeklyReport()`: La única consulta bien hecha

El reporte semanal usa una CTE con `INSERT ... ON CONFLICT DO UPDATE`. Es la única operación del backend que **no tiene problema de N+1** — hace exactamente 1 query para leer y 1 query para escribir. Sin embargo, `best_product` usa `ROW_NUMBER()` sin partición, lo que asume que solo hay un vendedor en el resultado (correcto dado el filtro por `seller_id` en el JOIN). Esto es funcionalmente correcto pero frágil si el query se modifica en el futuro.

---

### 3.5 — Falta de índice para consultas de merma (V011 parcial)

V011 crea un índice parcial sobre `waste_reason`:
```sql
CREATE INDEX IF NOT EXISTS idx_sale_details_waste_reason ON sale_details(waste_reason)
  WHERE waste_reason IS NOT NULL;
```

Este índice es correcto, pero dado que `waste_reason` siempre es `NULL` (ver §2.2), el índice está permanentemente vacío y nunca se usa. No existe ningún índice sobre `(daily_sale_id, waste_cost)` para las queries de agregación de merma por día.

---

## 4. Plan de Acción Recomendado

Las acciones están ordenadas de mayor a menor impacto en la integridad del negocio.

---

### P0 — Correcciones que afectan datos en producción

**P0-1: Agregar `enumName: 'waste_reason_type'` en `SaleDetail`**  
Sin esto, cualquier ambiente con TypeORM activo puede corromper la columna.
```typescript
// sale-detail.entity.ts
@Column({
  type: 'enum',
  enumName: 'waste_reason_type',  // ← AGREGAR ESTA LÍNEA
  enum: ['expired', 'damaged', 'other'],
  nullable: true,
  name: 'waste_reason',
})
wasteReason: 'expired' | 'damaged' | 'other' | null;
```

**P0-2: Cambiar `inventory_records.status` de `type: 'enum'` a `type: 'varchar'`**
```typescript
// inventory-record.entity.ts
@Column({ type: 'varchar', length: 20, default: 'active' })
status: 'active' | 'sold_out' | 'expired' | 'closed';
```

**P0-3: Corregir tipos TypeScript en `WeeklyReport` entity de `string` a `number`**
```typescript
totalInvestment: number;
totalRevenue: number;
totalProfit: number;
avgProfitMargin: number;
lossPercentage: number;
```

---

### P1 — Correcciones que afectan la lógica de negocio central

**P1-1: Completar `closeDay()` para registrar `waste_reason` y calcular `waste_cost`**

El DTO `CloseDay` debe recibir `waste_reason` por producto. En `closeDay()`:
```typescript
detail.wasteReason = item.wasteReason ?? null;  // Recibir del DTO
detail.wasteCost = Number(detail.unitCost) * item.waste;  // Calcular aquí
```
Sin esto, el objetivo de reducción de merma del 15-20% es **imposible de medir**.

**P1-2: Persistir `break_even_units` al cerrar el día**

Al final de `closeDay()`, calcular y guardar:
```typescript
const avgSalePrice = totalRevenue > 0 ? totalRevenue / unitsSold : 0;
const avgUnitCost = Number(dailySale.totalInvestment) / (unitsSold + unitsLost || 1);
const margin = avgSalePrice - avgUnitCost;
if (margin > 0) {
  dailySale.breakEvenUnits = Number(dailySale.totalInvestment) / margin;
}
```

**P1-3: Agregar `total_waste_cost` al reporte semanal**

En `generateWeeklyReport()`, agregar al CTE:
```sql
COALESCE(SUM(ds.total_waste_cost), 0)::numeric(10,2) AS total_waste_cost
```
Y el campo correspondiente en el `INSERT` y `DO UPDATE`.

---

### P2 — Relaciones y modelos faltantes

**P2-1: Crear `Category` entity y completar la relación en `Product`**

```typescript
// backend/src/modules/products/entities/category.entity.ts
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 100, unique: true }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ type: 'varchar', length: 50, nullable: true }) icon: string | null;
  @Column({ type: 'boolean', default: true, name: 'is_active' }) isActive: boolean;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' }) createdAt: Date;
}

// En product.entity.ts, agregar:
@Column({ type: 'uuid', nullable: true, name: 'category_id' })
categoryId: string | null;

@ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
@JoinColumn({ name: 'category_id' })
category: Category | null;
```

**P2-2: Crear tabla `daily_inventory_snapshots` (V012)**

Para poder medir la tendencia de merma diaria por SKU sin depender de datos mutables:
```sql
CREATE TABLE daily_inventory_snapshots (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_stock    INT NOT NULL,
  units_sold       INT NOT NULL DEFAULT 0,
  units_wasted     INT NOT NULL DEFAULT 0,
  closing_stock    INT NOT NULL DEFAULT 0,
  waste_value      NUMERIC(10,2) NOT NULL DEFAULT 0,
  waste_pct        NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN opening_stock > 0
         THEN (units_wasted::NUMERIC / opening_stock) * 100
         ELSE 0 END
  ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seller_id, product_id, snapshot_date)
);
```

---

### P3 — Rendimiento

**P3-1: Refactorizar `closeDay()` con `QueryRunner` y bulk operations**

Cargar todos los `InventoryRecord` activos para el vendedor en **una sola query** antes del bucle, operar en memoria y hacer un `save` masivo al final.

**P3-2: Agregar índice funcional para `EXTRACT(DOW FROM sale_date)`**

```sql
-- V013 o agregado a V012
CREATE INDEX IF NOT EXISTS idx_daily_sales_seller_dow
  ON daily_sales (seller_id, (EXTRACT(DOW FROM sale_date)::int));
```

**P3-3: Eliminar el doble-write en `recalculateHeader()`**

Reemplazar:
```typescript
await this.dailySaleRepository.save(sale);
await this.dailySaleRepository.update(sale.id, { ... }); // redundante
```
Por:
```typescript
await this.dailySaleRepository.update(sale.id, {
  totalRevenue: sale.totalRevenue,
  unitsSold: sale.unitsSold,
  unitsLost: sale.unitsLost,
  totalWasteCost: sale.totalWasteCost,
  profitMargin: sale.profitMargin,
});
```

**P3-4: Corregir `LIMIT 100` en `getPrediction()` a LIMIT por producto**

```sql
-- Usar LIMIT por producto con LATERAL o subquery, no un LIMIT global
SELECT DISTINCT ON (sd.product_id) sd.product_id, ...
FROM sale_details sd
...
ORDER BY sd.product_id, sd.quantity_sold DESC
```

---

### Tabla de Priorización Final

| ID | Descripción | Prioridad | Tipo | Esfuerzo |
|----|-------------|-----------|------|----------|
| P0-1 | `enumName: 'waste_reason_type'` en SaleDetail | 🔴 P0 | Bug | 5 min |
| P0-2 | `status` de enum a varchar en InventoryRecord | 🔴 P0 | Bug | 5 min |
| P0-3 | Tipos `string` → `number` en WeeklyReport entity | 🔴 P0 | Bug | 10 min |
| P1-1 | `closeDay()`: registrar `waste_reason` y calcular `waste_cost` | 🔴 P1 | Funcional | 2h |
| P1-2 | Persistir `break_even_units` al cierre de día | 🟡 P1 | Funcional | 1h |
| P1-3 | Agregar `total_waste_cost` al reporte semanal | 🟡 P1 | Funcional | 30min |
| P2-1 | Crear `Category` entity + relación en `Product` | 🟡 P2 | Modelo | 2h |
| P2-2 | Migración V012: `daily_inventory_snapshots` | 🟡 P2 | Modelo | 3h |
| P3-1 | Refactorizar `closeDay()` con bulk operations | 🟢 P3 | Rendimiento | 2h |
| P3-2 | Índice funcional `EXTRACT(DOW FROM sale_date)` | 🟢 P3 | Rendimiento | 10min |
| P3-3 | Eliminar doble-write en `recalculateHeader()` | 🟢 P3 | Rendimiento | 20min |
| P3-4 | Fix `LIMIT 100` global en predicción IQR | 🟢 P3 | Rendimiento | 1h |
