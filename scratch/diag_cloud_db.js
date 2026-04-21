const { Client } = require('pg');

async function tryRemote() {
    const client = new Client({
        host: '54.84.80.39',
        port: 5432,
        user: 'tiendita_user',
        password: 'TU_PASSWORD_AQUI',
        database: 'tienditacampus',
        connectionTimeoutMillis: 5000,
    });
    try {
        await client.connect();
        console.log(' EXITO: Conectado a la DB NUBE (54.84.80.39)');
        await client.end();
    } catch (e) {
        console.log(` FALLO CLOUD: ${e.message}`);
    }
}

tryRemote();