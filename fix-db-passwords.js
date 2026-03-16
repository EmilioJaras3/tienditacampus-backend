const argon2 = require('@node-rs/argon2');
const { Pool } = require('pg');

async function fixPasswords() {
    const password = 'IsaacMD78';
    const hash = await argon2.hash(password, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4
    });

    console.log("GENERATED HASH:", hash);
    const isValid = await argon2.verify(hash, password);
    console.log("IS VALID IMMEDIATELY:", isValid);

    if (!isValid) return;

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

        const check = await pool.query("SELECT email, password_hash FROM users WHERE email = 'isaac@gmail.com'");
        if (check.rows.length > 0) {
            console.log("SAVED IN DB:", check.rows[0].password_hash);
            console.log("VERIFY SAVED HASH:", await argon2.verify(check.rows[0].password_hash, password));
        }
    } catch (e) {
        console.error("DB ERROR", e);
    } finally {
        await pool.end();
    }
}
fixPasswords();
