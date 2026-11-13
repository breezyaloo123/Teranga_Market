const Catalog = require('../models/catalog');

const listProducts = async (_req, res) => {
  try {
    const products = await Catalog.find();
    return res.json(products);
  } catch (error) {
    console.error('Erreur lors de la récupération des produits :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des produits' });
  }
};

const readProduct = async (req, res) => {
  try {
    const product = await Catalog.findOne({ product_id: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    return res.json(product);
  } catch (error) {
    console.error('Erreur lors de la récupération du produit :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du produit' });
  }
};

const addProduct = async (req, res) => {
  try {
    const product = await Catalog.create(req.body);
    return res.status(201).json(product);
  } catch (error) {
    console.error('Erreur lors de la création du produit :', error);
    return res.status(500).json({ message: 'Erreur lors de la création du produit' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Catalog.findOneAndUpdate(
      { product_id: req.params.productId },
      req.body,
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    return res.json(product);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit :', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du produit' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Catalog.findOneAndDelete({ product_id: req.params.productId });
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    return res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du produit' });
  }
};

module.exports = {
  listProducts,
  readProduct,
  addProduct,
  updateProduct,
  deleteProduct,
};
