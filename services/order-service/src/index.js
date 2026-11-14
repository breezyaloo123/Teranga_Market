// Point d'entrée du service Commande & Panier
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const pool = require('./config/db');
const { authenticate } = require('./middleware/auth');
const orderRoutes = require('./routes/orderRoutes');
const { connectKafkaProducer, disconnectKafkaProducer } = require('./services/kafkaProducer');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manque : renseigne-le dans le fichier .env.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Santé du service (sans jeton) : utile pour Docker et pour le tableau de bord d'observabilité.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'order-service' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', service: 'order-service' });
  }
});

// Tout ce qui est sous /v1/orders ou /api/orders exige d'abord un jeton valide, puis les rôles (dans les routes).
app.use(['/v1/orders', '/api/orders'], authenticate, orderRoutes);

app.use((req, res) => res.status(404).json({ error: 'not_found', message: 'Route inconnue.' }));

// Gestion d'erreur centrale : on journalise le détail, mais on ne le montre pas à l'appelant.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ time: new Date().toISOString(), level: 'error', message: err.message }));
  res.status(500).json({ error: 'internal_error', message: 'Erreur interne.' });
});

const port = Number(process.env.PORT || 5003);
app.listen(port, async () => {
  console.log(`order-service à l'écoute sur le port ${port}`);
  await connectKafkaProducer();
});

process.on('SIGINT', async () => {
  await disconnectKafkaProducer();
  process.exit(0);
});