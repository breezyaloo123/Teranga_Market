// Le contrôleur vérifie les paramètres reçus, appelle le modèle, et choisit la réponse HTTP.
const orderModel = require('../models/orderModel');

const STATUSES = ['pending', 'paid', 'preparing', 'payment_failed', 'delivered', 'cancelled'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function badRequest(res, message) {
  return res.status(400).json({ error: 'bad_request', message });
}

// Vérifie le format ET que la date existe (refuse par exemple 2025-02-30).
function isRealDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

async function listOrders(req, res, next) {
  try {
    const { status, customer_id: customerId, from, to } = req.query;
    if (status && !STATUSES.includes(status)) {
      return badRequest(res, `status doit valoir : ${STATUSES.join(', ')}.`);
    }
    if (customerId && !ID_RE.test(customerId)) return badRequest(res, 'customer_id invalide.');
    if (from && !isRealDate(from)) return badRequest(res, 'from doit être une date aaaa-mm-jj.');
    if (to && !isRealDate(to)) return badRequest(res, 'to doit être une date aaaa-mm-jj.');

    const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      return badRequest(res, 'limit doit être un entier entre 1 et 200.');
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return badRequest(res, 'offset doit être un entier positif ou nul.');
    }

    const items = await orderModel.listOrders({ status, customerId, from, to, limit, offset });
    return res.json({ items, limit, offset });
  } catch (err) {
    return next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    if (!ID_RE.test(orderId)) return badRequest(res, 'order_id invalide.');
    const order = await orderModel.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'not_found', message: `Commande ${orderId} introuvable.` });
    }
    return res.json(order);
  } catch (err) {
    return next(err);
  }
}

const { publishOrderEvent } = require('../services/kafkaProducer');

async function createOrder(req, res, next) {
  try {
    const { customer_id, total_cents, store_id, channel_id, payment_type, items } = req.body;
    if (!customer_id || total_cents === undefined) {
      return badRequest(res, 'customer_id et total_cents sont obligatoires.');
    }

    const orderId = req.body.order_id || `ORD-${Date.now()}`;
    const newOrder = await orderModel.createOrder({
      order_id: orderId,
      customer_id,
      store_id: store_id || 'STORE-01',
      channel_id: channel_id || 'WEB',
      payment_type: payment_type || 'credit_card',
      total_cents,
      items: items || [],
    });

    // 🚀 Émission asynchrone de l'événement vers Kafka
    await publishOrderEvent('ORDER_CREATED', newOrder);

    return res.status(201).json({
      message: 'Commande enregistrée et événement Kafka émis',
      order: newOrder,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listOrders, getOrder, createOrder };