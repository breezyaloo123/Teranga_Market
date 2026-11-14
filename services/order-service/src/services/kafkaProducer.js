const { Kafka, Partitioners, logLevel } = require('kafkajs');

const broker = process.env.KAFKA_BROKER || 'localhost:9092';
const clientId = process.env.KAFKA_CLIENT_ID || 'order-service';

const kafka = new Kafka({
  clientId,
  brokers: [broker],
  logLevel: logLevel.NOTHING, // Masque les logs internes de retry de KafkaJS
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

let isConnected = false;

// Connexion du Producer au démarrage du service
async function connectKafkaProducer() {
  if (isConnected) return;
  try {
    await producer.connect();
    isConnected = true;
    console.log(`[Kafka] Producer connecté au broker ${broker} (topic : market.orders)`);
  } catch (err) {
    console.warn(`[Kafka] Impossible de se connecter au broker ${broker} :`, err.message);
  }
}

// Déconnexion propre
async function disconnectKafkaProducer() {
  if (!isConnected) return;
  try {
    await producer.disconnect();
    isConnected = false;
    console.log('[Kafka] Producer déconnecté proprement.');
  } catch (err) {
    console.error('[Kafka] Erreur déconnexion :', err.message);
  }
}

/**
 * Publie un événement lié aux commandes sur le topic Kafka 'market.orders'
 * @param {string} eventName - Ex: 'ORDER_CREATED', 'ORDER_PAID', 'ORDER_CANCELLED'
 * @param {object} orderData - Détails de la commande
 */
async function publishOrderEvent(eventName, orderData) {
  if (!isConnected) {
    try {
      await connectKafkaProducer();
    } catch {
      console.warn(`[Kafka] Message non envoyé (Kafka non disponible) : ${eventName}`);
      return;
    }
  }

  const payload = {
    event: eventName,
    order_id: String(orderData.order_id),
    customer_id: orderData.customer_id,
    store_id: orderData.store_id || null,
    channel_id: orderData.channel_id || null,
    payment_type: orderData.payment_type || 'credit_card',
    status: orderData.status || 'preparing',
    total_cents: orderData.total_cents,
    discount_cents: orderData.discount_cents || 0,
    items: orderData.items || [],
    timestamp: new Date().toISOString(),
  };

  try {
    await producer.send({
      topic: 'market.orders',
      messages: [
        {
          key: String(orderData.order_id),
          value: JSON.stringify(payload),
        },
      ],
    });

    console.log(`[Kafka] Événement '${eventName}' publié sur 'market.orders' (Commande: ${orderData.order_id})`);
  } catch (err) {
    console.error(`[Kafka] Échec publication événement '${eventName}' :`, err.message);
  }
}

module.exports = {
  connectKafkaProducer,
  disconnectKafkaProducer,
  publishOrderEvent,
};
