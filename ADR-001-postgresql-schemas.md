# ADR-001 — PostgreSQL pour les commandes, le stock et les paiements


## Contexte
Les commandes, le stock et les paiements sont des données transactionnelles : on ne doit jamais vendre un produit déjà épuisé, ni enregistrer une commande à moitié. Le jeu de données du projet compte environ 356 000 commandes et 1 million de lignes de commande, avec des liens forts entre clients, commandes et lignes. La plateforme doit supporter des pics (soldes, Black Friday) et rester découpée en services qui possèdent chacun leurs données.

## Options
| Option | Points forts | Points faibles |
|---|---|---|
| **PostgreSQL** | Transactions ACID, clés étrangères, contraintes `CHECK`, partitionnement, SQL | Montée en charge verticale d'abord |
| MongoDB | Schéma souple, écriture facile | Opérations sur plusieurs documents plus lourdes, pas de clés étrangères |
| Cassandra | Très bonne montée en charge en écriture | Cohérence éventuelle : une donnée peut être lue avec retard, ce qui est risqué pour le stock |

## Décision
PostgreSQL pour les commandes, le stock, les paiements et l'authentification. En termes de CAP, on privilégie la **cohérence** : en cas de panne, il vaut mieux refuser une commande que vendre un produit épuisé.

Un seul serveur, mais **un schéma et un rôle SQL par service** (`orders`, `inventory`, `payments`, `auth` ; rôles `svc_orders`, `svc_inventory`, `svc_payments`, `svc_auth`). Chaque rôle n'a accès qu'à son schéma : un service ne peut pas lire les tables d'un autre. Cette isolation a été vérifiée (une lecture de `payments` avec le rôle `svc_orders` est refusée).

Le catalogue produit vit dans MongoDB. Le lien se fait par `product_id`, **sans clé étrangère** : c'est le code qui vérifie qu'un produit existe.

## Conséquences
- Les données restent toujours exactes, au prix d'une disponibilité moindre en cas de panne du serveur.
- Pas de jointure entre services : pour afficher le nom d'un produit dans une commande, il faut appeler l'API du catalogue.
- Pour grandir : d'abord un serveur plus puissant, puis des copies en lecture seule pour les consultations.
- Risque : un `product_id` inexistant peut entrer si le code ne le vérifie pas. À couvrir par des tests.
- Plan B : si les écritures deviennent un goulot, déplacer les données d'historique vers le Data Lake et garder PostgreSQL pour les données récentes.
