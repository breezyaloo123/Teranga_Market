# ADR-002 — Partitionnement des commandes par année et indexation


## Contexte
La table des commandes grossit avec l'activité (Market traite plusieurs millions d'événements par jour). Les requêtes courantes filtrent par période (ventes du jour, du mois) ou cherchent les lignes d'un produit. Il faut garder des temps de réponse stables et pouvoir archiver les anciennes données facilement.

## Options
| Option | Points forts | Points faibles |
|---|---|---|
| Une seule table | Simple | Les requêtes par date lisent toute la table ; l'archivage est coûteux |
| **Partition par année (`RANGE` sur `order_date`)** | PostgreSQL ne lit que l'année concernée ; archiver revient à détacher une partition | Clé primaire plus complexe |
| Partition par mois | Plus fin | 36 partitions et plus à gérer pour un volume encore modeste |
| Partition par hachage | Répartition régulière | Aucun élagage sur les dates |

## Décision
- `orders.orders` est partitionnée **par année** (`orders_2023` à `orders_2026`, plus une partition par défaut qui reste vide).
- `orders.order_items` porte aussi `order_date`, pour pouvoir référencer la table partitionnée.
- Index sur `order_items(product_id)` pour retrouver les lignes d'un produit, et sur les commandes par client, par magasin et par statut.

**Mesures `EXPLAIN (ANALYZE, BUFFERS)` sur les données chargées :**

| Test | Plan | Temps |
|---|---|---|
| Lignes d'un produit, sans index | Seq Scan parallèle, environ 13 900 blocs lus | 167,5 ms |
| Lignes d'un produit, avec index | Bitmap Index Scan, environ 90 blocs lus | 2,1 ms |
| Comptage sur toutes les commandes | Parallel Append sur les 4 partitions | environ 230 ms |
| Comptage sur un mois | une seule partition lue (`orders_2025`) | environ 40 ms |

(Les deux dernières valeurs sont à remplacer par les `Execution Time` exacts relevés en bas des plans.)

## Conséquences
- Gain mesuré : environ 80 fois plus rapide avec l'index sur `product_id`, et les requêtes datées ne lisent qu'une partition.
- **Honnêteté sur le volume :** avec environ 332 000 commandes, le gain du partitionnement reste modeste. Il se justifie surtout par la montée en charge visée et par l'archivage.
- La clé primaire devient (`order_id`, `order_date`) : PostgreSQL n'impose donc pas l'unicité de `order_id` seul entre partitions. Elle est garantie par l'application (identifiant généré par le service, idempotence du `POST`).
- Chaque index ralentit un peu les écritures et prend de la place : on n'indexe que ce que les API cherchent.
- Amélioration possible : la requête par mois a utilisé l'index (`status`, `order_date`) ; un index sur `order_date` seul serait plus adapté.
- Plan B : passer au partitionnement mensuel si les années deviennent trop volumineuses.
