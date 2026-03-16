# Auditoría de Mismatch ORM-BD: `users` Table

Este documento documenta las colisiones (Impedance Mismatch) entre el modelo puramente de SQL (`V001__create_users_table.sql` y `V010__fix_users_campus_location_column.sql`) y la definición de la entidad TypeORM (`user.entity.ts`).

## 1. Resumen de Colisiones (Discrepancias)

| Columna / Elemento | En SQL (PostgreSQL) | En TypeORM (`user.entity.ts`) | Estado de la Colisión |
| :--- | :--- | :--- | :--- |
| `id` | `UUID DEFAULT uuid_generate_v4()` | `@PrimaryGeneratedColumn('uuid')` | **Leve:** TypeORM intentará instalar la extensión `uuid-ossp` internamente si se sincroniza, pero esto puede generar choques si se cambian los drivers o ya existe. |
| `role` | `user_role` (ENUM Nativo Postgres) | `enum: ['admin', 'seller', 'buyer']` | **Crítica:** TypeORM en postgres intentará crear el custom enum si pones `synchronize: true` y chocará violentamente si ya existe por la migración V001. |
| `major` | `No existe en V001.sql` | `@Column({ type: 'varchar', length: 150, nullable: true })` | **Alta:** TypeORM tiene declarada la columna `major` pero en la tabla SQL original del V001 NO existe. Si usas sync, la creará de golpe. |
| `campus_location` | Agregada en V010 (`campus_location`) | `@Column(...)` | **Media:** TypeORM la tiene, asegúrate de correr V010 antes, porque si no TypeORM la agregará sola. |
| `updated_at` | `DEFAULT NOW()` + **Trigger** | `@UpdateDateColumn()` | **Crítica:** TypeORM maneja `updatedAt` actualizando el campo desde Node.js en cada `repository.save()`. Como Postgres ya tiene un Trigger que intercepta `BEFORE UPDATE`, ambos sistemas competirán. Si TypeORM manda la hora del servidor (NODE_ENV) y Postgres manda la suya, las milésimas causarán discrepancias en los soft-locks. |

---

## 2. Puntos Críticos Analizados

¿Qué pasa si alguien corre `synchronize: true` por accidente?

1.  **Tipo ENUM `user_role`**: TypeORM ejecuta un script similar a `CREATE TYPE "users_role_enum" AS ENUM...`. Esto fallará porque tu script de SQL ya creó un tipo nativo de nombre estricto `user_role`. TypeORM perderá el control del ENUM o crasheará quejándose de que no puede hacer un cast de `"users_role_enum"` a `user_role`.
2.  **Trigger de `updated_at`**: `synchronize: true` ignorará la existencia de tu trigger. Sin embargo, en runtime, cuando TypeORM haga un `UPDATE users SET ..., updated_at = $X WHERE id = $Y`, Postgres tomará ese comando, ignorará el `$X` de TypeORM por culpa del Trigger `BEFORE UPDATE`, y sobreescribirá silenciosamente el dato. Esto causará que TypeORM obtenga objetos cacheados y la entidad devuelta no coincida con el timestamp real guardado en BD.
3.  **Generación del UUID**: Postgres genera esto por defecto a través de `uuid_generate_v4()`. TypeORM lo delega también a Postgres con `@PrimaryGeneratedColumn('uuid')`, pero algunos drivers de TypeORM intentan crear UUIDs **del lado de Node** antes de insertar. Esto anula tu `DEFAULT uuid_generate_v4()` a nivel de base de datos.

---

## 3. Estrategia de Unificación

Para que TypeORM respete tu arquitectura de "*La Base de Datos manda*" (Solo lectura/escritura sin alterar squema), debes decorar las zonas de riesgo con propiedades de solo lectura/inserción de TypeORM, prohibiéndole sincronizar o interferir.

Realiza los siguientes cambios obligatorios en `user.entity.ts`:

### A. Para el campo `id` y UUID de lado de Postgres:
Usa `@Generated` para forzar a TypeORM a leer la generación de PG y desactivar la creación manual desde el ORM si la hubiera.
```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
// Cambiar a:
@PrimaryColumn('uuid')
@Generated('uuid')
id: string;
```

### B. Para el ENUM nativo (`role`):
Debes decirle a TypeORM que **no trate de parsear ni crear el enum estricto de string**, sino un tipo estático que delegue todo al enum custom preexistente en PostgreSQL.
```typescript
@Column({
    type: 'enum',
    enumName: 'user_role', // OBLIGATORIO: decirle a TypeORM el nombre real de PG
    enum: ['admin', 'seller', 'buyer'],
    default: 'seller',
})
role: 'admin' | 'seller' | 'buyer';
```

### C. Para el campo delegado por Triggers (`updated_at`):
Dado que PostgreSQL ya actualizará esto gracias a la migración de la DB, debes decirle a TypeORM: *"Ey, no trates de settear esto tú en los UPDATE, solo léelo después de guardar"*.
```typescript
@UpdateDateColumn({ 
    type: 'timestamptz', 
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)'
})
updatedAt: Date;

// SOLUCIÓN ESTRICTA SOA:
@Column({ 
    type: 'timestamptz', 
    name: 'updated_at',
    default: () => 'NOW()',
    insert: false,
    update: false // ¡CLAVE! Prohíbe a TypeORM pisar el trigger de postgres
})
updatedAt: Date;
```

### D. La Medida de Defensa Final (`synchronize: false` por Entidad)
Si TypeORM globalmente tuviese `synchronize: true` por accidente, puedes **inmunizar esta tabla** añadiendo un parámetro al decorador principal de clase:

```typescript
@Entity('users', { synchronize: false }) // Desactiva la mutación de esquemas SOLO para esta tabla
export class User {
```
