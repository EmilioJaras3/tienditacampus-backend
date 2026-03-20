const argon2 = require('@node-rs/argon2');
const { Pool } = require('pg');

async function fix() {
    const password = 'test1234';
    const hash = await argon2.hash(password, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });

    console.log("New Hash for test1234:", hash);
    const isValid = await argon2.verify(hash, password);
    console.log("Verifies:", isValid);

    const pool = new Pool({
        user: 'tc_admin',
        host: 'database',
        database: 'tienditacampus',
        password: 'tc_secure_pass_2026',
        port: 5432,
    });

    try {
        const res = await pool.query(
            "UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL WHERE email IN ('isaac@gmail.com', 'isaa@gmail.com')",
            [hash]
        );
        console.log("UPDATED ROWS:", res.rowCount);
    } catch (e) {
        console.error("DB ERROR", e);
    } finally {
        await pool.end();
    }
}
fix();
