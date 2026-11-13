const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const cors = require('cors');

// 1. Imports Apollo Server
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@as-integrations/express4');
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer');

// 2. Import de vos schémas et résolveurs GraphQL
const typeDefs = require('./graphql/graphql');
const resolvers = require('./graphql/resolver');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const stockRoutes = require('./routes/stockRoutes');
const warehouseRoutes = require('./routes/warehouseRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

const connectDB = require('./config/db');
const { connectPostgres } = require('./config/postgres');

const app = express();
const PORT = process.env.PORT || 5002;

// Création du serveur HTTP requis par Apollo Server pour un arrêt propre (graceful shutdown)
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

// Routes REST existantes
app.use('/api', catalogRoutes);       // Catalogue MongoDB
app.use('/api', stockRoutes);         // Stock PostgreSQL
app.use('/api', warehouseRoutes);     // Entrepôts PostgreSQL

// Fonction de démarrage du serveur
const startServer = async () => {
  try {
    // Connexions aux bases de données
    await connectDB();
    await connectPostgres();

    // 3. Initialisation et démarrage d'Apollo Server
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    });

    await server.start();

    // 4. Intégration du middleware GraphQL sur la route /graphql
    app.use(
      '/graphql',
      cors(),
      express.json(),
      expressMiddleware(server)
    );

    // 5. Utiliser httpServer.listen au lieu de app.listen
    httpServer.listen(PORT, () => {
      console.log(`Product Service démarré sur : http://localhost:${PORT}`);
      console.log(`GraphQL Sandbox disponible sur : http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
    process.exit(1);
  }
};

startServer();