const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

async function rescueAccount() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'tienditacampus_user',
        password: 'tienditacampus_pass123',
        database: 'tienditacampus',
    });

    try {
        await client.connect();
        console.log('✅ Conectado a la base de datos');

        const email = process.env.DEFAULT_ADMIN_EMAIL || 'jarassanchezl@gmail.com';
        
        console.log(`Desbloqueando cuenta: ${email}...`);
        
        const res = await client.query(
            `UPDATE users 
             SET failed_login_attempts = 0, 
                 is_email_verified = true, 
                 locked_until = NULL,
                 is_active = true
             WHERE email = $1`,
            [email]
        );

        if (res.rowCount > 0) {
            console.log(`✅ Cuenta ${email} desbloqueada y verificada exitosamente.`);
        } else {
            console.log(`❌ No se encontró el usuario ${email}.`);
        }

    } catch (err) {
        console.error('❌ Error ejecutando rescate DB:', err);
    } finally {
        await client.end();
    }
}

rescueAccount();
