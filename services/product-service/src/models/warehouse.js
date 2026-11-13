const { pool } = require('../config/postgres');

const getAllWarehouses = async () => {
  const { rows } = await pool.query(
    'SELECT id, name, capacity_units FROM inventory.warehouses ORDER BY id'
  );
  return rows;
};

const getWarehouse = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, capacity_units FROM inventory.warehouses WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

const createWarehouse = async ({ name, capacity_units }) => {
  const { rows } = await pool.query(
    'INSERT INTO inventory.warehouses (name, capacity_units) VALUES ($1, $2) RETURNING id, name, capacity_units',
    [name, capacity_units]
  );
  return rows[0];
};

const updateWarehouse = async (id, { name, capacity_units }) => {
  const { rows } = await pool.query(
    'UPDATE inventory.warehouses SET name = $2, capacity_units = $3 WHERE id = $1 RETURNING id, name, capacity_units',
    [id, name, capacity_units]
  );
  return rows[0] || null;
};

const deleteWarehouse = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM inventory.warehouses WHERE id = $1 RETURNING id, name, capacity_units',
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  getAllWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};