require('dotenv').config();
const { connectKafkaProducer, disconnectKafkaProducer, publishOrderEvent } = require('../services/kafkaProducer');

async function testProducer() {
  console.log('Test du Producer Kafka pour le service Commande...');

  await connectKafkaProducer();

  const fakeOrder = {
    order_id: `TEST-${Date.now()}`,
    customer_id: 'CUST-001',
    store_id: 'STORE-01',
    channel_id: 'WEB',
    payment_type: 'credit_card',
    status: 'preparing',
    total_cents: 34999, // 349.99 €
    discount_cents: 0,
    items: [
      {
        order_item_id: 'ITEM-1',
        product_id: 1001,
        quantity: 1,
        unit_price_cents: 34999,
        item_discount_cents: 0,
      },
    ],
  };

  await publishOrderEvent('ORDER_CREATED', fakeOrder);

  console.log('Événement envoyé avec succès dans Kafka sur le topic market.orders !');
  await disconnectKafkaProducer();
}

testProducer().catch((err) => {
  console.error('Erreur lors du test Kafka :', err.message);
  process.exit(1);
});
