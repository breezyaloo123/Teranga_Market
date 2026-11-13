const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const stockRoutes = require('./routes/stockRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

const connectDB = require('./config/db');
const { connectPostgres } = require('./config/postgres');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Routes pour le catalogue MongoDB
app.use('/api', catalogRoutes);

// Routes pour le stock PostgreSQL
app.use('/api', stockRoutes);

// Routes pour les entrepôts PostgreSQL
app.use('/api', warehouseRoutes);



// Démarrer le serveur après connexion à MongoDB
const startServer = async () => {
  try {
    await connectDB();
    await connectPostgres();
    app.listen(PORT, () => {
      console.log(`Product Service démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exit(1);
  }
};

startServer();
