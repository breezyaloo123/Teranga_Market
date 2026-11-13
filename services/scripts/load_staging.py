#!/usr/bin/env python3
"""
Étape 2 : charge les CSV bruts du dataset FMCG dans le schéma `staging`.

Principe : tout est chargé en texte, sans nettoyage. Le nettoyage (dates, prix,
rejets) se fait à l'étape 3, de staging vers les vraies tables.

Usage :
  python scripts/load_staging.py --check          # vérifie les fichiers, sans base de données
  python scripts/load_staging.py                  # charge dans PostgreSQL

Connexion (variables d'environnement, avec ces valeurs par défaut) :
  DB_HOST=localhost  DB_PORT=5432  DB_NAME=ecommerce_db  DB_USER=market_admin
  DB_PASSWORD         (si absent, le script le demande au clavier)
"""
import argparse
import getpass
import os
import sys
from pathlib import Path

# (fichier CSV, table de staging, colonnes attendues dans l'en-tête, dans l'ordre)
SOURCES = [
    ("CUSTOMER.csv", "staging.customer_raw",
     ["customer_id", "signup_date", "city", "state", "segment", "status"]),
    ("STORE.csv", "staging.store_raw",
     ["store_id", "store_city", "store_state", "store_type"]),
    ("CHANNEL.csv", "staging.channel_raw",
     ["channel_id", "channel_name"]),
    ("PROMOTION.csv", "staging.promotion_raw",
     ["promo_id", "promo_type", "start_date", "end_date", "discount_value"]),
    ("ORDER.csv", "staging.orders_raw",
     ["order_id", "customer_id", "order_date", "store_id", "channel_id",
      "payment_type", "year", "week"]),
    ("ORDER_ITEM.csv", "staging.order_item_raw",
     ["order_item_id", "order_id", "product_id", "promo_id", "quantity",
      "item_discount"]),
    ("PRICE_CHANGE.csv", "staging.price_change_raw",
     ["product_id", "year", "week", "unit_price"]),
]


def read_header(path: Path) -> list[str]:
    # utf-8-sig : ignore un éventuel BOM que certains exports ajoutent au début
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return f.readline().strip().split(",")


def count_data_rows(path: Path) -> int:
    """Nombre de lignes de données (hors en-tête). Exact tant qu'aucune cellule ne contient de retour à la ligne."""
    n = 0
    last = b""
    with open(path, "rb") as f:
        while chunk := f.read(1 << 20):
            n += chunk.count(b"\n")
            last = chunk[-1:]
    if last not in (b"\n", b""):
        n += 1  # dernière ligne sans retour à la ligne final
    return max(n - 1, 0)


def check_files(data_dir: Path) -> bool:
    ok = True
    print(f"Dossier des données : {data_dir.resolve()}\n")
    for csv_name, table, expected in SOURCES:
        path = data_dir / csv_name
        if not path.exists():
            print(f"  [MANQUANT] {csv_name}")
            ok = False
            continue
        header = read_header(path)
        if header != expected:
            print(f"  [EN-TETE DIFFERENT] {csv_name}\n      attendu : {expected}\n      trouvé  : {header}")
            ok = False
            continue
        print(f"  [OK] {csv_name:<18} {count_data_rows(path):>10,} lignes -> {table}".replace(",", " "))
    return ok


def load(data_dir: Path) -> None:
    import psycopg  # importé ici pour que --check marche sans la bibliothèque

    password = os.environ.get("DB_PASSWORD") or getpass.getpass("Mot de passe market_admin : ")
    conn = psycopg.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        dbname=os.environ.get("DB_NAME", "ecommerce_db"),
        user=os.environ.get("DB_USER", "market_admin"),
        password=password,
    )
    with conn:
        for csv_name, table, cols in SOURCES:
            path = data_dir / csv_name
            expected_rows = count_data_rows(path)
            with conn.cursor() as cur:
                # On vide d'abord : relancer le script ne crée donc jamais de doublons.
                cur.execute(f"TRUNCATE {table}")
                sql = f"COPY {table} ({', '.join(cols)}) FROM STDIN WITH (FORMAT csv, HEADER true)"
                with cur.copy(sql) as copy, open(path, "rb") as f:
                    while chunk := f.read(1 << 20):
                        copy.write(chunk)
                cur.execute(f"SELECT count(*) FROM {table}")
                loaded = cur.fetchone()[0]
            conn.commit()
            status = "OK" if loaded == expected_rows else "ECART"
            print(f"  [{status}] {table:<28} chargées : {loaded:>10}   dans le fichier : {expected_rows:>10}")
    conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Charge les CSV bruts dans le schéma staging.")
    parser.add_argument("--data-dir", default="data/raw", help="dossier contenant les CSV (défaut : data/raw)")
    parser.add_argument("--check", action="store_true", help="vérifie les fichiers sans toucher à la base")
    args = parser.parse_args()
    data_dir = Path(args.data_dir)

    if not check_files(data_dir):
        print("\nCorrige les points ci-dessus avant de continuer.")
        return 1
    if args.check:
        print("\nTous les fichiers sont conformes. Rien n'a été chargé (mode --check).")
        return 0
    print("\nChargement dans PostgreSQL...")
    load(data_dir)
    print("\nTerminé.")
    return 0


if __name__ == "__main__":
    sys.exit(main())