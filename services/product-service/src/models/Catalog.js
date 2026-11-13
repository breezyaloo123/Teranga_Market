// const mongoose = require('mongoose');

// const catalogSchema = new mongoose.Schema(
//   {
//     product_id: {
//       type: Number,
//       required: true,
//       index: true,
//     },
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     category: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     price_cents: {
//       type: Number,
//       required: true,
//     },
//     status: {
//       type: String,
//       enum: ['active', 'inactive'],
//       default: 'active',
//     },
//     attributes: {
//       type: mongoose.Schema.Types.Mixed,
//       default: {},
//     },
//   },
//   {
//     timestamps: true,
//     collection: 'catalog',
//   }
// );

// module.exports = mongoose.model('Catalog', catalogSchema);


const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    product_id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price_cents: { type: Number, required: true },
    status: { type: String, default: 'active' },
    attributes: {
      couleur: String,
      vitesse: Number,
      electrique: Boolean,
    },
  },
  {
    timestamps: true, // Gère automatiquement createdAt et updatedAt
    collection: 'catalog', // Nom de la collection dans MongoDB
  }
);

module.exports = mongoose.model('Product', productSchema);