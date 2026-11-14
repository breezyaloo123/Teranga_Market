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

async function createOrder({
  order_id,
  customer_id,
  order_date,
  store_id,
  channel_id,
  payment_type = 'credit_card',
  status = 'preparing',
  total_cents,
  discount_cents = 0,
  items = [],
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderDate = order_date || new Date().toISOString().slice(0, 10);
    const dateObj = new Date(orderDate);
    const year = dateObj.getFullYear();
    const week = 1;

    // 1. Insérer la commande dans la partition
    const orderSql = `
      INSERT INTO orders.orders (
        order_id, customer_id, order_date, store_id, channel_id,
        payment_type, status, total_cents, discount_cents, year, week
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const { rows: orderRows } = await client.query(orderSql, [
      order_id, customer_id, orderDate, store_id, channel_id,
      payment_type, status, total_cents, discount_cents, year, week
    ]);

    // 2. Insérer les lignes si spécifiées
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemSql = `
        INSERT INTO orders.order_items (
          order_item_id, order_id, order_date, product_id, promo_id,
          quantity, unit_price_cents, item_discount_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(itemSql, [
        item.order_item_id || `${order_id}-${i + 1}`,
        order_id,
        orderDate,
        String(item.product_id),
        item.promo_id || null,
        item.quantity || 1,
        item.unit_price_cents || 0,
        item.item_discount_cents || 0,
      ]);
    }

    await client.query('COMMIT');
    return { ...orderRows[0], items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { listOrders, getOrderById, createOrder };