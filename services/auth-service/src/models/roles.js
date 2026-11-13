const { pool } = require('../config/postgres');

const getAllRoles = async () => {
  const { rows } = await pool.query(
    'SELECT id, name, description FROM auth.roles ORDER BY id'
  );
  return rows;
};

const createRole = async (name, description) => {
  const { rows } = await pool.query(
    'INSERT INTO auth.roles (name, description) VALUES ($1, $2) RETURNING id, name, description',
    [name, description]
  );
  return rows[0];
};


const deleteRole = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM auth.roles WHERE id = $1 RETURNING id, name, description',
    [id]
  );
  return rows[0];
};


module.exports = {
  getAllRoles,
  createRole,
  deleteRole
};