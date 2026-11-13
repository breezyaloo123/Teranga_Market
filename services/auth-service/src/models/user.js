const { pool } = require('../config/postgres');
const bcrypt = require('bcryptjs');

const getAllUsers = async () => {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, is_active, created_at FROM auth.users ORDER BY id'
  );
  return rows;
};

const createUser = async (email, password, isActive = true) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const { rows } = await pool.query(
    'INSERT INTO auth.users (email, password_hash, is_active, created_at) VALUES ($1, $2, $3, $4) RETURNING id, email, password_hash, is_active, created_at',
    [email, passwordHash, isActive, createdAt]
  );
  return rows[0];
}


const getUserByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT id, email, password_hash, is_active, created_at FROM auth.users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}


const updateUser = async (id, { email, password, is_active }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await pool.query(
    'UPDATE auth.users SET email = $1, password_hash = $2, is_active = $3 WHERE id = $4 RETURNING id, email, password_hash, is_active, created_at',
    [email, passwordHash, is_active, id]
  );
  return rows[0];
};

const deleteUser = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM auth.users WHERE id = $1 RETURNING id, email, password_hash, is_active, created_at',
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  getAllUsers,
  createUser,
  getUserByEmail,
  updateUser,
  deleteUser
}; 