const { Client } = require('pg');
require('dotenv').config();

async function checkBenchmarking() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  try {
    await client.connect();
    console.log('--- Diagnóstico de Benchmarking ---');
    
    // Check extension
    const extRes = await client.query("SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'");
    if (extRes.rows.length > 0) {
      console.log('[OK] Extensión pg_stat_statements detectada.');
      
      // Check if view has data
      const dataRes = await client.query("SELECT count(*) FROM pg_stat_statements");
      console.log(`[INFO] Registros en pg_stat_statements: ${dataRes.rows[0].count}`);
    } else {
      console.log('[ERROR] Extensión pg_stat_statements NO encontrada en la BD.');
      console.log('Tip: Ejecuta "CREATE EXTENSION pg_stat_statements;" con un superusuario.');
    }

    await client.end();
  } catch (err) {
    console.error('[ERROR] No se pudo conectar a la base de datos:', err.message);
  }
}

checkBenchmarking();
