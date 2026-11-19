# Architecture

```
src/
  index.js              démarrage : config → pièces → polling ou webhook ; arrêt propre ; --check
  config.js             variables d'environnement validées (erreurs groupées, claires)
  logger.js             journal JSON / lisible ; ne journalisez jamais de secret ni de message privé
  i18n.js               textes FR/EN ; t(lang, clé, paramètres)
  dedupe.js             dédoublonnage des événements (msgId) avec délai d'oubli
  outbox.js             file d'envoi espacée (limite de l'API), erreurs isolées
  webhook.js            serveur HTTP du mode webhook : signature → 200 immédiat → traitement
  store/index.js        préférences utilisateur : MemoryStore | FileStore (interface get/update)
  handlers/index.js     routeur : événement → commande / bouton ; règles de groupe ; gestion d'erreurs
  handlers/commands.js  ★ VOTRE BOT : registre de commandes et de callbacks de boutons
  lib/gpchat-bot.js     SDK officiel GPChat (sans dépendance)
test/                   tests sans réseau (node:test)
scripts/                outils (liste de commandes pour bot.json)
```

## Le chemin d'un message

```
Utilisateur → GPChat ──(polling : getUpdates)──┐
                      └─(webhook : POST signé)─┤
                                               ▼
                         handlers/index.js  handle(update)
                           1. dédoublonnage (msgId)
                           2. groupe ? silence sauf commande / mention
                           3. commande → commands[nom].run(ctx)      bouton → callbacks[préfixe](ctx, valeur)
                           4. erreur ? message poli + journal
                                               ▼
                         outbox.js (espacement, ordre)  →  API GPChat  →  Utilisateur
```

## Choix de conception

- **Une source de vérité pour les commandes** : `commands.js` alimente `/help` *et* la liste à enregistrer dans le profil du bot (`npm run commands`).
- **Logique séparée du réseau** : le routeur reçoit un `outbox` ; les tests le remplacent par un faux bot. Faites de même pour vos intégrations (météo, IA…) : une fonction injectable se teste sans réseau.
- **Webhook : accuser d'abord, traiter ensuite.** GPChat attend une réponse 2xx en moins de 10 s et réessaie sinon (jusqu'à 8 fois) : sans dédoublonnage, un traitement lent provoquerait des doublons.
- **Polling par défaut** : zéro infrastructure publique, et l'appel à `/v1/updates` valide la checklist de publication.
- **Ne jamais faire confiance à une donnée reçue** : les données de boutons sont bornées (`counter`), le texte d'un utilisateur est renvoyé sans Markdown (`/echo`).
- **Store minimal** : `get(id)` / `update(id, patch)`. Passer à Redis ou Postgres = une classe de plus dans `store/`.

## Aller en production

- **Quota** : 60 requêtes/minute par clé par défaut. `outbox` espace les envois ; pour un bot très sollicité, demandez un quota plus élevé à GPChat puis baissez `intervalMs`.
- **Alertes** : renseignez un e-mail ou un webhook d'alerte dans la console (*Paramètres*) pour être prévenu si le webhook tombe.
- **Serverless** (Cloud Functions, Cloud Run, Workers) : utilisez le mode webhook ; réutilisez `createRouter` tel quel en remplaçant `FileStore` par un store distant (le disque d'une fonction est éphémère) et `Outbox` par un envoi direct si l'instance ne vit que le temps d'une requête.
- **Plusieurs instances** : le dédoublonnage en mémoire ne suffit plus ; déplacez `Dedupe` dans Redis (clé `msgId`, expiration 10 min).
- **Sécurité** : secrets en variables d'environnement uniquement ; conteneur en lecture seule (voir `docker-compose.yml`) ; mettez le webhook derrière HTTPS.

## Compatibilité de l'API

L'API GPChat est versionnée par l'adresse (`/v1`). Dans une version majeure, seuls des changements rétrocompatibles sont publiés : ignorez les champs et types d'événements inconnus (le routeur le fait déjà). Une ancienne version reste maintenue au moins 12 mois après l'annonce de la suivante — [politique complète](https://gpchat.app/en/developers/docs#versioning).
