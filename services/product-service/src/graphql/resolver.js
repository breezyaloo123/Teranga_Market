const Product = require('../models/catalog');

const resolvers = {
  Query: {
    // Récupérer les produits (avec filtres optionnels)
    products: async (_, { category, status }) => {
      const filter = {};
      if (category) filter.category = category;
      if (status) filter.status = status;
      return await Product.find(filter);
    },

    // Récupérer par product_id (1001)
    productByCustomId: async (_, { product_id }) => {
      return await Product.findOne({ product_id });
    },

    // Récupérer par _id ObjectId
    product: async (_, { id }) => {
      return await Product.findById(id);
    },
  },

  Product: {
    // Champ virtuel pratique pour convertir automatiquement les centimes en euros
    price_euros: (parent) => {
      return parent.price_cents ? parent.price_cents / 100 : 0;
    },
  },

  Mutation: {
    createProduct: async (_, { input }) => {
      const product = new Product(input);
      return await product.save();
    },

    updateProduct: async (_, { product_id, input }) => {
      return await Product.findOneAndUpdate(
        { product_id },
        input,
        { new: true }
      );
    },

    deleteProduct: async (_, { product_id }) => {
      const res = await Product.findOneAndDelete({ product_id });
      return !!res;
    },
  },
};

module.exports = resolvers;