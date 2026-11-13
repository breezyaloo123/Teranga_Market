const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant dans la configuration du service auth.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectPostgres = async () => {
  await pool.query('SELECT 1');
  console.log('PostgreSQL connecté avec succès.');
};

module.exports = { connectPostgres, pool };
