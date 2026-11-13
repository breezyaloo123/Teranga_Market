// Point d'entrée du service Auth
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const userRoutes = require('./routes/userRoutes');
const rolesRoutes = require('./routes/rolesRoutes');

const { connectPostgres } = require('./config/postgres');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Routes pour les utilisateurs
app.use('/api', userRoutes);

// Routes pour les rôles
app.use('/api', rolesRoutes);

// Démarrer le serveur après connexion à PostgreSQL
const startServer = async () => {
  try {
    await connectPostgres();
    app.listen(PORT, () => {
      console.log(`Auth Service démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exit(1);
  }
};

startServer();
