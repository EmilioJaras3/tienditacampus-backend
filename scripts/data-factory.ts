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
import { v4 as uuidv4 } from 'uuid';

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
    console.log('🚀 Iniciando Data Factory V2 - Generador de Historial y Alumnos...');
    
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

        // 1. Asegurar Categorías
        const categoryNames = ['Comida Preparada', 'Bebidas', 'Snacks', 'Papelería'];
        const categories = [];
        for (const name of categoryNames) {
            let cat = await categoryRepo.findOneBy({ name });
            if (!cat) {
                cat = categoryRepo.create({ name, description: `Categoría de ${name}` });
                await categoryRepo.save(cat);
            }
            categories.push(cat);
        }

        // 2. Usuarios Base (Los 5 originales) - Asegurar que no se toquen si ya existen
        const baseSellers = [
            { email: 'anagarpep14@gmail.com', first: 'Ana', last: 'Garcia' },
            { email: 'diegoramiraasa2@gmail.com', first: 'Diego', last: 'Ramirez' },
            { email: 'elenaaaszgomezr@gmail.com', first: 'Elena', last: 'Gomez' },
            { email: 'carlospereeezagui23@gmail.com', first: 'Carlos', last: 'Perez' },
            { email: 'sofialaaaaaar2535@gmail.com', first: 'Sofia', last: 'Lara' }
        ];

        const pwdHash = await argon2.hash('Password123!');
        for (const s of baseSellers) {
            let user = await userRepo.findOneBy({ email: s.email });
            if (!user) {
                user = userRepo.create({
                    email: s.email,
                    passwordHash: pwdHash,
                    firstName: s.first,
                    lastName: s.last,
                    role: 'seller',
                    isActive: true,
                    isEmailVerified: true
                });
                await userRepo.save(user);
            }
        }

        // 3. Crear 25 Alumnos extra (Sellers/Buyers aleatorios)
        console.log('👤 Generando 25 alumnos adicionales...');
        const campusLocs = ['Campus Norte', 'Campus Sur', 'Biblioteca Central', 'Facultad Ingenieria'];
        const majors = ['Ingeniería', 'Derecho', 'Medicina', 'Arquitectura', 'Diseño'];
        
        const newUsers = [];
        for (let i = 1; i <= 25; i++) {
            const email = `alumno${i}@uabc.edu.mx`;
            let user = await userRepo.findOneBy({ email });
            if (!user) {
                const role = Math.random() > 0.4 ? 'buyer' : 'seller';
                user = userRepo.create({
                    email,
                    passwordHash: pwdHash,
                    firstName: `Alumno`,
                    lastName: `${i}`,
                    role,
                    campusLocation: campusLocs[i % campusLocs.length],
                    major: majors[i % majors.length],
                    isActive: true,
                    isEmailVerified: true
                });
                await userRepo.save(user);
            }
            newUsers.push(user);
        }

        // 4. Asegurar Productos para todos los Sellers
        const allSellers = await userRepo.findBy({ role: 'seller' });
        const allProducts = [];
        for (const seller of allSellers) {
            let prods = await productRepo.findBy({ sellerId: seller.id });
            if (prods.length === 0) {
                const p = productRepo.create({
                    name: `Producto de ${seller.firstName} ${seller.lastName}`,
                    description: 'Producto para simulación de transacciones',
                    unitCost: 15 + Math.random() * 20,
                    salePrice: 35 + Math.random() * 40,
                    sellerId: seller.id,
                    categoryId: categories[Math.floor(Math.random() * categories.length)].id,
                    isActive: true,
                    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'
                });
                await productRepo.save(p);
                prods = [p];
            }
            allProducts.push(...prods);
        }

        // 5. Generar Interacciones (Pedidos y Ventas) de hace 2 semanas
        console.log('📅 Generando interacciones históricas (2 semanas atrás)...');
        const allBuyers = await userRepo.findBy({ role: 'buyer' });
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);

        for (let i = 0; i < 14; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(currentDay.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];

            // Para cada vendedor, crear un cierre de caja (DailySale)
            for (const seller of allSellers) {
                let daily = await saleRepo.findOneBy({ sellerId: seller.id, saleDate: dateStr });
                if (!daily) {
                    daily = saleRepo.create({
                        sellerId: seller.id,
                        saleDate: dateStr,
                        totalInvestment: 0,
                        totalRevenue: 0,
                        unitsSold: 0,
                        unitsLost: 0,
                        isClosed: true,
                        createdAt: currentDay
                    });
                    await saleRepo.save(daily);
                }

                // Generar 1-3 pedidos de compradores reales
                const dayBuyers = allBuyers.sort(() => 0.5 - Math.random()).slice(0, 2);
                const sellerProds = allProducts.filter(p => p.sellerId === seller.id);

                for (const buyer of dayBuyers) {
                    if (sellerProds.length === 0) continue;
                    const prod = sellerProds[0];
                    const qty = Math.floor(Math.random() * 3) + 1;

                    // Crear Pedido
                    const order = orderRepo.create({
                        buyerId: buyer.id,
                        sellerId: seller.id,
                        totalAmount: qty * parseFloat(prod.salePrice.toString()),
                        status: 'completed',
                        createdAt: currentDay
                    });
                    await orderRepo.save(order);

                    const orderItem = itemRepo.create({
                        orderId: order.id,
                        productId: prod.id,
                        quantity: qty,
                        unitPrice: parseFloat(prod.salePrice.toString()),
                        subtotal: qty * parseFloat(prod.salePrice.toString()),
                        createdAt: currentDay
                    });
                    await itemRepo.save(orderItem);

                    // Actualizar DailySale
                    daily.unitsSold += qty;
                    daily.totalRevenue += orderItem.subtotal;
                    daily.totalInvestment += qty * parseFloat(prod.unitCost.toString());

                    // Registrar SaleDetail (Merma 0 para pedidos directos exitosos)
                    const sDetail = detailRepo.create({
                        dailySaleId: daily.id,
                        productId: prod.id,
                        unitCost: parseFloat(prod.unitCost.toString()),
                        unitPrice: parseFloat(prod.salePrice.toString()),
                        quantityPrepared: qty + 2,
                        quantitySold: qty,
                        quantityLost: 0,
                        wasteCost: 0,
                        createdAt: currentDay
                    });
                    await detailRepo.save(sDetail);
                }
                await saleRepo.save(daily);
            }
        }

        console.log('✅ Finalizado: Alumnos creados e interacciones sembradas.');
        await AppDataSource.destroy();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error fatal:', err);
        process.exit(1);
    }
}

run();
