import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Product } from '../src/modules/products/entities/product.entity';
import { Category } from '../src/modules/products/entities/category.entity';
import { DailySale } from '../src/modules/sales/entities/daily-sale.entity';
import { SaleDetail } from '../src/modules/sales/entities/sale-detail.entity';
import { Order } from '../src/modules/orders/entities/order.entity';
import { OrderItem } from '../src/modules/orders/entities/order-item.entity';
import * as argon2 from '@node-rs/argon2';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'tienditacampus',
    entities: [User, Product, Category, DailySale, SaleDetail, Order, OrderItem],
    synchronize: false,
    logging: false,
});

async function run() {
    console.log('🚀 Iniciando Data Factory V4 - "Crecimiento y Pausa Histórica"...');
    
    try {
        await AppDataSource.initialize();
        console.log('✅ Conexión establecida con PostgreSQL');

        const userRepo = AppDataSource.getRepository(User);
        const categoryRepo = AppDataSource.getRepository(Category);
        const productRepo = AppDataSource.getRepository(Product);
        const saleRepo = AppDataSource.getRepository(DailySale);
        const detailRepo = AppDataSource.getRepository(SaleDetail);
        const orderRepo = AppDataSource.getRepository(Order);
        const itemRepo = AppDataSource.getRepository(OrderItem);

        // 0. LIMPIEZA TOTAL
        console.log('🧹 Limpiando base de datos...');
        await AppDataSource.query('TRUNCATE order_items, orders, sale_details, daily_sales, products, users, categories CASCADE');

        // 1. Categorías
        const categoryNames = ['Comida Preparada', 'Bebidas', 'Snacks', 'Papelería'];
        const categoriesMap: Record<string, Category> = {};
        for (const name of categoryNames) {
            const cat = categoryRepo.create({ name, description: `Categoría de ${name}` });
            await categoryRepo.save(cat);
            categoriesMap[name] = cat;
        }

        // 2. Definir los 4 Vendedores Reales
        const realSellers = [
            { email: 'antonio.hoyos@uabc.edu.mx', first: 'Antonio', last: 'de Hoyos', product: 'Torta de Jamón Especial', cat: 'Comida Preparada', cost: 25, price: 55 },
            { email: 'tono.picafresas@uabc.edu.mx', first: 'Toño', last: 'Picafresas', product: 'Bolsa de Picafresas (10pz)', cat: 'Snacks', cost: 8, price: 20 },
            { email: 'nadia.brownies@uabc.edu.mx', first: 'Nadia', last: 'Brownies', product: 'Brownie de Chocolate Casero', cat: 'Comida Preparada', cost: 12, price: 35 },
            { email: 'diego.chicles@uabc.edu.mx', first: 'Diego', last: 'Chicles', product: 'Paquete Chicles Clorets', cat: 'Snacks', cost: 5, price: 15 }
        ];

        const pwdHash = await argon2.hash('Password123!');
        const sellers = [];
        for (const s of realSellers) {
            const user = userRepo.create({
                email: s.email, passwordHash: pwdHash, firstName: s.first, lastName: s.last,
                role: 'seller', isActive: true, isEmailVerified: true, campusLocation: 'Campus Norte', major: 'Ingeniería'
            });
            await userRepo.save(user);
            sellers.push({ ...user, meta: s });
        }

        // 3. Crear 11 Compradores Alumnos
        const buyers = [];
        const studentNames = ['Mateo', 'Sofia', 'Sebastian', 'Valentina', 'Santiago', 'Isabella', 'Leonardo', 'Camila', 'Emiliano', 'Jimena', 'Julian'];
        for (let i = 0; i < 11; i++) {
            const user = userRepo.create({
                email: `alumno${i+1}@uabc.edu.mx`, passwordHash: pwdHash, firstName: studentNames[i], lastName: `Suárez`,
                role: 'buyer', campusLocation: 'Campus Sur', major: 'Derecho', isActive: true, isEmailVerified: true
            });
            await userRepo.save(user);
            buyers.push(user);
        }

        // 4. Productos
        const productsDB = [];
        for (const s of sellers) {
            const p = productRepo.create({
                name: s.meta.product, description: `Producto estrella de ${s.firstName}`,
                unitCost: s.meta.cost, salePrice: s.meta.price, sellerId: s.id,
                categoryId: categoriesMap[s.meta.cat].id, isActive: true,
                imageUrl: s.meta.cat === 'Snacks' ? 'https://images.unsplash.com/photo-1599490659223-930b447ff764' : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'
            });
            await productRepo.save(p);
            productsDB.push(p);
        }

        // 5. Historial de 60 días con CRECIMIENTO y PAUSA
        console.log('📅 Generando 60 días de historial (46 días de actividad + 14 días de pausa)...');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 60);

        for (let d = 0; d <= 60; d++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(currentDay.getDate() + d);
            const dateStr = currentDay.toISOString().split('T')[0];

            // PAUSA: De hace 14 días hasta hoy, no hay actividad
            const isPaused = d > 46; 

            for (const seller of sellers) {
                const prod = productsDB.find(p => p.sellerId === seller.id);
                if (!prod) continue;

                const daily = saleRepo.create({
                    sellerId: seller.id, saleDate: dateStr, totalInvestment: 0, totalRevenue: 0,
                    unitsSold: 0, unitsLost: 0, isClosed: true, createdAt: currentDay
                });
                await saleRepo.save(daily);

                if (isPaused) continue; // Saltamos la generación de transacciones si estamos en pausa

                // CRECIMIENTO GRADUAL: Aumenta el volumen de ventas según el día d
                // Día 0: 1-2 transacciones. Día 46: 3-8 transacciones.
                const growthFactor = (d / 46); 
                const maxTx = Math.floor(growthFactor * 5) + 2;
                const dailyTransactions = Math.floor(Math.random() * maxTx) + 1;

                for (let t = 0; t < dailyTransactions; t++) {
                    const buyer = buyers[Math.floor(Math.random() * buyers.length)];
                    const qty = Math.floor(Math.random() * 2) + 1;

                    const order = orderRepo.create({
                        buyerId: buyer.id, sellerId: seller.id, totalAmount: qty * Number(prod.salePrice),
                        status: 'completed', createdAt: currentDay
                    });
                    await orderRepo.save(order);

                    const orderItem = itemRepo.create({
                        orderId: order.id, productId: prod.id, quantity: qty,
                        unitPrice: Number(prod.salePrice), subtotal: qty * Number(prod.salePrice), createdAt: currentDay
                    });
                    await itemRepo.save(orderItem);

                    const wasteProb = seller.meta.cat === 'Comida Preparada' ? 0.20 : 0.05;
                    const lostQty = Math.random() < wasteProb ? 1 : 0;

                    const sDetail = detailRepo.create({
                        dailySaleId: daily.id, productId: prod.id, unitCost: Number(prod.unitCost),
                        unitPrice: Number(prod.salePrice), quantityPrepared: qty + lostQty,
                        quantitySold: qty, quantityLost: lostQty, wasteCost: lostQty * Number(prod.unitCost), createdAt: currentDay
                    });
                    await detailRepo.save(sDetail);

                    daily.unitsSold += qty;
                    daily.unitsLost += lostQty;
                    daily.totalRevenue += orderItem.subtotal;
                    daily.totalInvestment += (qty + lostQty) * Number(prod.unitCost);
                }
                await saleRepo.save(daily);
            }
        }

        console.log('✅ Simulación completada: 60 días generados con éxito.');
        await AppDataSource.destroy();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal:', err);
        process.exit(1);
    }
}

run();
