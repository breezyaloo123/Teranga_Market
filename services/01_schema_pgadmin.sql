-- =====================================================================
-- Projet Market : socle PostgreSQL (volet 1)
-- Un serveur, 4 schémas (un par service), un rôle SQL par service.
-- Lancement (les mots de passe viennent de .env, jamais du dépôt) :
--   psql -v orders_pwd="$ORDERS_DB_PWD" -v inventory_pwd="$INVENTORY_DB_PWD" \
--        -v payments_pwd="$PAYMENTS_DB_PWD" -v auth_pwd="$AUTH_DB_PWD" -f 01_schema.sql
-- Montants en centimes (paise, la devise du dataset est la roupie INR).
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------- Schémas et rôles : un service ne lit jamais les tables d'un autre
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE ROLE svc_orders    LOGIN PASSWORD 'CHANGE_ME_orders';
CREATE ROLE svc_inventory LOGIN PASSWORD 'CHANGE_ME_inventory';
CREATE ROLE svc_payments  LOGIN PASSWORD 'CHANGE_ME_payments';
CREATE ROLE svc_auth      LOGIN PASSWORD 'CHANGE_ME_auth';

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA orders    TO svc_orders;
GRANT USAGE ON SCHEMA inventory TO svc_inventory;
GRANT USAGE ON SCHEMA payments  TO svc_payments;
GRANT USAGE ON SCHEMA auth      TO svc_auth;

-- =====================================================================
-- SCHÉMA orders (service Commandes)
-- =====================================================================
SET search_path = orders;

CREATE TABLE channels (
  channel_id   text PRIMARY KEY,
  channel_name text NOT NULL UNIQUE
);

CREATE TABLE stores (
  store_id    text PRIMARY KEY,
  store_city  text NOT NULL,
  store_state text NOT NULL,
  store_type  text NOT NULL
);

CREATE TABLE customers (
  customer_id text PRIMARY KEY,
  signup_date date NOT NULL,
  city        text NOT NULL,
  state       text NOT NULL,
  segment     text NOT NULL,
  status      text NOT NULL CHECK (status IN ('active','churned'))
);

CREATE TABLE promotions (
  promo_id       text PRIMARY KEY,
  promo_type     text NOT NULL CHECK (promo_type IN ('PCT_OFF','FLAT_OFF','BOGO')),
  start_date     date NOT NULL,
  end_date       date NOT NULL,
  discount_value numeric(10,2) NOT NULL CHECK (discount_value >= 0),
  CHECK (end_date >= start_date)
);

-- Commandes partitionnées par date (la clé de partition doit faire partie de la PK).
CREATE TABLE orders (
  order_id       text NOT NULL,
  customer_id    text NOT NULL REFERENCES customers(customer_id),
  order_date     date NOT NULL,
  store_id       text NOT NULL REFERENCES stores(store_id),
  channel_id     text NOT NULL REFERENCES channels(channel_id),
  payment_type   text NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','preparing','payment_failed','delivered','cancelled')),
  total_cents    bigint NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, order_date)
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2023 PARTITION OF orders FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE orders_2024 PARTITION OF orders FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE orders_2025 PARTITION OF orders FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE orders_2026 PARTITION OF orders FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE orders_default PARTITION OF orders DEFAULT;

CREATE INDEX idx_orders_customer_date ON orders (customer_id, order_date);
CREATE INDEX idx_orders_store_date    ON orders (store_id, order_date);
CREATE INDEX idx_orders_status        ON orders (status, order_date);

