const { Client } = require('pg');
const client = new Client({
  host: '54.84.80.39',
  port: 5432,
  user: 'postgres_master',
  password: 'SuperSecretoDBProd2026',
  database: 'tienditacampus'
});
async function f(){
  await client.connect();
  try {
    await client.query('ALTER TABLE weekly_reports ADD CONSTRAINT "unique_seller_week" UNIQUE (seller_id, week_start);');
    console.log('done');
  } catch(e) {
    console.error('Error or already exists', e);
  }
  process.exit(0);
}
f();