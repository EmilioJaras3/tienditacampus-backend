import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Category } from '../src/modules/products/entities/category.entity';
import { DailySale } from '../src/modules/sales/entities/daily-sale.entity';
import { SaleDetail } from '../src/modules/sales/entities/sale-detail.entity';
import * as argon2 from '@node-rs/argon2';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Definición de tipos para los filtros
interface UserWithRole extends User {
    role: 'admin' | 'seller' | 'buyer';
}

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'tienditacampus',
    entities: [User, Product, Category, DailySale, SaleDetail],
    synchronize: false,
    logging: false,
});

async function run() {
    console.log('🚀 Iniciando Data Factory - Generador de Historial (SOA Benchmarking)...');
    
    try {
        await AppDataSource.initialize();
        console.log('✅ Conexión establecida con PostgreSQL');

        const userRepo = AppDataSource.getRepository(User);
        const categoryRepo = AppDataSource.getRepository(Category);
        const productRepo = AppDataSource.getRepository(Product);
        const saleRepo = AppDataSource.getRepository(DailySale);
        const detailRepo = AppDataSource.getRepository(SaleDetail);

        // 1. Crear Categorías base
        const categoryNames = ['Snacks', 'Bebidas', 'Dulces', 'Papelería', 'Electrónicos'];
        const categories = [];
        for (const name of categoryNames) {
            let cat = await categoryRepo.findOneBy({ name });
            if (!cat) {
                cat = categoryRepo.create({ name, description: `Categoría de ${name}` });
                await categoryRepo.save(cat);
            }
            categories.push(cat);
        }
        console.log(`✅ ${categories.length} categorías listas.`);

        // 2. Crear 30 Usuarios (15 Sellers, 15 Buyers)
        const totalUsers = await userRepo.count();
        const usersToCreate = 30 - totalUsers;
        const allUsers = await userRepo.find();
        
        if (usersToCreate > 0) {
            console.log(`👤 Creando ${usersToCreate} usuarios para completar el límite de 30...`);
            const pwdHash = await argon2.hash('Test1234');
            const campusLocs = ['Campus Norte', 'Campus Sur', 'Biblioteca Central', 'Facultad Ingenieria'];
            const majors = ['Ingeniería', 'Derecho', 'Medicina', 'Arquitectura', 'Diseño'];

            for (let i = 0; i < usersToCreate; i++) {
                const role = i < (usersToCreate / 2) ? 'seller' : 'buyer';
                const user = userRepo.create({
                    email: `estudiante${allUsers.length + i}@campus.edu.mx`,
                    passwordHash: pwdHash,
                    firstName: `Usuario${allUsers.length + i}`,
                    lastName: `Test`,
                    role,
                    campusLocation: campusLocs[i % campusLocs.length],
                    major: majors[i % majors.length],
                    isActive: true,
                    isEmailVerified: true
                });
                await userRepo.save(user);
                allUsers.push(user);
            }
        }
        
        const sellers = allUsers.filter((u: User) => u.role === 'seller');
        const buyers = allUsers.filter((u: User) => u.role === 'buyer');
        console.log(`✅ Contabilidad final: ${allUsers.length} usuarios (${sellers.length} vendedores, ${buyers.length} compradores).`);

        // 3. Crear Productos por Vendedor
        console.log('📦 Asegurando catálogo de productos...');
        const products = await productRepo.find();
        if (products.length < (sellers.length * 2)) {
            for (const seller of sellers) {
                const existing = products.filter((p: Product) => p.sellerId === seller.id);
                if (existing.length < 2) {
                    const prod1 = productRepo.create({
                        name: `Producto de ${seller.firstName}`,
                        description: 'Generado automáticamente para historial',
                        unitCost: 10 + Math.random() * 20,
                        salePrice: 40 + Math.random() * 60,
                        seller: seller,
                        categoryId: categories[Math.floor(Math.random() * categories.length)].id,
                        isActive: true
                    });
                    await productRepo.save(prod1);
                    products.push(prod1);
                }
            }
        }
        console.log(`✅ Catálogo de ${products.length} productos listo.`);

        // 4. Generar Historial de 30 días (Irregular y Gradual)
        console.log('📈 Generando historial de 30 días con curva de crecimiento...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        for (let i = 0; i <= 30; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(currentDay.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];

            // Curva de crecimiento: El volumen de actividad sube con los días
            // i=0 -> 10% actividad, i=30 -> 100% actividad
            const growthFactor = 0.1 + (i / 30) * 0.9;
            const dayOfWeek = currentDay.getDay(); // 0-6 (Sun-Sat)
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            // Factor caos: variabilidad aleatoria
            const chaosFactor = 0.7 + Math.random() * 0.6; // entre 0.7 y 1.3
            const activityLevel = growthFactor * chaosFactor * (isWeekend ? 0.3 : 1.0);

            // Seleccionar 1-5 vendedores activos este día
            const numActiveSellers = Math.max(1, Math.floor(activityLevel * 5));
            const activeSellersToday = [...sellers].sort(() => 0.5 - Math.random()).slice(0, numActiveSellers);

            for (const seller of activeSellersToday) {
                // Verificar si ya existe registro para este día/vendedor
                let dailySale = await saleRepo.findOneBy({ sellerId: seller.id, saleDate: dateStr });
                if (dailySale) continue;

                // Crear Venta Diaria
                dailySale = saleRepo.create({
                    sellerId: seller.id,
                    saleDate: dateStr,
                    totalInvestment: 0,
                    totalRevenue: 0,
                    unitsSold: 0,
                    unitsLost: 0,
                    isClosed: true,
                    notes: `Sincronización histórica automática (Día ${i}, AF: ${activityLevel.toFixed(2)})`
                });
                await saleRepo.save(dailySale);

                const sellerProds = products.filter((p: Product) => p.sellerId === seller.id);
                let dayInv = 0;
                let dayRev = 0;
                let daySold = 0;

                for (const prod of sellerProds) {
                    const qPrepared = Math.floor(activityLevel * (20 + Math.random() * 30)) + 5;
                    const qSold = Math.floor(qPrepared * (0.6 + Math.random() * 0.4));
                    const qLost = Math.max(0, qPrepared - qSold - Math.floor(Math.random() * 5));

                    const detail = detailRepo.create({
                        dailySaleId: dailySale.id,
                        productId: prod.id,
                        unitCost: parseFloat(prod.unitCost.toString()),
                        unitPrice: parseFloat(prod.salePrice.toString()),
                        quantityPrepared: qPrepared,
                        quantitySold: qSold,
                        quantityLost: qLost,
                        wasteCost: qLost * parseFloat(prod.unitCost.toString())
                    });
                    
                    await detailRepo.save(detail);
                    dayInv += qPrepared * parseFloat(prod.unitCost.toString());
                    dayRev += qSold * parseFloat(prod.salePrice.toString());
                    daySold += qSold;
                }

                dailySale.totalInvestment = dayInv;
                dailySale.totalRevenue = dayRev;
                dailySale.unitsSold = daySold;
                await saleRepo.save(dailySale);
            }
            
            if (i % 5 === 0) console.log(`... procesando día ${i}/30 (${dateStr})`);
        }

        console.log('✅ Historial de PostgreSQL poblado exitosamente.');
        
        // 5. Preparar BigQuery Snapshot (Opcional: Si el usuario quiere enviarlo ahora)
        console.log('\n💡 Tip: Ahora puedes ir a la app y ejecutar la exportación a BigQuery.');
        console.log('Los datos de los últimos 30 días aparecerán en tus gráficas de Venta Diaria.');

        await AppDataSource.destroy();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error fatal en Data Factory:', error);
        process.exit(1);
    }
}

run();
