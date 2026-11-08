const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const Catalog = require('./models/Catalog');

// Charger les variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

app.use(express.json());

// Route pour lister tous les produits du catalogue
app.get('/api/products', async (req, res) => {
  try {
    const products = await Catalog.find();
    res.json(products);
    console.log('Produits récupérés avec succès :', products.length);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits :', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des données',
      details: error.message 
    });
  }
});

// Route pour récupérer un produit par product_id
app.get('/api/products/:productId', async (req, res) => {
  try {
    const product = await Catalog.findOne({ product_id: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit :', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du produit',
      details: error.message 
    });
  }
});

//Create a new product
app.post('/api/createproducts', async (req, res) => {
  try {
    const newProduct = new Catalog(req.body);
    const savedProduct = await newProduct.save();
    res.status(201).json(savedProduct);
    console.log('Produit créé avec succès :', savedProduct);
  } catch (error) {
    console.error('Erreur lors de la création du produit :', error);
    res.status(500).json({
      error: 'Erreur lors de la création du produit',
      details: error.message 
    });
  }
});

// Route pour mettre à jour un produit par product_id
app.put('/api/products/:productId', async (req, res) => {
  try {
    const updatedProduct = await Catalog.findOneAndUpdate(
      { product_id: req.params.productId },
      req.body,
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(updatedProduct);
    console.log('Produit mis à jour avec succès :', updatedProduct);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit :', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du produit',
      details: error.message 
    });
  }
});

// Route pour supprimer un produit par product_id
app.delete('/api/products/:productId', async (req, res) => {
  try {
    const deletedProduct = await Catalog.findOneAndDelete({ product_id: req.params.productId });
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json({ message: 'Produit supprimé avec succès' });
    console.log('Produit supprimé avec succès :', deletedProduct);
  } catch (error) {
    console.error('Erreur lors de la suppression du produit :', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du produit',
      details: error.message 
    });
  }
});

// Démarrer le serveur après connexion à MongoDB
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Product Service démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Impossible de démarrer le serveur :', error.message);
  }
};

startServer();
