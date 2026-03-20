const argon2 = require('@node-rs/argon2');
const { Pool } = require('pg');

async function testLogin() {
    const pool = new Pool({
        user: 'tc_admin',
        host: 'database',
        database: 'tienditacampus',
        password: 'tc_secure_pass_2026',
        port: 5432,
    });

    try {
        const res = await pool.query("SELECT email, password_hash FROM users WHERE email = 'isaac@gmail.com'");
        if (res.rows.length === 0) {
            console.log("Usuario no encontrado.");
            return;
        }

        const hashFromDb = res.rows[0].password_hash;
        console.log("DB HASH:", hashFromDb);
        const inputPassword = 'IsaacMD78';

        try {
            const isValid = await argon2.verify(hashFromDb, inputPassword);
            console.log("ES VALIDO?", isValid);
        } catch (e) {
            console.error("ERROR AL VERIFICAR:", e.message);
        }
    } finally {
        await pool.end();
    }
}

testLogin();
