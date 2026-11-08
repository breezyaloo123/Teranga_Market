const {
  getAllStocks,
  getStock,
  createStock,
  updateStock: saveStock,
  deleteStock: removeStock,
} = require('../models/stock');

const listStocks = async (_req, res) => {
  try {
    const stocks = await getAllStocks();
    return res.json(stocks);
  } catch (error) {
    console.error('Erreur lors de la récupération des stocks :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des stocks' });
  }
};

const readStock = async (req, res) => {
  try {
    const stock = await getStock(req.params.productId, req.params.warehouseId);
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    return res.json(stock);
  } catch (error) {
    console.error('Erreur lors de la récupération du stock :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du stock' });
  }
};

const addStock = async (req, res) => {
  try {
    const stock = await createStock(req.body);
    return res.status(201).json(stock);
  } catch (error) {
    console.error('Erreur lors de la création du stock :', error);
    return res.status(500).json({ message: 'Erreur lors de la création du stock' });
  }
};

const updateStock = async (req, res) => {
  try {
    const stock = await saveStock(
      req.params.productId,
      req.params.warehouseId,
      req.body.quantity
    );
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    return res.json(stock);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du stock :', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du stock' });
  }
};

const deleteStock = async (req, res) => {
  try {
    const stock = await removeStock(req.params.productId, req.params.warehouseId);
    if (!stock) {
      return res.status(404).json({ message: 'Stock non trouvé' });
    }
    return res.json({ message: 'Stock supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du stock :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du stock' });
  }
};

module.exports = {
  listStocks,
  readStock,
  addStock,
  updateStock,
  deleteStock,
};
