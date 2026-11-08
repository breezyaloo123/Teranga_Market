const { pool } = require('../config/postgres');

const getAllStocks = async () => {
  const { rows } = await pool.query(
    'SELECT product_id, warehouse_id, quantity FROM inventory.stock ORDER BY product_id, warehouse_id'
  );
  return rows;
};

const getStock = async (productId, warehouseId) => {
  const { rows } = await pool.query(
    'SELECT product_id, warehouse_id, quantity FROM inventory.stock WHERE product_id = $1 AND warehouse_id = $2',
    [productId, warehouseId]
  );
  return rows[0] || null;
};

const createStock = async ({ product_id, warehouse_id, quantity }) => {
  const { rows } = await pool.query(
    'INSERT INTO inventory.stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3) RETURNING product_id, warehouse_id, quantity',
    [product_id, warehouse_id, quantity]
  );
  return rows[0];
};

const updateStock = async (productId, warehouseId, quantity) => {
  const { rows } = await pool.query(
    'UPDATE inventory.stock SET quantity = $3 WHERE product_id = $1 AND warehouse_id = $2 RETURNING product_id, warehouse_id, quantity',
    [productId, warehouseId, quantity]
  );
  return rows[0] || null;
};

const deleteStock = async (productId, warehouseId) => {
  const { rows } = await pool.query(
    'DELETE FROM inventory.stock WHERE product_id = $1 AND warehouse_id = $2 RETURNING product_id, warehouse_id, quantity',
    [productId, warehouseId]
  );
  return rows[0] || null;
};

module.exports = {
  getAllStocks,
  getStock,
  createStock,
  updateStock,
  deleteStock,
};
