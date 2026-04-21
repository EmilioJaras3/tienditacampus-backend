# RESUMEN_CAMBIOS_ISAAC

## Cambios realizados por Isaac

A continuación se enlistan todas las modificaciones y correcciones implementadas exhaustivamente durante esta fase de integración y estabilización:

### Backend
- **`src/modules/auth/auth.service.ts`**:
  - Modificación del método `login()` para retornar obligatoriamente `{ requiresTwoFactor: true }` deteniendo la entrega del JSON Web Token inmediatamente.
  - Implementación formal de `MailerService` que extirpa el antiguo sistema de `console.log()` local, forzando a que el código OTP 2FA de 6 dígitos se mande vía protocolo SMTP hacia el correo electrónico del usuario.
  - Adaptación de la rutina de `verify2FA()` y `resend2fa()` usando el nuevo conector.
- **`src/modules/auth/auth.module.ts`**:
  - Inclusión de `TwoFactorModule` a los `imports` primarios, conectando el Módulo de Correo para su correcto proceso de inyección de dependencias y evitar un Error Cero en runtime.
- **`.env`**:
  - Corrección de formato y escritura de las credenciales de Servidor SMTP reales asociadas a Gmail (`SMTP_USER`, `SMTP_PASS`, `SMTP_HOST`, `SMTP_PORT`).

### Frontend
- **`src/services/auth.service.ts`**:
  - Actualización de la Definición de Tipos (`AuthResponse`), convirtiendo los atributos principales en Opcionales para no crear falsos positivos.
  - Adición obligatoria de la nueva función transaccional `verify2FA()`.
- **`src/app/(auth)/login/page.tsx`**:
  - Desarrollo del Flujo Condicional en la Interfaz de Usuario: Si la validación de servidor responde pidiendo 2FA, el Card frontal muta ocultando Email/Clave e impulsando la solicitud emergente de un input centrado con espaciamiento de 6 dígitos (OTP), logrando un control dinámico sin desviar el ruteo de Next.js.
- **`next.config.mjs`**:
  - Resolución del Error 500 fatal originado por `tc-backend` al apuntar de nuevo a `localhost:3001` logrando interceptar limpiamente y sin dependencias cruzadas Docker.
- **Docker/Configuraciones (`package.json`, `docker-compose.yml`)**:
  - Forzamiento estricto al Puerto `3000` en lugar de `8080/9090` erróneos causados por los *Merge Conflicts*.

### Colección Postman
- **Endpoints Actualizados y Corregidos**: Se modificaron profundamente **todos** los DTOs para que sean perfectos con respecto a las reglas más recientes de validación estricta de NestJS.
  - *Productos*: Se agregó `categoryId` y `salePrice`.
  - *Inventario/Ventas*: Variables dependientes `productId` (UUID) arregladas; `quantityLost` validado.
  - *Ventas al corte*: Se usa obligatoriamente formato Array `{"items": []}`.
  - *Órdenes*: Eliminación de propiedades muertas (`notes` / `scheduledPickupTime`).
- **Datos de prueba y Pruebas embebidas**:
  - Se vinculó en `/auth/register` el email `postman_tester@upchiapas.edu.mx` como cuenta de comprobación predeterminada.
  - La verificación 2FA lee de un `{{code}}`.
  - Se añadieron o refinaron **scripts automatizados** de pre/pos-petición en formato Javascript que extraen automáticamente UUIDs como `{{category_id}}`, `{{product_id}}` y `{{token}}` al Entorno general (Environment) sin copia-pega manual.

### Cómo probar todo

#### 1. Levantamiento del Proyecto
Asegúrese primero de limpiar cachés viejos y ejecutar estos comandos usando 3 consolas separadas:
*Terminal 1 (Base de Datos):*
```powershell
cd C:\Users\isaac\PI\bd\tienditacampus-database
docker-compose up -d
```
*Terminal 2 (Backend en Local - Puerto 3001):*
```powershell
cd C:\Users\isaac\PI\back\tienditacampus-backend
npm run start:dev
```
*Terminal 3 (Frontend en Local - Puerto 3000):*
```powershell
cd C:\Users\isaac\PI\front\tienditacampus-frontend
npm run dev
```

#### 2. Orden correcto de pruebas en Postman
1. Selecciona el Environment "TienditaCampus - Local".
2. Ejecuta el endpoint manual **POST `/auth/register`** y **POST `/auth/login`**.
3. Revisa tu buzón de correo, intercepta el PIN de 6 dígitos que se envió por SMTP.
4. Asígnalo a tu variable postman en la colección o digítalo manualmente en **POST `/auth/verify-2fa`** usando `"code": "TU_NUEVO_CODIGO"`.
   *(Esto prenderá la magia de Postman dándole Check Verde al token automágico).*
5. Selecciona la carpeta TienditaCampus completa, da clic secundario -> **"Run Collection"** y asómbrate con un desfile de *200 OK* continuos!

#### 3. Pruebas End-to-End con Selenium
Asegúrate de que Next.js y NestJS de tu ambiente local de desarrollo están activos. Desde la terminal en tu disco:
```powershell
cd C:\Users\isaac\PI\selenium_tests
python -m pytest test_auth.py -v
```
*(Puedes sustituir `test_auth.py` o correr simple `pytest` para invocar todos los scripts, y las métricas arrojadas confirmarán la resistencia de botones sin `click-intercepted`!)*