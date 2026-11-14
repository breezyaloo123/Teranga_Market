const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { Kafka, logLevel } = require('kafkajs');

// 1. Configuration du client S3 pour RustFS
const s3 = new S3Client({
  endpoint: process.env.RUSTFS_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.RUSTFS_ACCESS_KEY || 'admin',
    secretAccessKey: process.env.RUSTFS_SECRET_KEY || 'password123',
  },
  forcePathStyle: true, // Obligatoire pour RustFS et MinIO
});

// 2. Configuration du Consumer Kafka
const kafka = new Kafka({
  clientId: 'lakehouse-ingestion-worker',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  logLevel: logLevel.NOTHING,
});

const consumer = kafka.consumer({ groupId: 'lakehouse-landing-group' });

// Fonction pour s'assurer que les buckets existent dans RustFS
async function ensureBucketsExist(bucketNames) {
  for (const bucket of bucketNames) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      try {
        console.log(`Création du bucket '${bucket}' dans RustFS...`);
        await s3.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`Bucket '${bucket}' créé avec succès.`);
      } catch (err) {
        console.warn(`Note sur le bucket '${bucket}' :`, err.message);
      }
    }
  }
}

async function startIngestion() {
  console.log('Démarrage du worker d\'ingestion Kafka ➔ RustFS (Zone Landing)...');

  // 1. S'assurer que les 4 zones du Lakehouse existent dans RustFS
  await ensureBucketsExist(['landing', 'bronze', 'silver', 'gold']);

  // 2. Connexion à Kafka
  await consumer.connect();
  console.log('Connecté à Kafka.');

  // fromBeginning: true permet de récupérer aussi les messages déjà envoyés lors de votre test précédent !
  await consumer.subscribe({ topic: 'market.orders', fromBeginning: true });
  console.log('Écoute active du topic "market.orders"... En attente de commandes...');

  // 3. Traitement de chaque message reçu
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const rawPayload = message.value.toString();
        const eventData = JSON.parse(rawPayload);

        const orderId = eventData.order_id || `order-${Date.now()}`;
        const dateStr = (eventData.timestamp || new Date().toISOString()).slice(0, 10);
        const [year, month, day] = dateStr.split('-');

        // Partitionnement temporel standard du Lakehouse : orders/year=AAAA/month=MM/day=JJ/
        const s3Key = `orders/year=${year}/month=${month}/day=${day}/${orderId}.json`;

        // Écriture de l'objet brut dans le bucket 'landing' de RustFS
        await s3.send(
          new PutObjectCommand({
            Bucket: 'landing',
            Key: s3Key,
            Body: JSON.stringify(eventData, null, 2),
            ContentType: 'application/json',
          })
        );


        console.log(`[Lakehouse Landing] Commande ${orderId} stockée avec succès -> landing/${s3Key}`);
      } catch (err) {
        console.error('Erreur lors du stockage dans RustFS :', err.message);
      }
    },
  });
}

// Arrêt propre
process.on('SIGINT', async () => {
  console.log('\n Arrêt du worker d\'ingestion...');
  await consumer.disconnect();
  process.exit(0);
});

startIngestion().catch((err) => {
  console.error(' Erreur fatale worker :', err.message);
  process.exit(1);
});
