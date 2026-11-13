// Le modèle ne contient que le SQL. Toutes les valeurs passent par des paramètres ($1, $2...)
// et jamais collées dans le texte de la requête : c'est ce qui bloque l'injection SQL.
const pool = require('../config/db');

const ORDER_COLUMNS = `order_id, customer_id, order_date, store_id, channel_id, payment_type,
                       status, total_cents, discount_cents, created_at`;

async function listOrders({ status, customerId, from, to, limit, offset }) {
  const conditions = [];
  const params = [];
  // On n'ajoute une condition que si le filtre est présent : un filtre de date simple
  // permet à PostgreSQL de ne lire que les bonnes partitions (années).
  if (status)     { params.push(status);     conditions.push(`status = $${params.length}`); }
  if (customerId) { params.push(customerId); conditions.push(`customer_id = $${params.length}`); }
  if (from)       { params.push(from);       conditions.push(`order_date >= $${params.length}`); }
  if (to)         { params.push(to);         conditions.push(`order_date <= $${params.length}`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);
  const sql = `SELECT ${ORDER_COLUMNS} FROM orders.orders ${where}
               ORDER BY order_date DESC, created_at DESC, order_id DESC
               LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function getOrderById(orderId) {
  const orderResult = await pool.query(
    `SELECT ${ORDER_COLUMNS} FROM orders.orders WHERE order_id = $1`, [orderId]);
  if (orderResult.rows.length === 0) return null;
  const order = orderResult.rows[0];
  // On filtre aussi sur order_date : l'index de order_items porte sur (order_id, order_date).
  const itemsResult = await pool.query(
    `SELECT order_item_id, product_id, promo_id, quantity, unit_price_cents,
            item_discount_cents, line_total_cents
     FROM orders.order_items WHERE order_id = $1 AND order_date = $2
     ORDER BY order_item_id`, [orderId, order.order_date]);
  return { ...order, items: itemsResult.rows };
}

module.exports = { listOrders, getOrderById };