const typeDefs = `#graphql
  type Attributes {
    couleur: String
    vitesse: Int
    electrique: Boolean
  }

  type Product {
    id: ID!               
    product_id: Int!
    name: String!
    category: String!
    price_cents: Int!
    price_euros: Float!
    status: String!
    attributes: Attributes
    updatedAt: String
  }

  input AttributesInput {
    couleur: String
    vitesse: Int
    electrique: Boolean
  }

  input ProductInput {
    product_id: Int!
    name: String!
    category: String!
    price_cents: Int!
    status: String
    attributes: AttributesInput
  }

  type Query {
    # Liste des produits avec filtres optionnels par catégorie ou statut
    products(category: String, status: String): [Product]!
    
    # Recherche par product_id métier (ex: 1001)
    productByCustomId(product_id: Int!): Product
    
    # Recherche par _id MongoDB
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(product_id: Int!, input: ProductInput!): Product
    deleteProduct(product_id: Int!): Boolean!
  }
`;

module.exports = typeDefs;