-- product_id n'a PAS de clé étrangère : le produit vit dans MongoDB (le code vérifie le lien).
-- order_date est dupliquée ici pour pouvoir référencer la table partitionnée.
CREATE TABLE order_items (
  order_item_id      text NOT NULL,
  order_id           text NOT NULL,
  order_date         date NOT NULL,
  product_id         text NOT NULL,
  promo_id           text REFERENCES promotions(promo_id),
  quantity           integer NOT NULL CHECK (quantity > 0),
  unit_price_cents   bigint  NOT NULL CHECK (unit_price_cents >= 0),
  item_discount_cents bigint NOT NULL DEFAULT 0 CHECK (item_discount_cents >= 0),
  line_total_cents   bigint GENERATED ALWAYS AS
                     (quantity * unit_price_cents - item_discount_cents) STORED,
  PRIMARY KEY (order_item_id, order_date),
  FOREIGN KEY (order_id, order_date) REFERENCES orders (order_id, order_date) ON DELETE CASCADE,
  CHECK (quantity * unit_price_cents - item_discount_cents >= 0)
);
CREATE INDEX idx_items_order   ON order_items (order_id, order_date);
CREATE INDEX idx_items_product ON order_items (product_id);

-- Lignes rejetées par les contrôles qualité (mises de côté, pas perdues)
CREATE TABLE rejected_records (
  id          bigserial PRIMARY KEY,
  source_file text NOT NULL,
  reason      text NOT NULL,
  raw         jsonb NOT NULL,
  rejected_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotence du POST /v1/orders : même clé = même réponse, une seule réservation
CREATE TABLE idempotency_keys (
  idem_key      text PRIMARY KEY,
  request_hash  text NOT NULL,
  response_body jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orders TO svc_orders;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA orders TO svc_orders;

-- =====================================================================
-- SCHÉMA inventory (service Stock) : absent du dataset, généré par script
-- =====================================================================
SET search_path = inventory;

CREATE TABLE warehouses (
  warehouse_id   text PRIMARY KEY,
  name           text NOT NULL,
  city           text NOT NULL,
  state          text NOT NULL,
  capacity_units integer NOT NULL CHECK (capacity_units > 0)
);

CREATE TABLE stock (
  product_id        text NOT NULL,      -- lien logique vers le catalogue MongoDB
  warehouse_id      text NOT NULL REFERENCES warehouses(warehouse_id),
  quantity_on_hand  integer NOT NULL CHECK (quantity_on_hand >= 0),
  quantity_reserved integer NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, warehouse_id),
  CHECK (quantity_reserved <= quantity_on_hand)
);

-- UNIQUE (order_id, product_id, warehouse_id) : une demande rejouée ne réserve qu'une fois.
-- Le statut 'released' permet de rendre le stock (Saga).
CREATE TABLE stock_reservations (
  reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       text NOT NULL,
  product_id     text NOT NULL,
  warehouse_id   text NOT NULL,
  quantity       integer NOT NULL CHECK (quantity > 0),
  status         text NOT NULL DEFAULT 'reserved'
                 CHECK (status IN ('reserved','confirmed','released')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (product_id, warehouse_id) REFERENCES stock (product_id, warehouse_id),
  UNIQUE (order_id, product_id, warehouse_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA inventory TO svc_inventory;

-- =====================================================================
-- SCHÉMA payments (service Paiement)
-- =====================================================================
SET search_path = payments;

CREATE TABLE payments (
  payment_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       text NOT NULL UNIQUE,   -- un seul paiement par commande = idempotence
  amount_cents   bigint NOT NULL CHECK (amount_cents > 0),
  method         text NOT NULL,
  status         text NOT NULL CHECK (status IN ('authorized','captured','failed','refunded')),
  failure_reason text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'failed' OR failure_reason IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA payments TO svc_payments;

-- =====================================================================
-- SCHÉMA auth (authentification + RBAC applicatif)
-- =====================================================================
SET search_path = auth;

CREATE TABLE users (
  user_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,           -- bcrypt ou argon2, jamais en clair
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roles (
  role_name text PRIMARY KEY
);
INSERT INTO roles VALUES ('admin'),('catalog_manager'),('analyst'),('logistics'),('service_account');

CREATE TABLE user_roles (
  user_id   uuid NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_name text NOT NULL REFERENCES roles(role_name),
  PRIMARY KEY (user_id, role_name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO svc_auth;

RESET search_path;
