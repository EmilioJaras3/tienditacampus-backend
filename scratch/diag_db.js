const { Client } = require('pg');

async function tryConnect(user, password, database = 'postgres') {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user,
        password,
        database,
    });
    try {
        await client.connect();
        console.log(`✅ EXITO: Conectado con ${user} / ${password || 'SIN PASSWORD'} en ${database}`);
        await client.end();
        return true;
    } catch (e) {
        console.log(`❌ FALLO: ${user} / ${password || 'SIN PASSWORD'} - Error: ${e.code}`);
        return false;
    }
}

async function run() {
    console.log('--- Buscando Credenciales DB Locales ---');
    await tryConnect('postgres', '');
    await tryConnect('postgres', 'postgres');
    await tryConnect('postgres', 'TienditaCampus2026DB!');
    await tryConnect('tc_admin', 'TienditaCampus2026DB!', 'tienditacampus');
    await tryConnect('tienditacampus_user', 'tienditacampus_pass123', 'tienditacampus');
}

run();
