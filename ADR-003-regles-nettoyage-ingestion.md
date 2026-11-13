# ADR-003 — Règles de nettoyage à l'ingestion du dataset FMCG


## Contexte
Les CSV du dataset ont des défauts qui empêchent un chargement direct dans les tables : le fichier des lignes de commande (`ORDER_ITEM.csv`) s'arrête à 1 048 575 lignes, la limite d'Excel, donc il est tronqué ; les lignes n'ont pas de prix ; la date des commandes est au format `jj-mm-aaaa`, les autres fichiers en `aaaa-mm-jj` ; certaines remises dépassent le montant de leur ligne. L'énoncé impose qu'une commande s'enregistre en entier ou pas du tout, et que les lignes en erreur soient mises de côté.

## Options
| Option | Points forts | Points faibles |
|---|---|---|
| Charger tel quel | Rapide | Données fausses ; contraintes violées |
| Corriger les valeurs en silence | Aucune perte de lignes | Chiffres inventés, non traçables |
| **Valider, rejeter et tracer** | Données fiables, rejets documentés | Une partie des commandes n'est pas chargée |

## Décision
1. **Zone de dépôt brute** : les CSV sont d'abord chargés en texte dans le schéma `staging`, sans nettoyage. Les vraies tables sont remplies depuis cette zone.
2. **Prix d'une ligne** : dernier prix de `PRICE_CHANGE` valable à la semaine de la commande. Si le produit n'a aucun prix enregistré à cette date (26 988 lignes, soit 2,6 %), on utilise son **premier prix connu**, en supposant qu'il n'a pas changé avant. Ces lignes sont marquées dans `staging.items_priced.price_backfilled`.
3. **Montants** en centimes (roupies × 100). `item_discount` est traité comme un montant, pas un pourcentage.
4. **Rejet d'une commande entière** si elle n'a aucune ligne (22 671 commandes, effet du fichier tronqué) ou si l'une de ses lignes est invalide, par exemple une remise supérieure au montant de la ligne (1 547 commandes). Les 24 218 commandes rejetées sont conservées dans `orders.rejected_records` avec la raison.
5. **Statut** : le dataset n'en fournit pas ; les commandes chargées reçoivent provisoirement `delivered`.

## Conséquences
- 332 024 commandes et 1 042 668 lignes chargées ; rejets et totaux vérifiés (somme des lignes égale à la somme des commandes).
- 6,8 % des commandes sont absentes de la base. Si le fichier complet est retrouvé, relancer l'ingestion les récupérera.
- L'hypothèse sur les prix complétés est une approximation; l'alternative était de rejeter ces lignes.
- Le statut provisoire sera remplacé quand les statuts seront générés pour l'écran Commandes.
- Toutes les étapes sont rejouables : on peut recommencer depuis `staging` sans recharger les CSV.
