const {
  getAllWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse: saveWarehouse,
  deleteWarehouse,
} = require('../models/warehouse');

const listWarehouses = async (_req, res) => {
  try {
    const warehouses = await getAllWarehouses();
    return res.json(warehouses);
  } catch (error) {
    console.error('Erreur lors de la récupération des warehouses :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération des warehouses' });
  }
};

const readWarehouse = async (req, res) => {
  try {
    const warehouse = await getWarehouse(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse non trouvé' });
    }
    return res.json(warehouse);
  } catch (error) {
    console.error('Erreur lors de la récupération du warehouse :', error);
    return res.status(500).json({ message: 'Erreur lors de la récupération du warehouse' });
  }
};

const addWarehouse = async (req, res) => {
  try {
    const warehouse = await createWarehouse(req.body);
    return res.status(201).json(warehouse);
  } catch (error) {
    console.error('Erreur lors de la création du warehouse :', error);
    return res.status(500).json({ message: 'Erreur lors de la création du warehouse' });
  }
};

const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await saveWarehouse(req.params.id, req.body);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse non trouvé' });
    }
    return res.json(warehouse);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du warehouse :', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour du warehouse' });
  }
};

const removeWarehouse = async (req, res) => {
  try {
    const warehouse = await deleteWarehouse(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse non trouvé' });
    }
    return res.json({ message: 'Warehouse supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du warehouse :', error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du warehouse' });
  }
};

module.exports = {
  listWarehouses,
  readWarehouse,
  addWarehouse,
  updateWarehouse,
  deleteWarehouse: removeWarehouse,
};
