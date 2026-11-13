// Connexion à PostgreSQL avec le compte du service (svc_orders), jamais postgres/market_admin.
const { Pool, types } = require('pg');

// Par défaut, pg renvoie les DATE en objet Date JavaScript (décalage possible d'un jour
// à cause du fuseau horaire) et les bigint en texte. On veut des valeurs fidèles au contrat :
// - DATE (oid 1082) -> texte "aaaa-mm-jj"
// - bigint (oid 20) -> nombre (nos montants en centimes restent très inférieurs à 2^53)
types.setTypeParser(1082, (value) => value);
types.setTypeParser(20, (value) => parseInt(value, 10));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'ecommerce_db',
  user: process.env.DB_USER || 'svc_orders',
  password: process.env.DB_PASSWORD,
  max: 10,
});

module.exports = pool;