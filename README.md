# Architecture Microservices E-Commerce

Ce projet implémente l'architecture microservices modulaire pour une application e-commerce.

---

## 📐 Vue d'ensemble de l'Architecture

```
                +---------------------------------+
                |         Client Frontend         |
                |         (React 18 + Vite)       |
                |      http://localhost:5173      |
                +---------------------------------+
                                 |
                                 | Requêtes HTTP /api/*
                                 v
                +---------------------------------+
                |           API Gateway           |
                |        (Express + Proxy)        |
                |      http://localhost:5000      |
                +---------------------------------+
                 /               |               \
                /                |                \
               v                 v                 v
+-----------------------+ +--------------------+ +--------------------+
|     Auth Service      | |  Product Service   | |   Order Service    |
|  (JWT & Utilisateurs) | |(Catalogue & Stocks)| |(Paniers & Commande)|
| http://localhost:5001 | |http://localhost:5002| |http://localhost:5003|
+-----------------------+ +--------------------+ +--------------------+
                                                           |
                                                           | Appel HTTP inter-services
                                                           v
                                                 +--------------------+
                                                 |  Payment Service   |
                                                 | (Stripe / Factures)|
                                                 |http://localhost:5004|
                                                 +--------------------+
```

---

## 📁 Structure des Dossiers

```
Projet E-commerce/
├── client/                     # Frontend (React 18 + Vite, Port 5173)
│   ├── src/
│   │   ├── assets/             # Images, logos, styles statiques
│   │   ├── components/         # Composants UI réutilisables
│   │   ├── context/            # Contextes React (Auth, Panier)
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Vues (Accueil, Produits, Panier, Connexion)
│   │   ├── services/           # Clients API (Axios)
│   │   ├── utils/              # Fonctions utilitaires
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── services/
│   ├── api-gateway/            # Passerelle API & Reverse Proxy (Port 5000)
│   │   ├── src/
│   │   │   ├── config/         # Configuration des proxies & routes
│   │   │   ├── middleware/     # Auth check, logs, rate limiting
│   │   │   ├── routes/         # Routage vers microservices
│   │   │   └── index.js
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── auth-service/           # Service Utilisateurs & JWT (Port 5001)
│   │   ├── src/
│   │   │   ├── config/         # Connexion DB
│   │   │   ├── controllers/    # Inscription, Connexion, Profil
│   │   │   ├── middleware/     # Validation JWT
│   │   │   ├── models/         # Modèle Utilisateur
│   │   │   ├── routes/         # Routes /auth/*
│   │   │   ├── utils/          # Hash password, tokens
│   │   │   └── index.js
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── product-service/        # Service Catalogue & Stocks (Port 5002)
│   │   ├── src/
│   │   │   ├── config/         # Connexion DB
│   │   │   ├── controllers/    # CRUD Produits, Gestion Stock
│   │   │   ├── middleware/     # Validation, upload d'images
│   │   │   ├── models/         # Modèle Produit, Catégorie
│   │   │   ├── routes/         # Routes /products/*
│   │   │   └── index.js
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── order-service/          # Service Paniers & Commandes (Port 5003)
│   │   ├── src/
│   │   │   ├── config/         # Connexion DB
│   │   │   ├── controllers/    # Gestion Panier & Commande
│   │   │   ├── middleware/     # Vérification droits
│   │   │   ├── models/         # Modèle Commande, Panier
│   │   │   ├── routes/         # Routes /orders/*
│   │   │   ├── services/       # Communication HTTP vers Payment Service
│   │   │   └── index.js
│   │   ├── .env.example
│   │   └── package.json
│   │
│   └── payment-service/        # Service Paiement & Facturation (Port 5004)
│       ├── src/
│       │   ├── config/         # Configuration Stripe
│       │   ├── controllers/    # Checkout Stripe, Webhooks, Factures
│       │   ├── middleware/     # Validation signature webhook
│       │   ├── models/         # Modèle Transaction, Facture
│       │   ├── routes/         # Routes /payments/*
│       │   └── index.js
│       ├── .env.example
│       └── package.json
│
├── docker-compose.yml          # Lancement de PostgreSQL & MongoDB
├── package.json                # Scripts d'orchestration globaux
└── .gitignore
```

---

## 📦 Packages installés par service

| Service | Port | Packages Clés |
|---|---|---|
| **Client Frontend** | `5173` | `react` (v18), `react-dom`, `react-router-dom`, `axios`, `lucide-react`, `vite` |
| **API Gateway** | `5000` | `express`, `http-proxy-middleware`, `cors`, `helmet`, `morgan`, `dotenv`, `nodemon` |
| **Auth Service** | `5001` | `express`, `jsonwebtoken`, `bcryptjs`, `pg` (PostgreSQL), `cors`, `dotenv`, `morgan`, `nodemon` |
| **Product Service** | `5002` | `express`, `mongoose` (MongoDB - collection `catalog`), `pg` (PostgreSQL), `cors`, `dotenv`, `morgan`, `nodemon` |
| **Order Service** | `5003` | `express`, `axios` (appels inter-services), `pg` (PostgreSQL), `cors`, `dotenv`, `morgan`, `nodemon` |
| **Payment Service** | `5004` | `express`, `stripe`, `pg` (PostgreSQL), `cors`, `dotenv`, `morgan`, `nodemon` |

---

## 🚀 Commandes Utiles

### 1. Installer toutes les dépendances de tous les services :
```bash
npm run install:all
```

### 2. Lancer la base de données avec Docker :
```bash
docker-compose up -d
```

Avant le premier lancement, créez le fichier de configuration du service produit :
```powershell
Copy-Item services\product-service\.env.example services\product-service\.env
```

### 3. Lancer tous les services simultanément :
```bash
npm run dev
```
*(Nécessite d'installer `concurrently` au préalable dans le dossier racine avec `npm install`)*
