const BASE_URL = 'http://localhost:3001/api';
const CREDENTIALS = {
    email: 'master@tienditacampus.com',
    password: 'JarasMaster2024!'
};

async function simulate() {
    console.log('🚀 Iniciando Simulación de Negocio...');

    try {
        // 1. Auth: Login
        console.log('🔐 [Auth] Intentando login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(CREDENTIALS)
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Login fallido: ${JSON.stringify(loginData)}`);
        const token = loginData.accessToken;
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        console.log('✅ Login exitoso.');

        // 2. Products: Crear producto de prueba
        console.log('📦 [Products] Creando producto de prueba...');
        const productRes = await fetch(`${BASE_URL}/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                sku: `TEST-${Date.now()}`,
                name: 'Producto de Prueba Simulación',
                description: 'Validando flujo integral',
                basePrice: 100,
                category: 'Snacks',
                minStock: 5,
                unitType: 'piece'
            })
        });
        const productData = await productRes.json();
        if (!productRes.ok) throw new Error(`Error creando producto: ${JSON.stringify(productData)}`);
        const productId = productData.id;
        console.log(`✅ Producto creado ID: ${productId}`);

        // 3. Inventory: Cargar Stock
        console.log('📥 [Inventory] Cargando stock...');
        const stockRes = await fetch(`${BASE_URL}/inventory/adjust`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                productId,
                quantity: 50,
                type: 'adjustment',
                reason: 'Carga inicial simulación',
                unitCost: 70
            })
        });
        if (!stockRes.ok) throw new Error('Error ajustando stock');
        console.log('✅ Stock cargado (50 unidades).');

        // 4. Sales: Abrir día / Preparar
        console.log('🛒 [Sales] Abriendo día de venta...');
        const prepareRes = await fetch(`${BASE_URL}/sales/prepare`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                products: [{ productId, quantity: 20 }]
            })
        });
        if (!prepareRes.ok) {
            const err = await prepareRes.json();
            if (err.message.includes('ya existe')) {
                console.log('⚠️ Día ya abierto, continuando...');
            } else {
                throw new Error(`Error preparando día: ${JSON.stringify(err)}`);
            }
        } else {
            console.log('✅ Día de venta abierto.');
        }

        // 5. Sales: Registrar Venta (Cerrando día con mermas)
        console.log('🏁 [Sales] Cerrando día con mermas...');
        const closeRes = await fetch(`${BASE_URL}/sales/close`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                wastes: [{ productId, waste: 2, wasteReason: 'damaged' }]
            })
        });
        if (!closeRes.ok) throw new Error(`Error cerrando día: ${JSON.stringify(await closeRes.json())}`);
        console.log('✅ Día cerrado exitosamente.');

        // 6. Reports: Generar reporte semanal
        console.log('📊 [Reports] Generando reporte semanal...');
        const reportRes = await fetch(`${BASE_URL}/reports/weekly/generate`, {
            method: 'POST',
            headers
        });
        const reportData = await reportRes.json();
        if (!reportRes.ok) throw new Error(`Error generando reporte: ${JSON.stringify(reportData)}`);
        console.log('✅ Reporte generado correctamente.');

        // 7. Audit: Verificar Logs
        console.log('🕵️ [Audit] Verificando logs recientes...');
        const auditRes = await fetch(`${BASE_URL}/audit/recent?limit=5`, { headers });
        const auditData = await auditRes.json();
        console.log('Logs encontrados:', auditData.map(l => l.action));

        console.log('\n✨ SIMULACIÓN COMPLETADA CON ÉXITO ✨');

    } catch (error) {
        console.error('\n❌ ERROR EN SIMULACIÓN:', error);
        process.exit(1);
    }
}

simulate();
